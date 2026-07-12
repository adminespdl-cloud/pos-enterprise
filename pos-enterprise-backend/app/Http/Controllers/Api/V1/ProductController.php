<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ProductStatus;
use App\Models\{Category, InventoryStock, Product, ProductVariant};
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    // ────────────────────────────────────────────────
    // GET /products  (digunakan kasir & manajer)
    // ────────────────────────────────────────────────
    public function index(Request $request): JsonResponse
    {
        $outletId  = $request->attributes->get('current_outlet_id');
        $companyId = $request->user()->company_id;

        $products = Product::with(['category:id,name', 'variants'])
            ->where('company_id', $companyId)
            ->where('status', ProductStatus::Active)
            ->when($request->category_id, fn($q) => $q->where('category_id', $request->category_id))
            ->when($request->search, fn($q) => $q->where(function ($q2) use ($request) {
                $q2->where('name', 'ilike', "%{$request->search}%")
                   ->orWhere('barcode', $request->search)
                   ->orWhere('sku', 'ilike', "%{$request->search}%");
            }))
            // Delta sync: hanya produk yang diupdate sejak timestamp tertentu
            ->when($request->updated_since, fn($q) => $q->where('updated_at', '>=', $request->updated_since))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 50));

        // Attach stok per outlet
        $productIds = $products->pluck('id');
        $stocks     = InventoryStock::where('outlet_id', $outletId)
            ->whereIn('product_id', $productIds)
            ->get()
            ->keyBy(fn($s) => $s->product_id . '-' . ($s->variant_id ?? 'null'));

        $products->getCollection()->transform(function ($product) use ($stocks) {
            $product->stock = $stocks->get($product->id . '-null')?->quantity ?? 0;
            $product->variants->each(function ($v) use ($product, $stocks) {
                $v->stock = $stocks->get($product->id . '-' . $v->id)?->quantity ?? 0;
            });
            return $product;
        });

        return response()->json([
            'status' => 'success',
            'data'   => $products,
        ]);
    }

    // ────────────────────────────────────────────────
    // POST /products
    // ────────────────────────────────────────────────
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name'          => 'required|string|max:200',
            'category_id'   => 'nullable|uuid|exists:categories,id',
            'description'   => 'nullable|string',
            'barcode'       => 'nullable|string|max:50',
            'sku'           => 'nullable|string|max:50',
            'base_price'    => 'required|numeric|min:0',
            'cost_price'    => 'nullable|numeric|min:0',
            'unit'          => 'nullable|string|max:20',
            'is_track_stock' => 'boolean',
            'has_variants'  => 'boolean',
            'variants'      => 'nullable|array',
            'variants.*.sku'        => 'nullable|string|max:50',
            'variants.*.attributes' => 'required|array',
            'variants.*.price'      => 'required|numeric|min:0',
            'opening_stock' => 'nullable|numeric|min:0',
            'minimum_stock' => 'nullable|numeric|min:0',
            'outlet_ids'    => 'nullable|array', // outlet mana yang mendapat stok awal
        ]);

        $companyId = $request->user()->company_id;

        DB::beginTransaction();
        try {
            $product = Product::create([
                'company_id'    => $companyId,
                'category_id'   => $request->category_id,
                'name'          => $request->name,
                'description'   => $request->description,
                'barcode'       => $request->barcode,
                'sku'           => $request->sku ?? strtoupper(substr(Str::slug($request->name), 0, 8)) . '-' . strtoupper(Str::random(4)),
                'base_price'    => $request->base_price,
                'cost_price'    => $request->cost_price ?? 0,
                'unit'          => $request->unit ?? 'pcs',
                'is_track_stock' => $request->boolean('is_track_stock', true),
                'has_variants'  => $request->boolean('has_variants', false),
                'status'        => ProductStatus::Active,
            ]);

            // Buat varian
            if ($request->has_variants && $request->variants) {
                foreach ($request->variants as $v) {
                    ProductVariant::create([
                        'product_id'  => $product->id,
                        'sku'         => $v['sku'] ?? null,
                        'attributes'  => $v['attributes'],
                        'price'       => $v['price'],
                        'cost_price'  => $v['cost_price'] ?? 0,
                        'is_active'   => true,
                    ]);
                }
            }

            // Inisialisasi stok awal di outlet
            if ($request->opening_stock > 0) {
                $outletIds = $request->outlet_ids ?? [$request->attributes->get('current_outlet_id')];
                foreach ($outletIds as $outletId) {
                    if ($product->has_variants) {
                        foreach ($product->variants as $variant) {
                            InventoryStock::create([
                                'product_id'    => $product->id,
                                'variant_id'    => $variant->id,
                                'outlet_id'     => $outletId,
                                'quantity'      => $request->opening_stock,
                                'minimum_stock' => $request->minimum_stock ?? 0,
                            ]);
                        }
                    } else {
                        InventoryStock::create([
                            'product_id'    => $product->id,
                            'outlet_id'     => $outletId,
                            'quantity'      => $request->opening_stock,
                            'minimum_stock' => $request->minimum_stock ?? 0,
                        ]);
                    }
                }
            }

            DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => 'Produk berhasil ditambahkan.',
                'data'    => $product->load(['category:id,name', 'variants']),
            ], 201);

        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }
    }

    // ────────────────────────────────────────────────
    // PUT /products/{id}
    // ────────────────────────────────────────────────
    public function update(Request $request, string $id): JsonResponse
    {
        $product = Product::findOrFail($id);

        $request->validate([
            'name'        => 'sometimes|string|max:200',
            'category_id' => 'nullable|uuid|exists:categories,id',
            'base_price'  => 'sometimes|numeric|min:0',
            'cost_price'  => 'nullable|numeric|min:0',
            'status'      => 'sometimes|in:active,inactive',
        ]);

        $product->update($request->only([
            'name', 'category_id', 'description', 'barcode', 'sku',
            'base_price', 'cost_price', 'unit', 'is_track_stock', 'status',
        ]));

        return response()->json([
            'status'  => 'success',
            'message' => 'Produk berhasil diperbarui.',
            'data'    => $product->fresh(['category:id,name', 'variants']),
        ]);
    }

    // ────────────────────────────────────────────────
    // DELETE /products/{id}
    // ────────────────────────────────────────────────
    public function destroy(string $id): JsonResponse
    {
        $product = Product::findOrFail($id);
        $product->update(['status' => ProductStatus::Deleted]);
        $product->delete(); // soft delete

        return response()->json([
            'status'  => 'success',
            'message' => 'Produk berhasil dihapus.',
        ]);
    }

    // ────────────────────────────────────────────────
    // GET /products/{id}
    // ────────────────────────────────────────────────
    public function show(Request $request, string $id): JsonResponse
    {
        $outletId = $request->attributes->get('current_outlet_id');
        $product  = Product::with(['category:id,name', 'variants'])->findOrFail($id);

        // Attach stok
        $stocks = InventoryStock::where('outlet_id', $outletId)
            ->where('product_id', $id)
            ->get()
            ->keyBy(fn($s) => $s->variant_id ?? 'null');

        $product->stock = $stocks->get('null')?->quantity ?? 0;
        $product->minimum_stock = $stocks->get('null')?->minimum_stock ?? 0;

        $product->variants->each(function ($v) use ($stocks) {
            $v->stock = $stocks->get($v->id)?->quantity ?? 0;
        });

        return response()->json([
            'status' => 'success',
            'data'   => $product,
        ]);
    }

    // ────────────────────────────────────────────────
    // GET /categories
    // ────────────────────────────────────────────────
    public function categories(Request $request): JsonResponse
    {
        $companyId  = $request->user()->company_id;
        $categories = Category::with('children')
            ->where('company_id', $companyId)
            ->whereNull('parent_id')
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'status' => 'success',
            'data'   => $categories,
        ]);
    }
}
