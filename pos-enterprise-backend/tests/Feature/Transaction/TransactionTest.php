<?php

namespace Tests\Feature\Transaction;

use Tests\TestCase;
use App\Models\{User, Product, Category, InventoryStock, Shift};
use App\Enums\{UserRole, ProductStatus, ShiftStatus};
use Illuminate\Support\Str;

class TransactionTest extends TestCase
{
    private string $token;
    private string $outletId;
    private User   $cashier;
    private string $shiftId;
    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        // Setup: Company → Outlet → Cashier → Shift → Product
        ['company' => $company, 'admin' => $admin] = $this->createCompanyWithAdmin();
        $outlet = $this->createOutlet($company->id);
        $this->outletId = $outlet->id;

        $this->cashier = User::create([
            'company_id'   => $company->id,
            'name'         => 'Kasir Aktif',
            'pin_hash'     => bcrypt('123456'),
            'role'         => UserRole::Cashier,
            'is_active'    => true,
        ]);
        $this->cashier->outlets()->attach($outlet->id);
        $this->token = $this->loginAs($admin);

        // Buka shift
        $shift = Shift::create([
            'outlet_id'    => $outlet->id,
            'cashier_id'   => $this->cashier->id,
            'status'       => ShiftStatus::Open,
            'opened_at'    => now(),
            'opening_cash' => 500_000,
        ]);
        $this->shiftId = $shift->id;

