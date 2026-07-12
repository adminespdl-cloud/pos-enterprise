<?php
namespace App\Models;
use App\Enums\VoucherType;
use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class Voucher extends Model {
    use HasUuid;
    protected $fillable = [
        'company_id','code','type','value','min_transaction','max_discount',
        'usage_limit','usage_count','applicable_outlets','valid_from','valid_until','is_active'
    ];
    protected $casts = [
        'type' => VoucherType::class,
        'value' => 'decimal:2',
        'min_transaction' => 'decimal:2',
        'max_discount' => 'decimal:2',
        'applicable_outlets' => 'array',
        'valid_from' => 'datetime',
        'valid_until' => 'datetime',
        'is_active' => 'boolean',
    ];
    public function company(): BelongsTo { return $this->belongsTo(Company::class); }
    public function isValid(string $outletId, float $transactionTotal): bool {
        if (!$this->is_active) return false;
        if (now()->lt($this->valid_from) || now()->gt($this->valid_until)) return false;
        if ($this->usage_limit !== null && $this->usage_count >= $this->usage_limit) return false;
        if ($transactionTotal < $this->min_transaction) return false;
        if ($this->applicable_outlets !== null && !in_array($outletId, $this->applicable_outlets)) return false;
        return true;
    }
    public function calculateDiscount(float $total): float {
        if ($this->type === VoucherType::Percent) {
            $discount = $total * ($this->value / 100);
            return $this->max_discount !== null ? min($discount, $this->max_discount) : $discount;
        }
        return min($this->value, $total);
    }
}
