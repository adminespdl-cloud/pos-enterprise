<?php
namespace App\Models;
use App\Enums\PaymentMethod;
use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class Payment extends Model {
    use HasUuid;
    public $timestamps = false;
    const CREATED_AT = 'created_at';
    protected $fillable = ['transaction_id','method','amount','reference_number','voucher_code','notes'];
    protected $casts = [
        'method' => PaymentMethod::class,
        'amount' => 'decimal:2',
        'created_at' => 'datetime',
    ];
    public function transaction(): BelongsTo { return $this->belongsTo(Transaction::class); }
}
