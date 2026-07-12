<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\{Member, Transaction, Product, Shift, SyncLog};
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

/**
 * SyncController — Endpoint inti sinkronisasi offline.
 *
 * Flow:
 *  1. PUSH  → Kasir mengirim data offline (transaksi, dll.) ke server
 *  2. PULL  → Kasir minta data terbaru dari server (produk, member, dll.)
 *  3. HEARTBEAT → Kasir lapor status koneksi
 */
class SyncController extends Controller
{
    // ────────────────────────────────────────────────
    // POST /sync/push
    // Android mengirim batch sync_queue items ke server
    // ────────────────────────────────────────────────
    public function push(Request $request): JsonResponse
    {
        $request->validate([
            'items'             => 'required|array|min:1|max:50',
            'items.*.uuid'      => 'required|uuid',
            'items.*.entity'    => 'required|in:transaction,member,inventory_adjustment',
            'items.*.payload'   => 'required|array',
            'items.*.client_created_at' => 'required|date',
        ]);

        $outletId = $request->attributes->get('current_outlet_id');
        $deviceId = $request->header('X-Device-ID', 'unknown');
        $user     = $request->user();

        $results = [];
        $successCount = 0;
        $failCount    = 0;

        foreach ($request->items as $item) {
            try {
                $result = match ($item['entity']) {
                    'transaction'          => $this->pushTransaction($item, $outletId, $user),
                    'member'               => $this->pushMember($item, $outletId, $user),
                    'inventory_adjustment' => $this->pushInventoryAdjustment($item, $outletId, $user),
                };

                $results[] = [
                    'uuid'   => $item['uuid'],
                    'status' => 'success',
                    'data'   => $result,
                ];
                $successCount++;

            } catch (\Throwable $e) {
                $results[] = [
                    'uuid'    => $item['uuid'],
                    'status'  => 'failed',
                    'message' => $e->getMessage(),
                    'code'    => 'PROCESSING_ERROR',
                ];
                $failCount++;
                report($e);
            }
        }

        // Update sync log
        SyncLog::updateOrCreate(
            ['outlet_id' => $outletId, 'device_id' => $deviceId],
            [
                'last_push_at' => now(),
                'pending_count' => 0,
                'failed_count'  => $failCount,
                'last_error'    => $failCount > 0 ? "Batch push: {$failCount} item gagal" : null,
            ]
        );

        return response()->json([
            'status'        => 'success',
            'data'          => [
                'results'       => $results,
                'success_count' => $successCount,
                'fail_count'    => $failCount,
                'server_time'   => now()->toISOString(),
            ],
        ]);
    }

    // ────────────────────────────────────────────────
    // GET /sync/pull
    // Android minta data master terbaru sejak timestamp
    // ────────────────────────────────────────────────
    public function pull(Request $request): JsonResponse
    {
        $request->validate([
            'since' => 'nullable|date',
        ]);

        $outletId  = $request->attributes->get('current_outlet_id');
        $companyId = $request->user()->company_id;
        $since     = $request->since ? \Carbon\Carbon::parse($request->since) : null;
        $deviceId  = $request->header('X-Device-ID', 'unknown');

        // Ambil data yang berubah sejak `since`
        $productsQuery = Product::with(['variants', 'category:id,name'])
            ->where('company_id', $companyId)
            ->withTrashed(); // kirim juga produk yang dihapus (untuk sync delete)

        if ($since) {
            $productsQuery->where(function ($q) use ($since) {
                $q->where('updated_at', '>', $since)
                  ->orWhere('deleted_at', '>', $since);
            });
        }

        $products = $productsQuery->limit(500)->get();

        // Stok di outlet ini
        $productIds = $products->pluck('id');
        $stocks     = \App\Models\InventoryStock::where('outlet_id', $outletId)
            ->whereIn('product_id', $productIds)
            ->get()
            ->groupBy('product_id');

        $products->each(function ($p) use ($stocks) {
            $p->stocks = $stocks->get($p->id, collect())->map(fn($s) => [
                'variant_id'    => $s->variant_id,
                'quantity'      => $s->quantity,
                'minimum_stock' => $s->minimum_stock,
            ]);
        });

        // Members yang berubah
        $membersQuery = Member::where('company_id', $companyId)
            ->where('is_active', true);

        if ($since) {
            $membersQuery->where('updated_at', '>', $since);
        }
        $members = $membersQuery->limit(1000)->get([
            'id', 'name', 'phone', 'email', 'tier', 'points_balance', 'updated_at',
        ]);

        // Update sync log
        SyncLog::updateOrCreate(
            ['outlet_id' => $outletId, 'device_id' => $deviceId],
            ['last_pull_at' => now()]
        );

        return response()->json([
            'status' => 'success',
            'data'   => [
                'server_time'   => now()->toISOString(),
                'products'      => $products,
                'members'       => $members,
                'product_count' => $products->count(),
                'member_count'  => $members->count(),
            ],
        ]);
    }

