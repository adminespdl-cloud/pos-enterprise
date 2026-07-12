<?php

namespace Database\Seeders;

use App\Enums\{MemberTier, UserRole};
use App\Models\{Category, Company, InventoryStock, Member, Outlet, Product, User};
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ── 1. Perusahaan ──────────────────────────────────────────
        $company = Company::create([
            'name'     => 'PT Usaha Maju Bersama',
            'email'    => 'info@usahamaju.com',
            'phone'    => '021-12345678',
            'address'  => 'Jl. Sudirman No. 123',
            'city'     => 'Jakarta',
            'timezone' => 'Asia/Jakarta',
            'currency' => 'IDR',
            'settings' => [
                'points_per_thousand'  => 1,
                'points_to_rupiah'     => 1,
                'receipt_header'       => 'PT Usaha Maju Bersama',
                'receipt_footer'       => 'Terima kasih telah berbelanja!',
            ],
        ]);

        // ── 2. Outlet ──────────────────────────────────────────────
        $outletSouth = Outlet::create([
            'company_id'       => $company->id,
            'name'             => 'Cabang Selatan',
            'address'          => 'Jl. Raya Selatan No. 45',
            'city'             => 'Jakarta Selatan',
            'phone'            => '021-9876543',
            'tax_rate'         => 0,
            'active_payment_methods' => ['cash', 'qris', 'transfer'],
        ]);

        $outletNorth = Outlet::create([
            'company_id'       => $company->id,
            'name'             => 'Cabang Utara',
            'address'          => 'Jl. Raya Utara No. 78',
            'city'             => 'Jakarta Utara',
            'phone'            => '021-1234567',
            'tax_rate'         => 0,
            'active_payment_methods' => ['cash', 'qris'],
        ]);

        // ── 3. Users ───────────────────────────────────────────────
        $superAdmin = User::create([
            'company_id'    => $company->id,
            'name'          => 'Super Admin',
            'email'         => 'superadmin@pos-enterprise.com',
            'password_hash' => Hash::make('SuperAdmin@123'),
            'role'          => UserRole::SuperAdmin,
            'is_active'     => true,
        ]);

        $admin = User::create([
            'company_id'    => $company->id,
            'name'          => 'Budi Admin',
            'email'         => 'admin@usahamaju.com',
            'password_hash' => Hash::make('Admin@123'),
            'role'          => UserRole::Admin,
            'is_active'     => true,
        ]);

        $manager = User::create([
            'company_id'    => $company->id,
            'name'          => 'Siti Manajer',
            'email'         => 'manager@usahamaju.com',
            'password_hash' => Hash::make('Manager@123'),
            'pin_hash'      => Hash::make('123456'),
            'role'          => UserRole::Manager,
            'is_active'     => true,
        ]);

        $cashier = User::create([
            'company_id'    => $company->id,
            'name'          => 'Andi Prasetyo',
            'email'         => 'andi.kasir@usahamaju.com',
            'pin_hash'      => Hash::make('112233'),
            'role'          => UserRole::Cashier,
            'is_active'     => true,
        ]);

        // Assign ke outlet
        $admin->outlets()->attach([$outletSouth->id, $outletNorth->id]);
        $manager->outlets()->attach($outletSouth->id);
        $cashier->outlets()->attach($outletSouth->id);

        // ── 4. Kategori ────────────────────────────────────────────
        $catMinuman = Category::create([
            'company_id' => $company->id,
            'name'       => 'Minuman',
            'sort_order' => 1,
        ]);
        $catMakanan = Category::create([
            'company_id' => $company->id,
            'name'       => 'Makanan',
            'sort_order' => 2,
        ]);
        $catSnack = Category::create([
            'company_id' => $company->id,
            'name'       => 'Snack',
            'sort_order' => 3,
        ]);

        // ── 5. Produk ──────────────────────────────────────────────
        $products = [
            ['name' => 'Aqua 600ml',    'sku' => 'AQU-001', 'price' => 4000,  'cat' => $catMinuman->id, 'has_variants' => false],
            ['name' => 'Teh Manis',     'sku' => 'TEH-001', 'price' => 12000, 'cat' => $catMinuman->id, 'has_variants' => false],
            ['name' => 'Roti Bakar',    'sku' => 'ROT-001', 'price' => 15000, 'cat' => $catMakanan->id, 'has_variants' => false],
            ['name' => 'Indomie Goreng','sku' => 'IDM-001', 'price' => 4000,  'cat' => $catMakanan->id, 'has_variants' => false],
            ['name' => 'Krupuk Udang',  'sku' => 'KRU-001', 'price' => 6000,  'cat' => $catSnack->id,   'has_variants' => false],
        ];

        foreach ($products as $pd) {
            $product = Product::create([
                'company_id'     => $company->id,
                'category_id'    => $pd['cat'],
                'name'           => $pd['name'],
                'sku'            => $pd['sku'],
                'base_price'     => $pd['price'],
                'is_track_stock' => true,
                'has_variants'   => false,
            ]);

            // Stok awal di kedua outlet
            foreach ([$outletSouth->id, $outletNorth->id] as $oid) {
                InventoryStock::create([
                    'product_id'    => $product->id,
                    'outlet_id'     => $oid,
                    'quantity'      => rand(50, 150),
                    'minimum_stock' => 10,
                ]);
            }
        }

        // Produk dengan varian: Kopi Susu
        $kopiSusu = Product::create([
            'company_id'     => $company->id,
            'category_id'    => $catMinuman->id,
            'name'           => 'Kopi Susu',
            'sku'            => 'KPS-001',
            'base_price'     => 15000,
            'is_track_stock' => true,
            'has_variants'   => true,
        ]);

        $variantSmall = $kopiSusu->variants()->create([
            'sku'        => 'KPS-001-S',
            'attributes' => ['Ukuran' => 'Small'],
            'price'      => 15000,
        ]);
        $variantLarge = $kopiSusu->variants()->create([
            'sku'        => 'KPS-001-L',
            'attributes' => ['Ukuran' => 'Large'],
            'price'      => 20000,
        ]);

        foreach ([$outletSouth->id, $outletNorth->id] as $oid) {
            InventoryStock::create(['product_id' => $kopiSusu->id, 'variant_id' => $variantSmall->id, 'outlet_id' => $oid, 'quantity' => 50, 'minimum_stock' => 10]);
            InventoryStock::create(['product_id' => $kopiSusu->id, 'variant_id' => $variantLarge->id, 'outlet_id' => $oid, 'quantity' => 45, 'minimum_stock' => 10]);
        }

        // ── 6. Member Demo ─────────────────────────────────────────
        Member::create([
            'company_id'             => $company->id,
            'name'                   => 'Rina Maharani',
            'phone'                  => '08123456789',
            'email'                  => 'rina@email.com',
            'points_balance'         => 432,
            'tier'                   => MemberTier::Bronze,
            'registered_at_outlet_id' => $outletSouth->id,
        ]);

        Member::create([
            'company_id'             => $company->id,
            'name'                   => 'Budi Santoso',
            'phone'                  => '08987654321',
            'points_balance'         => 1250,
            'tier'                   => MemberTier::Silver,
            'total_transaction_amount' => 1_500_000,
            'registered_at_outlet_id' => $outletSouth->id,
        ]);

        $this->command->info('✅ Database seeded successfully!');
        $this->command->info('');
        $this->command->info('Login Credentials:');
        $this->command->info('  Super Admin : superadmin@pos-enterprise.com / SuperAdmin@123');
        $this->command->info('  Admin       : admin@usahamaju.com / Admin@123');
        $this->command->info('  Manager     : manager@usahamaju.com / Manager@123 | PIN: 123456');
        $this->command->info('  Kasir PIN   : Andi Prasetyo / PIN: 112233');
    }
}
