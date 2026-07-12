<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\{PaymentMethod, TransactionStatus};
use App\Http\Requests\Transaction\CreateTransactionRequest;
use App\Models\{Member, Outlet, Product, ProductVariant, Shift, Transaction, Voucher};
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Routing\Controller;
use Illuminate\Support\{DB, Facades\DB as FacadesDB, Str};

class TransactionController extends Controller
{
    // ────────────────────────────────────────────────
    // POST /transactions
    // ────────────────────────────────────────────────
    public function store(CreateTransactionRequest $request): JsonResponse
    {
        $outletId = $request->attributes->get('current_outlet_id');
        $user     = $request->user();

        // Idempotency: jika UUID sudah ada, return transaksi yang sudah ada
        $existing = Transaction::find($request->transaction_id);
        if ($existing) {
            return response()->json([
                'status'  => 'success',
                'message' => 'Transaksi sudah ada (idempotent).',
                'data'    => $this->transactionResponse($existing),
            ], 200);
        }

        // Cek shift aktif
        $shift = Shift::where('outlet_id', $outletId)
            ->where('cashier_id', $user->id)
            ->open()
            ->first();

        if (!$shift) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Tidak ada shift aktif. Buka shift terlebih dahulu.',
                'code'    => 'NO_ACTIVE_SHIFT',
            ], 422);
        }

        $outlet = Outlet::findOrFail($outletId);

        FacadesDB::beginTransaction();
        try {
            // ── 1. Hitung total ──────────────────────────────────────
            $items        = collect($request->items);
            $subtotal     = 0;
            $resolvedItems = [];

            foreach ($items as $item) {
                if ($item['variant_id'] ?? null) {
                    $variant = ProductVariant::with('product')->findOrFail($item['variant_id']);
                    $price   = $variant->price;
                    $name    = $variant->product->name;
                    $sku     = $variant->sku ?? $variant->product->sku;
                    $varName = $variant->attribute_string;
                } else {
                    $product = Product::findOrFail($item['product_id']);
                    $price   = $product->base_price;
                    $name    = $product->name;
                    $sku     = $product->sku;
                    $varName = null;
                }

                $lineDiscount = $item['discount'] ?? 0;
                $lineTotal    = ($price * $item['qty']) - $lineDiscount;
                $taxAmount    = $lineTotal * ($outlet->tax_rate / 100);
                $subtotal    += $lineTotal;

                $resolvedItems[] = [
                    'product_id'   => $item['product_id'],
                    'variant_id'   => $item['variant_id'] ?? null,
                    'product_name' => $name,
                    'product_sku'  => $sku,
                    'variant_name' => $varName,
                    'unit_price'   => $price,
                    'qty'          => $item['qty'],
                    'discount'     => $lineDiscount,
                    'tax_amount'   => $taxAmount,
                    'subtotal'     => $lineTotal + $taxAmount,
                ];
            }

            $taxAmount      = $subtotal * ($outlet->tax_rate / 100);
            $discountAmount = 0;
            $pointsRedeemed = 0;

            // ── 2. Validasi Voucher ──────────────────────────────────
            $member = null;
            if ($request->member_id) {
                $member = Member::findOrFail($request->member_id);
            }

            if ($request->voucher_code) {
                $voucher = Voucher::where('code', $request->voucher_code)
                    ->where('company_id', $outlet->company_id)
                    ->first();

                if (!$voucher || !$voucher->isValid($outletId, $subtotal)) {
                    FacadesDB::rollBack();
                    return response()->json([
                        'status'  => 'error',
                        'message' => 'Voucher tidak valid atau sudah kedaluwarsa.',
                        'code'    => 'INVALID_VOUCHER',
                    ], 422);
                }

                $discountAmount = $voucher->calculateDiscount($subtotal);
                $voucher->increment('usage_count');
            }

            // ── 3. Hitung Poin ──────────────────────────────────────
            $totalAmount  = max(0, $subtotal + $taxAmount - $discountAmount);
            $pointsEarned = 0;

            if ($member) {
                // 1 poin per Rp1.000
                $pointsEarned = (int) floor($totalAmount / 1000);

                if (($request->points_to_redeem ?? 0) > 0) {
                    if ($request->points_to_redeem > $member->points_balance) {
                        FacadesDB::rollBack();
                        return response()->json([
                            'status'  => 'error',
                            'message' => 'Saldo poin tidak cukup.',
                            'code'    => 'INSUFFICIENT_POINTS',
                        ], 422);
                    }
                    $pointsRedeemed  = $request->points_to_redeem;
                    $pointsDiscount  = $pointsRedeemed; // 1 poin = Rp1
                    $totalAmount    -= $pointsDiscount;
                    $totalAmount     = max(0, $totalAmount);
                }
            }

            // ── 4. Buat Transaksi ────────────────────────────────────
            $trxNumber = $this->generateTransactionNumber($outletId, $outlet);

            /** @var Transaction $transaction */
            $transaction = Transaction::create([
                'id'               => $request->transaction_id ?? (string) Str::uuid(),
                'outlet_id'        => $outletId,
                'shift_id'         => $shift->id,
                'cashier_id'       => $user->id,
                'member_id'        => $member?->id,
                'transaction_number' => $trxNumber,
                'status'           => TransactionStatus::Completed,
                'subtotal'         => $subtotal,
                'discount_amount'  => $discountAmount,
                'tax_amount'       => $taxAmount,
                'total_amount'     => $totalAmount,
                'points_earned'    => $pointsEarned,
                'points_redeemed'  => $pointsRedeemed,
                'device_id'        => $request->header('X-Device-ID'),
                'notes'            => $request->notes,
            ]);

            // ── 5. Buat Item Transaksi ───────────────────────────────
            $transaction->items()->createMany($resolvedItems);

            // ── 6. Buat Payment Records ──────────────────────────────
            foreach ($request->payments as $payment) {
                $transaction->payments()->create([
                    'method'           => $payment['method'],
                    'amount'           => $payment['amount'],
                    'reference_number' => $payment['reference_number'] ?? null,
                    'voucher_code'     => $payment['method'] === 'voucher' ? $request->voucher_code : null,
                ]);
            }

            // ── 7. Kurangi Stok ──────────────────────────────────────
            foreach ($resolvedItems as $item) {
                $this->deductStock(
                    $outletId,
                    $item['product_id'],
                    $item['variant_id'],
                    $item['qty'],
                    $transaction->id,
                    $user->id
                );
            }

            // ── 8. Update Member Poin & Statistik ───────────────────
            if ($member) {
                $newBalance = $member->points_balance + $pointsEarned - $pointsRedeemed;
                $member->update([
                    'points_balance'          => $newBalance,
                    'total_transaction_count' => $member->total_transaction_count + 1,
                    'total_transaction_amount' => $member->total_transaction_amount + $totalAmount,
                ]);
                $member->recalculateTier();
                $member->save();

                // Catat point transaction
                $member->pointTransactions()->create([
                    'transaction_id' => $transaction->id,
                    'type'           => 'earn',
                    'points'         => $pointsEarned,
                    'balance_after'  => $newBalance,
                    'description'    => "Transaksi #{$trxNumber}",
                ]);

                if ($pointsRedeemed > 0) {
                    $member->pointTransactions()->create([
                        'transaction_id' => $transaction->id,
                        'type'           => 'redeem',
                        'points'         => -$pointsRedeemed,
                        'balance_after'  => $newBalance,
                        'description'    => "Redeem poin #{$trxNumber}",
                    ]);
                }
            }

            FacadesDB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => 'Transaksi berhasil dibuat.',
                'data'    => $this->transactionResponse($transaction->load(['items', 'payments', 'member'])),
            ], 201);

        } catch (\Throwable $e) {
            FacadesDB::rollBack();
            report($e);
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal memproses transaksi: ' . $e->getMessage(),
                'code'    => 'TRANSACTION_FAILED',
            ], 500);
        }
    }

    // ────────────────────────────────────────────────
    // POST /transactions/{id}/void
    // ────────────────────────────────────────────────
    public function void(Request $request, string $id): JsonResponse
    {
        $transaction = Transaction::findOrFail($id);
        $user        = $request->user();

        if ($transaction->isVoided()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Transaksi sudah dibatalkan.',
                'code'    => 'ALREADY_VOIDED',
            ], 422);
        }

        // Validasi void reason
        $request->validate([
            'void_reason'  => 'required|string|max:500',
            'manager_pin'  => 'required|string',
        ]);

        // Verifikasi PIN manajer
        $manager = $transaction->outlet->users()
            ->whereIn('role', ['manager', 'admin', 'super_admin'])
            ->where('is_active', true)
            ->get()
            ->first(fn($u) => \Hash::check($request->manager_pin, $u->pin_hash));

        if (!$manager) {
            return response()->json([
                'status'  => 'error',
                'message' => 'PIN manajer tidak valid.',
                'code'    => 'INVALID_MANAGER_PIN',
            ], 401);
        }

        FacadesDB::beginTransaction();
        try {
            $transaction->update([
                'status'      => TransactionStatus::Voided,
                'void_reason' => $request->void_reason,
                'voided_by'   => $manager->id,
                'voided_at'   => now(),
            ]);

            // Kembalikan stok
            foreach ($transaction->items as $item) {
                $this->returnStock(
                    $transaction->outlet_id,
                    $item->product_id,
                    $item->variant_id,
                    $item->qty,
                    $transaction->id,
                    $user->id
                );
            }

            // Kembalikan poin member
            if ($transaction->member) {
                $member     = $transaction->member;
                $newBalance = $member->points_balance - $transaction->points_earned + $transaction->points_redeemed;
                $member->update([
                    'points_balance'          => max(0, $newBalance),
                    'total_transaction_count' => max(0, $member->total_transaction_count - 1),
                    'total_transaction_amount' => max(0, $member->total_transaction_amount - $transaction->total_amount),
                ]);
            }

            FacadesDB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => 'Transaksi berhasil dibatalkan.',
                'data'    => $this->transactionResponse($transaction->fresh(['items', 'payments', 'member'])),
            ]);

        } catch (\Throwable $e) {
            FacadesDB::rollBack();
            report($e);
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal membatalkan transaksi.',
                'code'    => 'VOID_FAILED',
            ], 500);
        }
    }

    // ────────────────────────────────────────────────
    // GET /transactions
    // ────────────────────────────────────────────────
    public function index(Request $request): JsonResponse
    {
        $outletId = $request->attributes->get('current_outlet_id');

        $transactions = Transaction::with(['cashier:id,name', 'member:id,name,phone'])
            ->where('outlet_id', $outletId)
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->when($request->date_from, fn($q) => $q->whereDate('created_at', '>=', $request->date_from))
            ->when($request->date_to, fn($q) => $q->whereDate('created_at', '<=', $request->date_to))
            ->when($request->cashier_id, fn($q) => $q->where('cashier_id', $request->cashier_id))
            ->orderBy('created_at', 'desc')
            ->paginate($request->integer('per_page', 20));

        return response()->json([
            'status' => 'success',
            'data'   => $transactions,
        ]);
    }

    // ────────────────────────────────────────────────
    // GET /transactions/{id}
    // ────────────────────────────────────────────────
    public function show(string $id): JsonResponse
    {
        $transaction = Transaction::with([
            'items.product:id,name',
            'items.variant:id,attributes',
            'payments',
            'cashier:id,name',
            'member:id,name,phone,tier',
            'voidedBy:id,name',
        ])->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data'   => $this->transactionResponse($transaction),
        ]);
    }

    // ────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ────────────────────────────────────────────────
    private function generateTransactionNumber(string $outletId, Outlet $outlet): string
    {
        $prefix = strtoupper(substr(str_replace(' ', '', $outlet->name), 0, 4));
        $date   = now()->format('Ymd');
        $count  = Transaction::where('outlet_id', $outletId)
                ->whereDate('created_at', today())
                ->count() + 1;

        return "TRX-{$prefix}-{$date}-" . str_pad($count, 4, '0', STR_PAD_LEFT);
    }

    private function deductStock(string $outletId, string $productId, ?string $variantId, float $qty, string $refId, string $userId): void
    {
        FacadesDB::table('inventory_stocks')
            ->where('outlet_id', $outletId)
            ->where('product_id', $productId)
            ->where(fn($q) => $variantId ? $q->where('variant_id', $variantId) : $q->whereNull('variant_id'))
            ->decrement('quantity', $qty);

        $stock = FacadesDB::table('inventory_stocks')
            ->where('outlet_id', $outletId)
            ->where('product_id', $productId)
            ->first();

        \App\Models\InventoryMovement::create([
            'outlet_id'      => $outletId,
            'product_id'     => $productId,
            'variant_id'     => $variantId,
            'type'           => 'sale',
            'quantity'       => -$qty,
            'quantity_before' => ($stock->quantity ?? 0) + $qty,
            'quantity_after'  => ($stock->quantity ?? 0),
            'reference_id'   => $refId,
            'reference_type' => 'transaction',
            'created_by'     => $userId,
        ]);
    }

    private function returnStock(string $outletId, string $productId, ?string $variantId, float $qty, string $refId, string $userId): void
    {
        FacadesDB::table('inventory_stocks')
            ->where('outlet_id', $outletId)
            ->where('product_id', $productId)
            ->where(fn($q) => $variantId ? $q->where('variant_id', $variantId) : $q->whereNull('variant_id'))
            ->increment('quantity', $qty);

        $stock = FacadesDB::table('inventory_stocks')
            ->where('outlet_id', $outletId)
            ->where('product_id', $productId)
            ->first();

        \App\Models\InventoryMovement::create([
            'outlet_id'      => $outletId,
            'product_id'     => $productId,
            'variant_id'     => $variantId,
            'type'           => 'void',
            'quantity'       => $qty,
            'quantity_before' => ($stock->quantity ?? 0) - $qty,
            'quantity_after'  => ($stock->quantity ?? 0),
            'reference_id'   => $refId,
            'reference_type' => 'transaction',
            'created_by'     => $userId,
        ]);
    }

    private function transactionResponse(Transaction $t): array
    {
        return [
            'id'                 => $t->id,
            'transaction_number' => $t->transaction_number,
            'status'             => $t->status->value,
            'outlet_id'         => $t->outlet_id,
            'shift_id'          => $t->shift_id,
            'cashier'           => ['id' => $t->cashier_id, 'name' => $t->cashier?->name],
            'member'            => $t->member ? [
                'id'    => $t->member->id,
                'name'  => $t->member->name,
                'phone' => $t->member->phone,
                'tier'  => $t->member->tier?->value,
            ] : null,
            'subtotal'          => $t->subtotal,
            'discount_amount'   => $t->discount_amount,
            'tax_amount'        => $t->tax_amount,
            'total_amount'      => $t->total_amount,
            'points_earned'     => $t->points_earned,
            'points_redeemed'   => $t->points_redeemed,
            'items'             => $t->items?->map(fn($i) => [
                'product_id'   => $i->product_id,
                'variant_id'   => $i->variant_id,
                'product_name' => $i->product_name,
                'variant_name' => $i->variant_name,
                'unit_price'   => $i->unit_price,
                'qty'          => $i->qty,
                'subtotal'     => $i->subtotal,
            ]),
            'payments'          => $t->payments?->map(fn($p) => [
                'method' => $p->method->value,
                'amount' => $p->amount,
            ]),
            'void_reason'       => $t->void_reason,
            'voided_at'         => $t->voided_at?->toISOString(),
            'created_at'        => $t->created_at?->toISOString(),
        ];
    }
}
