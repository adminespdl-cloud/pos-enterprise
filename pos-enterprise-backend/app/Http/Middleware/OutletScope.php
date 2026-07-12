<?php
namespace App\Http\Middleware;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
class OutletScope {
    public function handle(Request $request, Closure $next): Response {
        $outletId = $request->header('X-Outlet-ID');
        if (!$outletId) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Header X-Outlet-ID diperlukan.',
                'code'    => 'MISSING_OUTLET_HEADER',
            ], 400);
        }
        $user = $request->user();
        if (!$user) {
            return response()->json(['status' => 'error', 'message' => 'Unauthenticated.'], 401);
        }
        // Admin & Super Admin punya akses ke semua outlet dalam company
        if (in_array($user->role, ['super_admin', 'admin'])) {
            $outlet = \App\Models\Outlet::where('id', $outletId)
                ->where('company_id', $user->company_id)
                ->first();
        } else {
            $outlet = $user->outlets()->where('outlets.id', $outletId)->first();
        }
        if (!$outlet) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Akses ke outlet ini tidak diizinkan.',
                'code'    => 'OUTLET_ACCESS_DENIED',
            ], 403);
        }
        $request->merge(['outlet' => $outlet]);
        $request->attributes->set('current_outlet', $outlet);
        return $next($request);
    }
}
