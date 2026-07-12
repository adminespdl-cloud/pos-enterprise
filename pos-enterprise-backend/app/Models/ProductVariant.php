<?php
namespace App\Models;
use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class ProductVariant extends Model {
    use HasUuid;
    protected $fillable = ['product_id','sku','barcode','attributes','price','cost_price','image_url','is_active'];
    protected $casts = [
        'attributes' => 'array',
        'price' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'is_active' => 'boolean',
    ];
    public function product(): BelongsTo { return $this->belongsTo(Product::class); }
    public function getAttributeStringAttribute(): string {
        return collect($this->attributes)->map(fn($v, $k) => "$k: $v")->implode(' / ');
    }
}
