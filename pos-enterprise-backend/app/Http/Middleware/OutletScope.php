<?php

namespace App\Http\Middleware;

use App\Enums\UserRole;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware untuk memastikan user hanya bisa akses resource
 * yang berada dalam outlet yang sama (Outlet Scoping).
 *
 * Setiap request yang membutuhkan outlet context harus menyertakan
 * header X-Outlet-ID atau parameter outlet_id.
 */
class OutletScope
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Unauthenticated.',
                'code'    => 'UNAUTHENTICATED',
            ], 401);
        }

        // Super Admin dan Admin tidak dibatasi per outlet
        if (in_array($user->role, [UserRole::SuperAdmin, UserRole::Admin])) {
            return $next($request);
        }

        // Ambil outlet_id dari header atau request parameter
        $outletId = $request->header('X-Outlet-ID')
            ?? $request->input('outlet_id')
            ?? $request->route('outlet');

        if (!$outletId) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Header X-Outlet-ID diperlukan.',
                'code'    => 'OUTLET_REQUIRED',
            ], 400);
        }

        // Cek akses user ke outlet
        if (!$user->hasOutletAccess($outletId)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Anda tidak memiliki akses ke outlet ini.',
                'code'    => 'OUTLET_FORBIDDEN',
            ], 403);
        }

        // Simpan outlet_id ke request untuk digunakan controller
        $request->attributes->set('current_outlet_id', $outletId);

        return $next($request);
    }
}
