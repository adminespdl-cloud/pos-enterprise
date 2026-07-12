<?php
namespace App\Models;
use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class TransactionItem extends Model {
    use HasUuid;
    public $timestamps = false;
    const CREATED_AT = 'created_at';
    protected $fillable = [
        'transaction_id','product_id','variant_id','product_name','product_sku',
        'variant_name','unit_price','qty','discount','tax_amount','subtotal'
    ];
    protected $casts = [
        'unit_price' => 'decimal:2',
        'qty' => 'decimal:3',
        'discount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'created_at' => 'datetime',
    ];
    public function transaction(): BelongsTo { return $this->belongsTo(Transaction::class); }
    public function product(): BelongsTo { return $this->belongsTo(Product::class); }
    public function variant(): BelongsTo { return $this->belongsTo(ProductVariant::class); }
}
