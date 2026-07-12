<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ShiftStatus;
use App\Models\{Shift, Transaction};
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

class ShiftController extends Controller
{
    // ────────────────────────────────────────────────
    // GET /shifts/active
    // ────────────────────────────────────────────────
    public function active(Request $request): JsonResponse
    {
        $outletId = $request->attributes->get('current_outlet_id');
        $user     = $request->user();

        $shift = Shift::with('cashier:id,name')
            ->where('outlet_id', $outletId)
            ->where('cashier_id', $user->id)
            ->open()
            ->first();

        return response()->json([
            'status' => 'success',
            'data'   => $shift ? $this->shiftResponse($shift) : null,
        ]);
    }

    // ────────────────────────────────────────────────
    // POST /shifts/open
    // ────────────────────────────────────────────────
    public function open(Request $request): JsonResponse
    {
        $request->validate([
            'opening_cash' => 'required|numeric|min:0',
        ]);

        $outletId = $request->attributes->get('current_outlet_id');
        $user     = $request->user();

        // Cek shift aktif yang sudah ada
        $existing = Shift::where('outlet_id', $outletId)
            ->where('cashier_id', $user->id)
            ->open()
            ->first();

        if ($existing) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Kasir sudah memiliki shift aktif.',
                'code'    => 'SHIFT_ALREADY_OPEN',
                'data'    => $this->shiftResponse($existing),
            ], 422);
        }

        try {
            $shift = Shift::create([
                'outlet_id'    => $outletId,
                'cashier_id'   => $user->id,
                'opened_at'    => now(),
                'opening_cash' => $request->opening_cash,
                'status'       => ShiftStatus::Open,
            ]);

            return response()->json([
                'status'  => 'success',
                'message' => 'Shift berhasil dibuka.',
                'data'    => $this->shiftResponse($shift->load('cashier:id,name')),
            ], 201);

        } catch (\Illuminate\Database\QueryException $e) {
            // PostgreSQL EXCLUDE constraint violation
            if (str_contains($e->getMessage(), 'shifts_one_open_per_cashier_outlet')) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Sudah ada shift aktif di outlet ini.',
                    'code'    => 'CONCURRENT_SHIFT_CONFLICT',
                ], 409);
            }
            throw $e;
        }
    }

    // ────────────────────────────────────────────────
    // POST /shifts/{id}/close
    // ────────────────────────────────────────────────
    public function close(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'closing_cash' => 'required|numeric|min:0',
            'notes'        => 'nullable|string|max:500',
        ]);

        $shift = Shift::findOrFail($id);
        $user  = $request->user();

        if (!$shift->isOpen()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Shift sudah ditutup.',
                'code'    => 'SHIFT_ALREADY_CLOSED',
            ], 422);
        }

        if ($shift->cashier_id !== $user->id) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Anda tidak bisa menutup shift kasir lain.',
                'code'    => 'UNAUTHORIZED',
            ], 403);
        }

        DB::beginTransaction();
        try {
            // Hitung kas yang seharusnya
            $cashIn = Transaction::where('shift_id', $shift->id)
                ->where('status', 'completed')
                ->whereHas('payments', fn($q) => $q->where('method', 'cash'))
                ->join('payments', 'transactions.id', '=', 'payments.transaction_id')
                ->where('payments.method', 'cash')
                ->sum('payments.amount');

            $expectedCash = $shift->opening_cash + $cashIn;
            $difference   = $request->closing_cash - $expectedCash;

            $shift->update([
                'closed_at'       => now(),
                'closing_cash'    => $request->closing_cash,
                'expected_cash'   => $expectedCash,
                'cash_difference' => $difference,
                'status'          => ShiftStatus::Closed,
                'notes'           => $request->notes,
            ]);

            DB::commit();

            // Summary untuk struk tutup shift
            $summary = $this->buildShiftSummary($shift);

            return response()->json([
                'status'  => 'success',
                'message' => 'Shift berhasil ditutup.',
                'data'    => [
                    'shift'   => $this->shiftResponse($shift->fresh('cashier')),
                    'summary' => $summary,
                ],
            ]);

        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }
    }

    // ────────────────────────────────────────────────
    // GET /shifts
    // ────────────────────────────────────────────────
    public function index(Request $request): JsonResponse
    {
        $outletId = $request->attributes->get('current_outlet_id');

        $shifts = Shift::with('cashier:id,name')
            ->where('outlet_id', $outletId)
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->when($request->date_from, fn($q) => $q->whereDate('opened_at', '>=', $request->date_from))
            ->when($request->date_to, fn($q) => $q->whereDate('opened_at', '<=', $request->date_to))
            ->orderBy('opened_at', 'desc')
            ->paginate($request->integer('per_page', 15));

        return response()->json([
            'status' => 'success',
            'data'   => $shifts,
        ]);
    }

    // ────────────────────────────────────────────────
    // GET /shifts/{id}
    // ────────────────────────────────────────────────
    public function show(string $id): JsonResponse
    {
        $shift   = Shift::with('cashier:id,name')->findOrFail($id);
        $summary = $this->buildShiftSummary($shift);

        return response()->json([
            'status' => 'success',
            'data'   => [
                'shift'   => $this->shiftResponse($shift),
                'summary' => $summary,
            ],
        ]);
    }

    // ────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ────────────────────────────────────────────────
    private function shiftResponse(Shift $shift): array
    {
        return [
            'id'              => $shift->id,
            'outlet_id'       => $shift->outlet_id,
            'cashier'         => ['id' => $shift->cashier_id, 'name' => $shift->cashier?->name],
            'status'          => $shift->status->value,
            'opened_at'       => $shift->opened_at?->toISOString(),
            'closed_at'       => $shift->closed_at?->toISOString(),
            'opening_cash'    => $shift->opening_cash,
            'closing_cash'    => $shift->closing_cash,
            'expected_cash'   => $shift->expected_cash,
            'cash_difference' => $shift->cash_difference,
            'notes'           => $shift->notes,
        ];
    }

    private function buildShiftSummary(Shift $shift): array
    {
        $trx = Transaction::where('shift_id', $shift->id);

        $totalRevenue  = (clone $trx)->where('status', 'completed')->sum('total_amount');
        $totalTrxCount = (clone $trx)->where('status', 'completed')->count();
        $voidCount     = (clone $trx)->where('status', 'voided')->count();

        $paymentBreakdown = DB::table('payments')
            ->join('transactions', 'transactions.id', '=', 'payments.transaction_id')
            ->where('transactions.shift_id', $shift->id)
            ->where('transactions.status', 'completed')
            ->selectRaw('payments.method, SUM(payments.amount) as total')
            ->groupBy('payments.method')
            ->pluck('total', 'method');

        return [
            'total_revenue'      => $totalRevenue,
            'total_transactions' => $totalTrxCount,
            'void_count'         => $voidCount,
            'payment_breakdown'  => [
                'cash'     => $paymentBreakdown['cash'] ?? 0,
                'qris'     => $paymentBreakdown['qris'] ?? 0,
                'transfer' => $paymentBreakdown['transfer'] ?? 0,
                'voucher'  => $paymentBreakdown['voucher'] ?? 0,
                'points'   => $paymentBreakdown['points'] ?? 0,
            ],
        ];
    }
}
