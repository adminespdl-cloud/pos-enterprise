<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\{DB, Hash};
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ── 1. COMPANY ─────────────────────────────────────────────
        $companyId = (string) Str::uuid();
        DB::table('companies')->insert([
            'id'       => $companyId,
            'name'     => 'PT Usaha Maju Bersama',
            'email'    => 'info@usahamaju.com',
            'phone'    => '021-12345678',
            'address'  => 'Jl. Sudirman No. 123',
            'city'     => 'Jakarta',
            'timezone' => 'Asia/Jakarta',
            'currency' => 'IDR',
            'settings' => json_encode([
                'points_per_thousand' => 1,
                'points_to_rupiah'    => 1,
                'receipt_header'      => 'PT Usaha Maju Bersama',
                'receipt_footer'      => 'Terima kasih telah berbelanja!',
            ]),
            'is_active'  => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // ── 2. OUTLETS ─────────────────────────────────────────────
        $outletSouthId = (string) Str::uuid();
        $outletNorthId = (string) Str::uuid();

        DB::table('outlets')->insert([
            [
                'id'                     => $outletSouthId,
                'company_id'             => $companyId,
                'name'                   => 'Cabang Selatan',
                'address'                => 'Jl. Raya Selatan No. 45',
                'city'                   => 'Jakarta Selatan',
                'phone'                  => '021-9876543',
                'tax_rate'               => 0,
                'active_payment_methods' => json_encode(['cash', 'qris', 'transfer']),
                'operating_hours'        => '{}',
                'settings'               => '{}',
                'is_active'              => true,
                'created_at'             => now(),
                'updated_at'             => now(),
            ],
            [
                'id'                     => $outletNorthId,
                'company_id'             => $companyId,
                'name'                   => 'Cabang Utara',
                'address'                => 'Jl. Raya Utara No. 78',
                'city'                   => 'Jakarta Utara',
                'phone'                  => '021-1234567',
                'tax_rate'               => 0,
                'active_payment_methods' => json_encode(['cash', 'qris']),
                'operating_hours'        => '{}',
                'settings'               => '{}',
                'is_active'              => true,
                'created_at'             => now(),
                'updated_at'             => now(),
            ],
        ]);

        // ── 3. USERS ───────────────────────────────────────────────
        $superAdminId = (string) Str::uuid();
        $adminId      = (string) Str::uuid();
        $managerId    = (string) Str::uuid();
        $cashierId    = (string) Str::uuid();

        DB::table('users')->insert([
            [
                'id'            => $superAdminId,
                'company_id'    => $companyId,
                'name'          => 'Super Admin',
                'email'         => 'superadmin@pos-enterprise.com',
                'password_hash' => Hash::make('SuperAdmin@123'),
                'pin_hash'      => null,
                'role'          => 'super_admin',
                'is_active'     => true,
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
            [
                'id'            => $adminId,
                'company_id'    => $companyId,
                'name'          => 'Budi Admin',
                'email'         => 'admin@usahamaju.com',
                'password_hash' => Hash::make('Admin@123'),
                'pin_hash'      => null,
                'role'          => 'admin',
                'is_active'     => true,
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
            [
                'id'            => $managerId,
                'company_id'    => $companyId,
                'name'          => 'Siti Manajer',
                'email'         => 'manager@usahamaju.com',
                'password_hash' => Hash::make('Manager@123'),
                'pin_hash'      => Hash::make('123456'),
                'role'          => 'manager',
                'is_active'     => true,
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
            [
                'id'            => $cashierId,
                'company_id'    => $companyId,
                'name'          => 'Andi Prasetyo',
                'email'         => 'andi.kasir@usahamaju.com',
                'password_hash' => null,
                'pin_hash'      => Hash::make('112233'),
                'role'          => 'cashier',
                'is_active'     => true,
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
        ]);

        // Assign users ke outlet
        DB::table('user_outlets')->insert([
            ['user_id' => $adminId,   'outlet_id' => $outletSouthId],
            ['user_id' => $adminId,   'outlet_id' => $outletNorthId],
            ['user_id' => $managerId, 'outlet_id' => $outletSouthId],
            ['user_id' => $cashierId, 'outlet_id' => $outletSouthId],
        ]);

        // ── 4. KATEGORI ────────────────────────────────────────────
        $catMinumanId = (string) Str::uuid();
        $catMakananId = (string) Str::uuid();
        $catSnackId   = (string) Str::uuid();

        DB::table('categories')->insert([
            ['id' => $catMinumanId, 'company_id' => $companyId, 'name' => 'Minuman', 'sort_order' => 1, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['id' => $catMakananId, 'company_id' => $companyId, 'name' => 'Makanan', 'sort_order' => 2, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['id' => $catSnackId,   'company_id' => $companyId, 'name' => 'Snack',   'sort_order' => 3, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
        ]);

        // ── 5. PRODUK ──────────────────────────────────────────────
        $products = [
            ['name' => 'Aqua 600ml',     'sku' => 'AQU-001', 'price' => 4000,  'cat' => $catMinumanId],
            ['name' => 'Teh Manis',      'sku' => 'TEH-001', 'price' => 12000, 'cat' => $catMinumanId],
            ['name' => 'Roti Bakar',     'sku' => 'ROT-001', 'price' => 15000, 'cat' => $catMakananId],
            ['name' => 'Indomie Goreng', 'sku' => 'IDM-001', 'price' => 4000,  'cat' => $catMakananId],
            ['name' => 'Krupuk Udang',   'sku' => 'KRU-001', 'price' => 6000,  'cat' => $catSnackId],
            ['name' => 'Nasi Goreng',    'sku' => 'NGR-001', 'price' => 20000, 'cat' => $catMakananId],
            ['name' => 'Mie Goreng',     'sku' => 'MGR-001', 'price' => 18000, 'cat' => $catMakananId],
            ['name' => 'Jus Alpukat',    'sku' => 'JUS-001', 'price' => 18000, 'cat' => $catMinumanId],
            ['name' => 'Es Teh',         'sku' => 'EST-001', 'price' => 8000,  'cat' => $catMinumanId],
            ['name' => 'Coklat Wafer',   'sku' => 'WAF-001', 'price' => 5000,  'cat' => $catSnackId],
        ];

        foreach ($products as $pd) {
            $productId = (string) Str::uuid();
            DB::table('products')->insert([
                'id'             => $productId,
                'company_id'     => $companyId,
                'category_id'    => $pd['cat'],
                'name'           => $pd['name'],
                'sku'            => $pd['sku'],
                'base_price'     => $pd['price'],
                'is_track_stock' => true,
                'has_variants'   => false,
                'status'         => 'active',
                'created_at'     => now(),
                'updated_at'     => now(),
            ]);

            // Stok awal di kedua outlet
            DB::table('inventory_stocks')->insert([
                ['id' => (string) Str::uuid(), 'product_id' => $productId, 'outlet_id' => $outletSouthId, 'quantity' => rand(50, 150), 'minimum_stock' => 10, 'updated_at' => now()],
                ['id' => (string) Str::uuid(), 'product_id' => $productId, 'outlet_id' => $outletNorthId, 'quantity' => rand(50, 150), 'minimum_stock' => 10, 'updated_at' => now()],
            ]);
        }

        // Produk dengan varian: Kopi Susu
        $kopiSusuId = (string) Str::uuid();
        DB::table('products')->insert([
            'id'             => $kopiSusuId,
            'company_id'     => $companyId,
            'category_id'    => $catMinumanId,
            'name'           => 'Kopi Susu',
            'sku'            => 'KPS-001',
            'base_price'     => 15000,
            'is_track_stock' => true,
            'has_variants'   => true,
            'status'         => 'active',
            'created_at'     => now(),
            'updated_at'     => now(),
        ]);

        $varSmallId = (string) Str::uuid();
        $varLargeId = (string) Str::uuid();
        DB::table('product_variants')->insert([
            ['id' => $varSmallId, 'product_id' => $kopiSusuId, 'sku' => 'KPS-001-S', 'attributes' => json_encode(['Ukuran' => 'Small']), 'price' => 15000, 'cost_price' => 0, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['id' => $varLargeId, 'product_id' => $kopiSusuId, 'sku' => 'KPS-001-L', 'attributes' => json_encode(['Ukuran' => 'Large']), 'price' => 20000, 'cost_price' => 0, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
        ]);

        foreach ([$outletSouthId, $outletNorthId] as $oid) {
            DB::table('inventory_stocks')->insert([
                ['id' => (string) Str::uuid(), 'product_id' => $kopiSusuId, 'variant_id' => $varSmallId, 'outlet_id' => $oid, 'quantity' => 50, 'minimum_stock' => 10, 'updated_at' => now()],
                ['id' => (string) Str::uuid(), 'product_id' => $kopiSusuId, 'variant_id' => $varLargeId, 'outlet_id' => $oid, 'quantity' => 45, 'minimum_stock' => 10, 'updated_at' => now()],
            ]);
        }

        // ── 6. MEMBER DEMO ─────────────────────────────────────────
        DB::table('members')->insert([
            [
                'id'                      => (string) Str::uuid(),
                'company_id'              => $companyId,
                'name'                    => 'Rina Maharani',
                'phone'                   => '08123456789',
                'email'                   => 'rina@email.com',
                'points_balance'          => 432,
                'tier'                    => 'bronze',
                'registered_at_outlet_id' => $outletSouthId,
                'created_at'              => now(),
                'updated_at'              => now(),
            ],
            [
                'id'                       => (string) Str::uuid(),
                'company_id'               => $companyId,
                'name'                     => 'Budi Santoso',
                'phone'                    => '08987654321',
                'points_balance'           => 1250,
                'tier'                     => 'silver',
                'total_transaction_amount' => 1500000,
                'registered_at_outlet_id'  => $outletSouthId,
                'created_at'               => now(),
                'updated_at'               => now(),
            ],
        ]);

        // ── 7. VOUCHER DEMO ────────────────────────────────────────
        DB::table('vouchers')->insert([
            'id'              => (string) Str::uuid(),
            'company_id'      => $companyId,
            'code'            => 'WELCOME10',
            'type'            => 'percent',
            'value'           => 10,
            'min_transaction' => 50000,
            'max_discount'    => 20000,
            'usage_limit'     => 100,
            'usage_count'     => 0,
            'valid_from'      => now(),
            'valid_until'     => now()->addYear(),
            'is_active'       => true,
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

        $this->command->info('');
        $this->command->info('✅ Database seeded successfully!');
        $this->command->info('');
        $this->command->info('═══════════════════════════════════════');
        $this->command->info('  LOGIN CREDENTIALS');
        $this->command->info('═══════════════════════════════════════');
        $this->command->info('  Super Admin : superadmin@pos-enterprise.com');
        $this->command->info('               Password: SuperAdmin@123');
        $this->command->info('  Admin       : admin@usahamaju.com');
        $this->command->info('               Password: Admin@123');
        $this->command->info('  Manager     : manager@usahamaju.com');
        $this->command->info('               Password: Manager@123 | PIN: 123456');
        $this->command->info('  Kasir       : andi.kasir@usahamaju.com');
        $this->command->info('               PIN: 112233');
        $this->command->info('═══════════════════════════════════════');
        $this->command->info('  Voucher Demo: WELCOME10 (diskon 10%)');
        $this->command->info('═══════════════════════════════════════');
    }
}