    // ────────────────────────────────────────────────
    // POST /sync/heartbeat
    // ────────────────────────────────────────────────
    public function heartbeat(Request $request): JsonResponse
    {
        $request->validate([
            'pending_count' => 'nullable|integer|min:0',
            'failed_count'  => 'nullable|integer|min:0',
        ]);

        $outletId = $request->attributes->get('current_outlet_id');
        $deviceId = $request->header('X-Device-ID', 'unknown');

        SyncLog::updateOrCreate(
            ['outlet_id' => $outletId, 'device_id' => $deviceId],
            [
                'pending_count' => $request->integer('pending_count', 0),
                'failed_count'  => $request->integer('failed_count', 0),
            ]
        );

        return response()->json([
            'status' => 'success',
            'data'   => ['server_time' => now()->toISOString()],
        ]);
    }

    // ────────────────────────────────────────────────
    // PRIVATE: Handlers per entity
    // ────────────────────────────────────────────────
    private function pushTransaction(array $item, string $outletId, $user): array
    {
        $payload = $item['payload'];

        // Idempotency: cek UUID sudah ada
        $existing = Transaction::find($item['uuid']);
        if ($existing) {
            return ['id' => $existing->id, 'transaction_number' => $existing->transaction_number, 'status' => 'already_exists'];
        }

        // Delegasi ke TransactionController store logic
        // Dalam implementasi nyata, inject service class
        // Di sini kita simulasikan dengan create langsung
        $transaction = Transaction::create([
            'id'                 => $item['uuid'],
            'outlet_id'          => $outletId,
            'shift_id'           => $payload['shift_id'] ?? null,
            'cashier_id'         => $user->id,
            'member_id'          => $payload['member_id'] ?? null,
            'transaction_number' => $payload['transaction_number'],
            'status'             => 'completed',
            'subtotal'           => $payload['subtotal'],
            'discount_amount'    => $payload['discount_amount'] ?? 0,
            'tax_amount'         => $payload['tax_amount'] ?? 0,
            'total_amount'       => $payload['total_amount'],
            'points_earned'      => $payload['points_earned'] ?? 0,
            'points_redeemed'    => $payload['points_redeemed'] ?? 0,
            'device_id'          => $payload['device_id'] ?? null,
            'created_at'         => $item['client_created_at'],
            'updated_at'         => now(),
        ]);

        // Items dan payments dibuat dari payload
        if (!empty($payload['items'])) {
            $transaction->items()->createMany($payload['items']);
        }
        if (!empty($payload['payments'])) {
            $transaction->payments()->createMany($payload['payments']);
        }

        return ['id' => $transaction->id, 'transaction_number' => $transaction->transaction_number, 'status' => 'created'];
    }

    private function pushMember(array $item, string $outletId, $user): array
    {
        $payload   = $item['payload'];
        $companyId = $user->company_id;

        // Resolusi konflik: cari by nomor telepon
        $existing = Member::where('company_id', $companyId)
            ->where('phone', $payload['phone'])
            ->first();

        if ($existing) {
            // Return canonical ID server → Android harus update local ID
            return ['id' => $existing->id, 'status' => 'merged', 'canonical_id' => $existing->id];
        }

        $member = Member::create([
            'id'                    => $item['uuid'],
            'company_id'            => $companyId,
            'name'                  => $payload['name'],
            'phone'                 => $payload['phone'],
            'email'                 => $payload['email'] ?? null,
            'registered_at_outlet_id' => $outletId,
        ]);

        return ['id' => $member->id, 'status' => 'created'];
    }

    private function pushInventoryAdjustment(array $item, string $outletId, $user): array
    {
        $payload = $item['payload'];

        \App\Models\InventoryMovement::create([
            'id'             => $item['uuid'],
            'outlet_id'      => $outletId,
            'product_id'     => $payload['product_id'],
            'variant_id'     => $payload['variant_id'] ?? null,
            'type'           => $payload['type'],
            'quantity'       => $payload['quantity'],
            'quantity_before' => $payload['quantity_before'],
            'quantity_after'  => $payload['quantity_after'],
            'notes'          => $payload['notes'] ?? null,
            'created_by'     => $user->id,
            'created_at'     => $item['client_created_at'],
        ]);

        // Update stok aktual
        DB::table('inventory_stocks')
            ->where('outlet_id', $outletId)
            ->where('product_id', $payload['product_id'])
            ->update(['quantity' => $payload['quantity_after'], 'updated_at' => now()]);

        return ['id' => $item['uuid'], 'status' => 'created'];
    }
}