        // Buat produk + stok
        $category = Category::create(['company_id' => $company->id, 'name' => 'Minuman', 'sort_order' => 1, 'is_active' => true]);
        $this->product = Product::create([
            'company_id'    => $company->id,
            'category_id'   => $category->id,
            'name'          => 'Kopi Susu',
            'base_price'    => 25_000,
            'cost_price'    => 10_000,
            'unit'          => 'cup',
            'is_track_stock'=> true,
            'has_variants'  => false,
            'status'        => ProductStatus::Active,
        ]);
        InventoryStock::create([
            'product_id'    => $this->product->id,
            'outlet_id'     => $outlet->id,
            'quantity'      => 50,
            'minimum_stock' => 5,
        ]);
    }

    // ── Create Transaction ─────────────────────────────────────────

    public function test_cashier_can_create_transaction(): void
    {
        $payload = $this->buildTransactionPayload();

        $response = $this->withHeaders($this->authHeaders($this->token, $this->outletId))
            ->postJson('/api/v1/transactions', $payload);

        $response->assertCreated()
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.total_amount', 25_000);
    }

    public function test_stock_is_decremented_after_transaction(): void
    {
        $payload = $this->buildTransactionPayload(qty: 3);

        $this->withHeaders($this->authHeaders($this->token, $this->outletId))
            ->postJson('/api/v1/transactions', $payload)
            ->assertCreated();

        $stock = InventoryStock::where('product_id', $this->product->id)
            ->where('outlet_id', $this->outletId)
            ->first();

        $this->assertEquals(47, $stock->quantity); // 50 - 3
    }

    public function test_transaction_with_member_earns_points(): void
    {
        ['company' => $company] = $this->createCompanyWithAdmin(['name' => 'Company 2']);
        // Kita pakai company yang sudah ada dari setUp
        $member = \App\Models\Member::create([
            'company_id'    => $this->cashier->company_id,
            'name'          => 'Siti Member',
            'phone'         => '08123456789',
            'tier'          => \App\Enums\MemberTier::Bronze,
            'points_balance'=> 0,
            'is_active'     => true,
        ]);

        $payload = array_merge($this->buildTransactionPayload(), ['member_id' => $member->id]);

        $response = $this->withHeaders($this->authHeaders($this->token, $this->outletId))
            ->postJson('/api/v1/transactions', $payload);

        $response->assertCreated();
        $points = $response->json('data.points_earned');
        $this->assertGreaterThan(0, $points);

        // Member poin balance bertambah
        $this->assertEquals($points, $member->fresh()->points_balance);
    }

    // ── Idempotency ───────────────────────────────────────────────

    public function test_posting_same_transaction_twice_is_idempotent(): void
    {
        $payload = $this->buildTransactionPayload();

        // POST pertama → 201
        $first = $this->withHeaders($this->authHeaders($this->token, $this->outletId))
            ->postJson('/api/v1/transactions', $payload);
        $first->assertCreated();

        // POST kedua dengan UUID sama → juga 200/201 tapi TIDAK buat duplikat
        $second = $this->withHeaders($this->authHeaders($this->token, $this->outletId))
            ->postJson('/api/v1/transactions', $payload);
        $second->assertStatus(200);  // 200 = sudah ada, kembalikan data lama

        // Stok hanya berkurang sekali (50 - 1 = 49)
        $stock = InventoryStock::where('product_id', $this->product->id)
            ->where('outlet_id', $this->outletId)->first();
        $this->assertEquals(49, $stock->quantity);

        // Hanya 1 record di DB
        $this->assertDatabaseCount('transactions', 1);
    }

    // ── Void ─────────────────────────────────────────────────────

    public function test_manager_can_void_transaction(): void
    {
        // Buat transaksi
        $payload = $this->buildTransactionPayload();
        $trxId = $this->withHeaders($this->authHeaders($this->token, $this->outletId))
            ->postJson('/api/v1/transactions', $payload)
            ->json('data.id');

        // Void
        $response = $this->withHeaders($this->authHeaders($this->token, $this->outletId))
            ->postJson("/api/v1/transactions/{$trxId}/void", [
                'void_reason'  => 'Salah input produk',
                'manager_pin'  => '123456',
            ]);

        $response->assertOk()
            ->assertJsonPath('data.status', 'voided');

        // Stok dikembalikan
        $stock = InventoryStock::where('product_id', $this->product->id)
            ->where('outlet_id', $this->outletId)->first();
        $this->assertEquals(50, $stock->quantity); // kembali ke 50
    }

    public function test_void_fails_with_wrong_manager_pin(): void
    {
        $payload = $this->buildTransactionPayload();
        $trxId = $this->withHeaders($this->authHeaders($this->token, $this->outletId))
            ->postJson('/api/v1/transactions', $payload)
            ->json('data.id');

        $this->withHeaders($this->authHeaders($this->token, $this->outletId))
            ->postJson("/api/v1/transactions/{$trxId}/void", [
                'void_reason' => 'Coba-coba',
                'manager_pin' => '000000', // salah
            ])->assertStatus(403);
    }

    public function test_cannot_void_already_voided_transaction(): void
    {
        $payload = $this->buildTransactionPayload();
        $trxId = $this->withHeaders($this->authHeaders($this->token, $this->outletId))
            ->postJson('/api/v1/transactions', $payload)->json('data.id');

        // Void pertama
        $this->withHeaders($this->authHeaders($this->token, $this->outletId))
            ->postJson("/api/v1/transactions/{$trxId}/void", [
                'void_reason' => 'Pertama', 'manager_pin' => '123456',
            ])->assertOk();

        // Void kedua harus gagal
        $this->withHeaders($this->authHeaders($this->token, $this->outletId))
            ->postJson("/api/v1/transactions/{$trxId}/void", [
                'void_reason' => 'Kedua', 'manager_pin' => '123456',
            ])->assertStatus(409); // Conflict
    }

    // ── Helpers ──────────────────────────────────────────────────

    private function buildTransactionPayload(int $qty = 1): array
    {
        return [
            'id'          => (string) Str::uuid(), // idempotency key
            'shift_id'    => $this->shiftId,
            'cashier_id'  => $this->cashier->id,
            'items'       => [[
                'product_id' => $this->product->id,
                'variant_id' => null,
                'qty'        => $qty,
                'unit_price' => 25_000,
                'discount'   => 0,
            ]],
            'payments' => [['method' => 'cash', 'amount' => 25_000 * $qty]],
            'subtotal'          => 25_000 * $qty,
            'discount_amount'   => 0,
            'tax_amount'        => 0,
            'total_amount'      => 25_000 * $qty,
            'points_redeemed'   => 0,
        ];
    }
}
