<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\UserRole;
use App\Http\Requests\Auth\LoginEmailRequest;
use App\Http\Requests\Auth\LoginPinRequest;
use App\Models\User;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\{Hash, Log, RateLimiter};
use Illuminate\Support\Str;

class AuthController extends Controller
{
    private const MAX_ATTEMPTS = 3;
    private const LOCK_SECONDS = 900; // 15 menit

    // ────────────────────────────────────────────────
    // POST /auth/login
    // ────────────────────────────────────────────────
    public function loginEmail(LoginEmailRequest $request): JsonResponse
    {
        $key = 'login-email:' . Str::lower($request->email) . '|' . $request->ip();

        if (RateLimiter::tooManyAttempts($key, (int) config('auth.rate_limit', 10))) {
            $seconds = RateLimiter::availableIn($key);
            return $this->errorResponse(
                "Terlalu banyak percobaan login. Coba lagi dalam {$seconds} detik.",
                429,
                'TOO_MANY_ATTEMPTS'
            );
        }

        $user = User::where('email', $request->email)
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->first();

        if (!$user || !Hash::check($request->password, $user->password_hash)) {
            RateLimiter::hit($key);
            return $this->errorResponse('Email atau password salah.', 401, 'INVALID_CREDENTIALS');
        }

        RateLimiter::clear($key);

        return $this->issueToken($user, $request, false);
    }

    // ────────────────────────────────────────────────
    // POST /auth/login-pin
    // ────────────────────────────────────────────────
    public function loginPin(LoginPinRequest $request): JsonResponse
    {
        $user = User::where('id', $request->user_id)
            ->where('role', UserRole::Cashier)
            ->where('is_active', true)
            ->first();

        if (!$user) {
            return $this->errorResponse('Kasir tidak ditemukan.', 404, 'USER_NOT_FOUND');
        }

        // Cek apakah akun terkunci
        if ($user->isLocked()) {
            $remainingSeconds = now()->diffInSeconds($user->locked_until);
            return $this->errorResponse(
                "Akun terkunci. Coba lagi dalam {$remainingSeconds} detik.",
                423,
                'ACCOUNT_LOCKED'
            );
        }

        if (!Hash::check($request->pin, $user->pin_hash)) {
            $user->increment('login_attempts');

            if ($user->login_attempts >= self::MAX_ATTEMPTS) {
                $user->update([
                    'locked_until'   => now()->addSeconds(self::LOCK_SECONDS),
                    'login_attempts' => 0,
                ]);
                return $this->errorResponse(
                    'Akun dikunci selama 15 menit karena terlalu banyak percobaan.',
                    423,
                    'ACCOUNT_LOCKED'
                );
            }

            $remaining = self::MAX_ATTEMPTS - $user->login_attempts;
            return $this->errorResponse(
                "PIN salah. {$remaining} percobaan tersisa.",
                401,
                'INVALID_PIN'
            );
        }

        // Reset attempts on success
        $user->update(['login_attempts' => 0, 'locked_until' => null]);

        return $this->issueToken($user, $request, true);
    }

    // ────────────────────────────────────────────────
    // POST /auth/logout
    // ────────────────────────────────────────────────
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Logout berhasil.',
        ]);
    }

    // ────────────────────────────────────────────────
    // POST /auth/refresh
    // ────────────────────────────────────────────────
    public function refresh(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->currentAccessToken()->delete();

        return $this->issueToken($user, $request, $user->role === UserRole::Cashier);
    }

    // ────────────────────────────────────────────────
    // GET /auth/me
    // ────────────────────────────────────────────────
    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('outlets:id,name');

        return response()->json([
            'status' => 'success',
            'data'   => [
                'id'      => $user->id,
                'name'    => $user->name,
                'email'   => $user->email,
                'role'    => $user->role->value,
                'outlets' => $user->outlets->map(fn($o) => [
                    'id'   => $o->id,
                    'name' => $o->name,
                ]),
            ],
        ]);
    }

    // ────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ────────────────────────────────────────────────
    private function issueToken(User $user, Request $request, bool $isCashier): JsonResponse
    {
        // Hapus token lama dari device yang sama (jika ada)
        if ($deviceId = $request->header('X-Device-ID')) {
            $user->tokens()->where('name', "device:{$deviceId}")->delete();
        }

        $tokenName    = $deviceId ? "device:{$deviceId}" : 'api-token';
        $abilities    = $this->getAbilitiesForRole($user->role);
        $expiresAt    = $isCashier
            ? now()->addMinutes((int) config('sanctum.cashier_token_ttl', 720))
            : now()->addMinutes((int) config('sanctum.token_ttl', 1440));

        $token = $user->createToken($tokenName, $abilities, $expiresAt)->plainTextToken;

        $user->update(['last_login_at' => now()]);

        Log::info('User login', [
            'user_id' => $user->id,
            'role'    => $user->role->value,
            'ip'      => $request->ip(),
            'device'  => $deviceId,
        ]);

        return response()->json([
            'status' => 'success',
            'data'   => [
                'token'      => $token,
                'expires_at' => $expiresAt->toISOString(),
                'user'       => [
                    'id'      => $user->id,
                    'name'    => $user->name,
                    'email'   => $user->email,
                    'role'    => $user->role->value,
                    'company_id' => $user->company_id,
                ],
            ],
        ], 200);
    }

    private function getAbilitiesForRole(UserRole $role): array
    {
        return match ($role) {
            UserRole::SuperAdmin => ['*'],
            UserRole::Admin      => ['outlet:*', 'product:*', 'user:*', 'report:*', 'sync:*'],
            UserRole::Manager    => ['outlet:read', 'product:*', 'report:*', 'sync:*', 'shift:*', 'transaction:*'],
            UserRole::Cashier    => ['sync:*', 'shift:*', 'transaction:create', 'transaction:read', 'product:read', 'member:read', 'member:create'],
        };
    }

    private function errorResponse(string $message, int $status, string $code): JsonResponse
    {
        return response()->json([
            'status'  => 'error',
            'message' => $message,
            'code'    => $code,
        ], $status);
    }
}
