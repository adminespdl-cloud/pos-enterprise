<?php
namespace App\Models;
use App\Enums\InventoryMovementType;
use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class InventoryMovement extends Model {
    use HasUuid;
    public $timestamps = false;
    const CREATED_AT = 'created_at';
    // IMMUTABLE — no updates allowed
    protected $fillable = [
        'outlet_id','product_id','variant_id','type','quantity',
        'quantity_before','quantity_after','reference_id','reference_type','notes','created_by','created_at'
    ];
    protected $casts = [
        'type' => InventoryMovementType::class,
        'quantity' => 'decimal:3',
        'quantity_before' => 'decimal:3',
        'quantity_after' => 'decimal:3',
        'created_at' => 'datetime',
    ];
    public function outlet(): BelongsTo { return $this->belongsTo(Outlet::class); }
    public function product(): BelongsTo { return $this->belongsTo(Product::class); }
    public function variant(): BelongsTo { return $this->belongsTo(ProductVariant::class); }
    public function createdByUser(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }
}
