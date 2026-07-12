<?php

namespace Tests\Feature\Sync;

use Tests\TestCase;
use App\Models\{User, Product, Category, Shift};
use App\Enums\{UserRole, ProductStatus, ShiftStatus};
use Illuminate\Support\Str;

class SyncTest extends TestCase
{
    private string $token;
    private string $outletId;
    private User   $cashier;

    protected function setUp(): void
    {
        parent::setUp();
        ['company' => $company, 'admin' => $admin] = $this->createCompanyWithAdmin();
        $outlet = $this->createOutlet($company->id);
        $this->outletId = $outlet->id;
        $this->token = $this->loginAs($admin);

        $this->cashier = User::create([
            'company_id' => $company->id,
            'name'       => 'Kasir Sync',
            'pin_hash'   => bcrypt('123456'),
            'role'       => UserRole::Cashier,
            'is_active'  => true,
        ]);
        $this->cashier->outlets()->attach($outlet->id);
    }

    // ── PUSH Sync ─────────────────────────────────────────────────

    public function test_can_push_batch_of_transactions(): void
    {
        $shift = Shift::create([
            'outlet_id'    => $this->outletId,
            'cashier_id'   => $this->cashier->id,
            'status'       => ShiftStatus::Open,
            'opened_at'    => now(),
            'opening_cash' => 200_000,
        ]);

        $category = Category::create(['company_id' => $this->cashier->company_id, 'name' => 'Cat', 'sort_order' => 1, 'is_active' => true]);
        $product = Product::create([
            'company_id'     => $this->cashier->company_id,
            'category_id'    => $category->id,
            'name'           => 'Produk Sync',
            'base_price'     => 10_000,
            'cost_price'     => 5_000,
            'unit'           => 'pcs',
            'is_track_stock' => false,
            'has_variants'   => false,
            'status'         => ProductStatus::Active,
        ]);

        // Buat batch 5 transaksi offline
        $transactions = collect(range(1, 5))->map(fn() => [
            'id'              => (string) Str::uuid(),
            'shift_id'        => $shift->id,
            'cashier_id'      => $this->cashier->id,
            'member_id'       => null,
            'items'           => [[
                'product_id' => $product->id,
                'variant_id' => null,
                'qty'        => 1,
                'unit_price' => 10_000,
                'discount'   => 0,
            ]],
            'payments'         => [['method' => 'cash', 'amount' => 10_000]],
            'subtotal'         => 10_000,
            'discount_amount'  => 0,
            'tax_amount'       => 0,
            'total_amount'     => 10_000,
            'points_redeemed'  => 0,
            'created_at'       => now()->toISOString(),
        ])->all();

        $response = $this->withHeaders($this->authHeaders($this->token, $this->outletId))
            ->postJson('/api/v1/sync/push', ['transactions' => $transactions]);

        $response->assertOk()
            ->assertJsonStructure(['data' => ['synced', 'failed', 'results']]);

        $synced = $response->json('data.synced');
        $this->assertEquals(5, $synced);
        $this->assertDatabaseCount('transactions', 5);
    }

