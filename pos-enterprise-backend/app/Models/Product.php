<?php
namespace App\Models;
use App\Enums\ProductStatus;
use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\{BelongsTo, HasMany};
use Illuminate\Database\Eloquent\SoftDeletes;
class Product extends Model {
    use HasUuid, SoftDeletes;
    protected $fillable = [
        'company_id','category_id','name','description','barcode','sku',
        'base_price','cost_price','unit','image_url','is_track_stock','has_variants','status'
    ];
    protected $casts = [
        'base_price' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'is_track_stock' => 'boolean',
        'has_variants' => 'boolean',
        'status' => ProductStatus::class,
    ];
    public function company(): BelongsTo { return $this->belongsTo(Company::class); }
    public function category(): BelongsTo { return $this->belongsTo(Category::class); }
    public function variants(): HasMany { return $this->hasMany(ProductVariant::class); }
    public function inventoryStocks(): HasMany { return $this->hasMany(InventoryStock::class); }
    public function inventoryMovements(): HasMany { return $this->hasMany(InventoryMovement::class); }
    public function scopeActive($query) { return $query->where('status', ProductStatus::Active)->whereNull('deleted_at'); }
    public function stockAtOutlet(string $outletId): ?InventoryStock {
        return $this->inventoryStocks()->where('outlet_id', $outletId)->first();
    }
}
