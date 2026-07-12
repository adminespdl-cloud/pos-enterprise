<?php

use App\Http\Controllers\Api\V1\{
    AuthController,
    MemberController,
    ProductController,
    ReportController,
    ShiftController,
    SyncController,
    TransactionController,
};
use App\Http\Middleware\{OutletScope, SecurityHeaders};
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — POS Enterprise v1
|--------------------------------------------------------------------------
|
| Semua route diawali dengan /api/v1 (konfigurasi di bootstrap/app.php)
|
| Middleware stack:
|   'auth:sanctum'  → Verifikasi token Sanctum
|   'outlet.scope'  → Pastikan user punya akses ke X-Outlet-ID
|
*/

Route::get('/force-migrate', function() {
    \Illuminate\Support\Facades\Artisan::call('migrate:fresh', ['--seed' => true, '--force' => true]);
    return \Illuminate\Support\Facades\Artisan::output();
});

Route::middleware(['throttle:api', SecurityHeaders::class])->group(function () {

    // ══════════════════════════════════════════════════════════════════
    // AUTH — Public (tidak butuh token)
    // ══════════════════════════════════════════════════════════════════
    Route::prefix('auth')->group(function () {
        Route::post('login',     [AuthController::class, 'loginEmail']);  // Admin/Manager
        Route::post('login-pin', [AuthController::class, 'loginPin']);    // Kasir

        Route::middleware('auth:sanctum')->group(function () {
            Route::post('logout',  [AuthController::class, 'logout']);
            Route::post('refresh', [AuthController::class, 'refresh']);
            Route::get('me',       [AuthController::class, 'me']);
        });
    });

    // ══════════════════════════════════════════════════════════════════
    // AUTHENTICATED + OUTLET-SCOPED
    // ══════════════════════════════════════════════════════════════════
    Route::middleware(['auth:sanctum', OutletScope::class])->group(function () {

        // ── SYNC ───────────────────────────────────────────────────────
        Route::prefix('sync')->group(function () {
            Route::post('push',      [SyncController::class, 'push']);
            Route::get('pull',       [SyncController::class, 'pull']);
            Route::post('heartbeat', [SyncController::class, 'heartbeat']);
        });

        // ── SHIFTS ─────────────────────────────────────────────────────
        Route::prefix('shifts')->group(function () {
            Route::get('active',     [ShiftController::class, 'active']);
            Route::post('open',      [ShiftController::class, 'open']);
            Route::get('/',          [ShiftController::class, 'index']);
            Route::get('{id}',       [ShiftController::class, 'show']);
            Route::post('{id}/close',[ShiftController::class, 'close']);
        });

        // ── TRANSACTIONS ───────────────────────────────────────────────
        Route::prefix('transactions')->group(function () {
            Route::get('/',          [TransactionController::class, 'index']);
            Route::post('/',         [TransactionController::class, 'store']);
            Route::get('{id}',       [TransactionController::class, 'show']);
            Route::post('{id}/void', [TransactionController::class, 'void']);
        });

        // ── PRODUCTS ───────────────────────────────────────────────────
        Route::prefix('products')->group(function () {
            Route::get('/',          [ProductController::class, 'index']);
            Route::post('/',         [ProductController::class, 'store']);
            Route::get('{id}',       [ProductController::class, 'show']);
            Route::put('{id}',       [ProductController::class, 'update']);
            Route::delete('{id}',    [ProductController::class, 'destroy']);
        });

        // ── CATEGORIES ─────────────────────────────────────────────────
        Route::get('categories',     [ProductController::class, 'categories']);

        // ── MEMBERS ────────────────────────────────────────────────────
        Route::prefix('members')->group(function () {
            Route::get('/',          [MemberController::class, 'index']);
            Route::post('/',         [MemberController::class, 'store']);
            Route::get('search',     [MemberController::class, 'search']);
            Route::get('{id}',       [MemberController::class, 'show']);
            Route::put('{id}',       [MemberController::class, 'update']);
        });

        // ── REPORTS ────────────────────────────────────────────────────
        Route::prefix('reports')->group(function () {
            Route::get('sales',      [ReportController::class, 'sales']);
            Route::get('products',   [ReportController::class, 'products']);
            Route::get('dashboard',  [ReportController::class, 'dashboard']);
        });

    }); // end authenticated group

}); // end throttle group
