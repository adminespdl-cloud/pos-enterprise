<?php
namespace App\Models;
use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\{BelongsTo};
class InventoryStock extends Model {
    use HasUuid;
    public $timestamps = false;
    protected $fillable = ['product_id','variant_id','outlet_id','quantity','minimum_stock'];
    protected $casts = ['quantity' => 'decimal:3', 'minimum_stock' => 'decimal:3'];
    const UPDATED_AT = 'updated_at';
    public function product(): BelongsTo { return $this->belongsTo(Product::class); }
    public function variant(): BelongsTo { return $this->belongsTo(ProductVariant::class); }
    public function outlet(): BelongsTo { return $this->belongsTo(Outlet::class); }
    public function isLowStock(): bool { return $this->quantity <= $this->minimum_stock && $this->minimum_stock > 0; }
    public function isOutOfStock(): bool { return $this->quantity <= 0; }
}
