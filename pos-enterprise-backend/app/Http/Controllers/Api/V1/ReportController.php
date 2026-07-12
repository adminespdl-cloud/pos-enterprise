<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\{Transaction, Product, Member};
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    // ────────────────────────────────────────────────
    // GET /reports/sales — Laporan penjualan
    // ────────────────────────────────────────────────
    public function sales(Request $request): JsonResponse
    {
        $request->validate([
            'outlet_id' => 'nullable|uuid',
            'date_from' => 'required|date',
            'date_to'   => 'required|date|after_or_equal:date_from',
            'group_by'  => 'nullable|in:day,week,month',
        ]);

        $companyId = $request->user()->company_id;
        $outletId  = $request->outlet_id ?? $request->attributes->get('current_outlet_id');
        $groupBy   = $request->input('group_by', 'day');

        $dateFormat = match($groupBy) {
            'month' => "TO_CHAR(created_at, 'YYYY-MM')",
            'week'  => "TO_CHAR(DATE_TRUNC('week', created_at), 'YYYY-MM-DD')",
            default => "TO_CHAR(created_at, 'YYYY-MM-DD')",
        };

        $salesData = DB::table('transactions')
            ->where('status', 'completed')
            ->when($outletId, fn($q) => $q->where('outlet_id', $outletId))
            ->whereBetween('created_at', [$request->date_from . ' 00:00:00', $request->date_to . ' 23:59:59'])
            ->selectRaw("{$dateFormat} as period, COUNT(*) as transaction_count, SUM(total_amount) as revenue, SUM(discount_amount) as total_discount, SUM(tax_amount) as total_tax")
            ->groupByRaw($dateFormat)
            ->orderBy('period')
            ->get();

        $paymentBreakdown = DB::table('payments')
            ->join('transactions', 'transactions.id', '=', 'payments.transaction_id')
            ->where('transactions.status', 'completed')
            ->when($outletId, fn($q) => $q->where('transactions.outlet_id', $outletId))
            ->whereBetween('transactions.created_at', [$request->date_from . ' 00:00:00', $request->date_to . ' 23:59:59'])
            ->selectRaw('payments.method, SUM(payments.amount) as total, COUNT(DISTINCT payments.transaction_id) as count')
            ->groupBy('payments.method')
            ->get();

        $summary = DB::table('transactions')
            ->where('status', 'completed')
            ->when($outletId, fn($q) => $q->where('outlet_id', $outletId))
            ->whereBetween('created_at', [$request->date_from . ' 00:00:00', $request->date_to . ' 23:59:59'])
            ->selectRaw('COUNT(*) as total_transactions, SUM(total_amount) as total_revenue, AVG(total_amount) as avg_transaction, SUM(discount_amount) as total_discount')
            ->first();

        $voidCount = DB::table('transactions')
            ->where('status', 'voided')
            ->when($outletId, fn($q) => $q->where('outlet_id', $outletId))
            ->whereBetween('created_at', [$request->date_from . ' 00:00:00', $request->date_to . ' 23:59:59'])
            ->count();

        return response()->json([
            'status' => 'success',
            'data'   => [
                'summary'           => $summary,
                'void_count'        => $voidCount,
                'by_period'         => $salesData,
                'payment_breakdown' => $paymentBreakdown,
            ],
        ]);
    }

    // ────────────────────────────────────────────────
    // GET /reports/products — Laporan produk terlaris
    // ────────────────────────────────────────────────
    public function products(Request $request): JsonResponse
    {
        $request->validate([
            'outlet_id'  => 'nullable|uuid',
            'date_from'  => 'required|date',
            'date_to'    => 'required|date',
            'limit'      => 'nullable|integer|min:1|max:100',
        ]);

        $outletId = $request->outlet_id ?? $request->attributes->get('current_outlet_id');
        $limit    = $request->integer('limit', 20);

        $topProducts = DB::table('transaction_items')
            ->join('transactions', 'transactions.id', '=', 'transaction_items.transaction_id')
            ->where('transactions.status', 'completed')
            ->when($outletId, fn($q) => $q->where('transactions.outlet_id', $outletId))
            ->whereBetween('transactions.created_at', [$request->date_from . ' 00:00:00', $request->date_to . ' 23:59:59'])
            ->selectRaw('transaction_items.product_id, transaction_items.product_name, SUM(transaction_items.qty) as total_qty, SUM(transaction_items.subtotal) as total_revenue, COUNT(DISTINCT transaction_items.transaction_id) as transaction_count')
            ->groupBy('transaction_items.product_id', 'transaction_items.product_name')
            ->orderByDesc('total_revenue')
            ->limit($limit)
            ->get();

        return response()->json(['status' => 'success', 'data' => $topProducts]);
    }

    // ────────────────────────────────────────────────
    // GET /reports/dashboard — KPI untuk Web Admin
    // ────────────────────────────────────────────────
    public function dashboard(Request $request): JsonResponse
    {
        $companyId = $request->user()->company_id;
        $outletId  = $request->outlet_id;
        $today     = now()->toDateString();
        $yesterday = now()->subDay()->toDateString();

        $baseQuery = fn() => DB::table('transactions')
            ->where('status', 'completed')
            ->when($outletId, fn($q) => $q->where('outlet_id', $outletId));

        $todayRevenue     = (clone $baseQuery())->whereDate('created_at', $today)->sum('total_amount');
        $yesterdayRevenue = (clone $baseQuery())->whereDate('created_at', $yesterday)->sum('total_amount');
        $todayCount       = (clone $baseQuery())->whereDate('created_at', $today)->count();
        $todayVoid        = DB::table('transactions')->where('status', 'voided')->whereDate('created_at', $today)->count();

        $newMembersToday = Member::where('company_id', $companyId)->whereDate('created_at', $today)->count();

        $criticalStock = DB::table('inventory_stocks')
            ->join('products', 'products.id', '=', 'inventory_stocks.product_id')
            ->where('products.is_track_stock', true)
            ->whereColumn('inventory_stocks.quantity', '<=', 'inventory_stocks.minimum_stock')
            ->where('inventory_stocks.minimum_stock', '>', 0)
            ->when($outletId, fn($q) => $q->where('inventory_stocks.outlet_id', $outletId))
            ->count();

        $revenueGrowth = $yesterdayRevenue > 0
            ? round((($todayRevenue - $yesterdayRevenue) / $yesterdayRevenue) * 100, 1)
            : 0;

        // Chart: 7 hari terakhir
        $weeklyChart = (clone $baseQuery())
            ->whereBetween('created_at', [now()->subDays(6)->startOfDay(), now()->endOfDay()])
            ->selectRaw("TO_CHAR(created_at, 'YYYY-MM-DD') as date, SUM(total_amount) as revenue, COUNT(*) as count")
            ->groupByRaw("TO_CHAR(created_at, 'YYYY-MM-DD')")
            ->orderBy('date')
            ->get();

        return response()->json([
            'status' => 'success',
            'data'   => [
                'today_revenue'     => $todayRevenue,
                'yesterday_revenue' => $yesterdayRevenue,
                'revenue_growth'    => $revenueGrowth,
                'today_transactions' => $todayCount,
                'today_void'        => $todayVoid,
                'new_members_today' => $newMembersToday,
                'critical_stock'    => $criticalStock,
                'weekly_chart'      => $weeklyChart,
            ],
        ]);
    }
}