    public function test_push_returns_partial_success_for_invalid_items(): void
    {
        $shift = Shift::create([
            'outlet_id'    => $this->outletId,
            'cashier_id'   => $this->cashier->id,
            'status'       => ShiftStatus::Open,
            'opened_at'    => now(),
            'opening_cash' => 200_000,
        ]);

        $validUuid   = (string) Str::uuid();
        $invalidUuid = (string) Str::uuid();

        $transactions = [
            // Valid
            [
                'id'             => $validUuid,
                'shift_id'       => $shift->id,
                'cashier_id'     => $this->cashier->id,
                'items'          => [['product_id' => Str::uuid(), 'qty' => 1, 'unit_price' => 5_000, 'discount' => 0]],
                'payments'       => [['method' => 'cash', 'amount' => 5_000]],
                'subtotal'       => 5_000, 'discount_amount' => 0, 'tax_amount' => 0,
                'total_amount'   => 5_000, 'points_redeemed' => 0,
                'created_at'     => now()->toISOString(),
            ],
            // Invalid — shift_id tidak ada
            [
                'id'             => $invalidUuid,
                'shift_id'       => (string) Str::uuid(), // tidak ada di DB
                'cashier_id'     => $this->cashier->id,
                'items'          => [],
                'payments'       => [],
                'subtotal'       => 0, 'discount_amount' => 0, 'tax_amount' => 0,
                'total_amount'   => 0, 'points_redeemed' => 0,
                'created_at'     => now()->toISOString(),
            ],
        ];

        $response = $this->withHeaders($this->authHeaders($this->token, $this->outletId))
            ->postJson('/api/v1/sync/push', ['transactions' => $transactions]);

        $response->assertOk();
        $this->assertEquals(1, $response->json('data.synced'));
        $this->assertEquals(1, $response->json('data.failed'));

        // Hasil per-item
        $results = $response->json('data.results');
        $this->assertEquals('success', $results[$validUuid]['status']);
        $this->assertEquals('error',   $results[$invalidUuid]['status']);
    }

    // ── PULL Sync (Delta) ─────────────────────────────────────────

    public function test_pull_returns_only_data_changed_after_since_timestamp(): void
    {
        // Seed 3 produk sebelum since
        $pastTime = now()->subHours(2);
        $category = Category::create(['company_id' => $this->cashier->company_id, 'name' => 'Old', 'sort_order' => 1, 'is_active' => true]);

        foreach (range(1, 3) as $i) {
            $p = Product::create([
                'company_id'     => $this->cashier->company_id,
                'category_id'    => $category->id,
                'name'           => "Produk Lama {$i}",
                'base_price'     => 10_000,
                'cost_price'     => 5_000,
                'unit'           => 'pcs',
                'is_track_stock' => false,
                'has_variants'   => false,
                'status'         => ProductStatus::Active,
            ]);
            $p->forceFill(['updated_at' => $pastTime])->saveQuietly();
        }

        // Seed 2 produk SETELAH since
        $since = now()->subHour();
        foreach (range(1, 2) as $i) {
            Product::create([
                'company_id'     => $this->cashier->company_id,
                'category_id'    => $category->id,
                'name'           => "Produk Baru {$i}",
                'base_price'     => 15_000,
                'cost_price'     => 7_000,
                'unit'           => 'pcs',
                'is_track_stock' => false,
                'has_variants'   => false,
                'status'         => ProductStatus::Active,
            ]);
        }

        $response = $this->withHeaders($this->authHeaders($this->token, $this->outletId))
            ->getJson('/api/v1/sync/pull?since=' . urlencode($since->toISOString()));

        $response->assertOk()
            ->assertJsonStructure(['data' => ['products', 'categories', 'members', 'vouchers', 'server_time']]);

        // Hanya 2 produk baru yang dikembalikan
        $products = $response->json('data.products');
        $this->assertCount(2, $products);
        $this->assertStringContainsString('Produk Baru', $products[0]['name']);
    }

    public function test_pull_without_since_returns_all_data(): void
    {
        $category = Category::create(['company_id' => $this->cashier->company_id, 'name' => 'Full', 'sort_order' => 1, 'is_active' => true]);
        foreach (range(1, 5) as $i) {
            Product::create([
                'company_id'     => $this->cashier->company_id,
                'category_id'    => $category->id,
                'name'           => "Produk {$i}",
                'base_price'     => 10_000,
                'cost_price'     => 5_000,
                'unit'           => 'pcs',
                'is_track_stock' => false,
                'has_variants'   => false,
                'status'         => ProductStatus::Active,
            ]);
        }

        $response = $this->withHeaders($this->authHeaders($this->token, $this->outletId))
            ->getJson('/api/v1/sync/pull');

        $response->assertOk();
        $this->assertCount(5, $response->json('data.products'));
    }
}
