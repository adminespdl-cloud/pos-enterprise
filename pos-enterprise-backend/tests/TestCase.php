<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\Company;
use App\Models\User;
use App\Models\Outlet;
use App\Enums\UserRole;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;

    // ── Helpers ──────────────────────────────────────────────────────

    /** Buat Company + Admin User siap pakai */
    protected function createCompanyWithAdmin(array $overrides = []): array
    {
        $company = Company::create(array_merge([
            'name'     => 'Demo Company',
            'email'    => 'demo@company.test',
            'timezone' => 'Asia/Jakarta',
            'currency' => 'IDR',
            'settings' => [],
            'is_active'=> true,
        ], $overrides));

        $admin = User::create([
            'company_id'    => $company->id,
            'name'          => 'Admin Test',
            'email'         => 'admin@company.test',
            'password_hash' => bcrypt('Admin@123'),
            'pin_hash'      => bcrypt('123456'),
            'role'          => UserRole::Admin,
            'is_active'     => true,
        ]);

        return compact('company', 'admin');
    }

    /** Buat Outlet untuk company */
    protected function createOutlet(string $companyId, array $overrides = []): Outlet
    {
        return Outlet::create(array_merge([
            'company_id'              => $companyId,
            'name'                    => 'Outlet Test',
            'tax_rate'                => 0,
            'active_payment_methods'  => ['cash','qris','transfer'],
            'settings'                => [],
            'is_active'               => true,
        ], $overrides));
    }

    /** Login dan dapatkan token Bearer */
    protected function loginAs(User $user, string $password = 'Admin@123'): string
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email'    => $user->email,
            'password' => $password,
        ]);
        return $response->json('data.token');
    }

    /** Header Auth lengkap dengan token + outlet */
    protected function authHeaders(string $token, string $outletId): array
    {
        return [
            'Authorization' => "Bearer {$token}",
            'X-Outlet-ID'   => $outletId,
            'Accept'        => 'application/json',
        ];
    }
}
