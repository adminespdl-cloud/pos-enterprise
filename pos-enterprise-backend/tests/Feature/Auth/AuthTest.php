<?php

namespace Tests\Feature\Auth;

use Tests\TestCase;
use App\Models\User;
use App\Enums\UserRole;
use Illuminate\Support\Facades\Hash;

class AuthTest extends TestCase
{
    // ── Login dengan Email ────────────────────────────────────────────

    public function test_admin_can_login_with_email_and_password(): void
    {
        ['company' => $company, 'admin' => $admin] = $this->createCompanyWithAdmin();

        $response = $this->postJson('/api/v1/auth/login', [
            'email'    => $admin->email,
            'password' => 'Admin@123',
        ]);

        $response->assertOk()
            ->assertJsonStructure([
                'data' => ['token', 'expires_at', 'user' => ['id', 'name', 'email', 'role']],
            ]);
    }

    public function test_login_fails_with_wrong_password(): void
    {
        ['admin' => $admin] = $this->createCompanyWithAdmin();

        $this->postJson('/api/v1/auth/login', [
            'email'    => $admin->email,
            'password' => 'salah_password',
        ])->assertStatus(401)
          ->assertJsonPath('status', 'error');
    }

    public function test_login_fails_for_inactive_user(): void
    {
        ['admin' => $admin] = $this->createCompanyWithAdmin();
        $admin->update(['is_active' => false]);

        $this->postJson('/api/v1/auth/login', [
            'email'    => $admin->email,
            'password' => 'Admin@123',
        ])->assertStatus(403);
    }

    // ── Login dengan PIN ──────────────────────────────────────────────

    public function test_cashier_can_login_with_pin(): void
    {
        ['company' => $company] = $this->createCompanyWithAdmin();
        $outlet = $this->createOutlet($company->id);

        $cashier = User::create([
            'company_id'  => $company->id,
            'name'        => 'Kasir Test',
            'email'       => null,
            'password_hash'=> null,
            'pin_hash'    => Hash::make('654321'),
            'role'        => UserRole::Cashier,
            'is_active'   => true,
        ]);
        $cashier->outlets()->attach($outlet->id);

        $this->postJson('/api/v1/auth/pin-login', [
            'cashier_id' => $cashier->id,
            'pin'        => '654321',
            'outlet_id'  => $outlet->id,
        ])->assertOk()
          ->assertJsonPath('data.user.role', 'cashier');
    }

    public function test_account_locks_after_3_failed_pin_attempts(): void
    {
        ['company' => $company] = $this->createCompanyWithAdmin();
        $outlet = $this->createOutlet($company->id);

        $cashier = User::create([
            'company_id'  => $company->id,
            'name'        => 'Kasir Kunci',
            'pin_hash'    => Hash::make('111111'),
            'role'        => UserRole::Cashier,
            'is_active'   => true,
        ]);
        $cashier->outlets()->attach($outlet->id);

        // 3x salah
        foreach (range(1, 3) as $_) {
            $this->postJson('/api/v1/auth/pin-login', [
                'cashier_id' => $cashier->id,
                'pin'        => '000000', // salah
                'outlet_id'  => $outlet->id,
            ]);
        }

        // Attempt ke-4 harus return 423 Locked
        $this->postJson('/api/v1/auth/pin-login', [
            'cashier_id' => $cashier->id,
            'pin'        => '111111', // benar tapi sudah terkunci
            'outlet_id'  => $outlet->id,
        ])->assertStatus(423)
          ->assertJsonPath('status', 'error');

        // Pastikan locked_until tersimpan di DB
        $this->assertNotNull($cashier->fresh()->locked_until);
    }

    // ── Logout ───────────────────────────────────────────────────────

    public function test_user_can_logout_and_token_is_invalidated(): void
    {
        ['admin' => $admin] = $this->createCompanyWithAdmin();
        $token = $this->loginAs($admin);

        // Logout berhasil
        $this->withToken($token)
            ->postJson('/api/v1/auth/logout')
            ->assertOk();

        // Token tidak berlaku lagi
        $this->withToken($token)
            ->getJson('/api/v1/auth/me')
            ->assertStatus(401);
    }

    // ── Me ────────────────────────────────────────────────────────────

    public function test_authenticated_user_can_get_profile(): void
    {
        ['admin' => $admin] = $this->createCompanyWithAdmin();
        $token = $this->loginAs($admin);

        $this->withToken($token)
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.id', $admin->id)
            ->assertJsonPath('data.role', 'admin');
    }

    public function test_unauthenticated_request_returns_401(): void
    {
        $this->getJson('/api/v1/auth/me')->assertStatus(401);
    }
}
