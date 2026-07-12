<?php
namespace App\Models;
use App\Enums\TransactionStatus;
use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\{BelongsTo, HasMany};
class Transaction extends Model {
    use HasUuid;
    protected $fillable = [
        'id','outlet_id','shift_id','cashier_id','member_id','transaction_number',
        'status','subtotal','discount_amount','tax_amount','total_amount',
        'points_earned','points_redeemed','void_reason','voided_by','voided_at','device_id','notes'
    ];
    protected $casts = [
        'status' => TransactionStatus::class,
        'subtotal' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'voided_at' => 'datetime',
    ];
    public function outlet(): BelongsTo { return $this->belongsTo(Outlet::class); }
    public function shift(): BelongsTo { return $this->belongsTo(Shift::class); }
    public function cashier(): BelongsTo { return $this->belongsTo(User::class, 'cashier_id'); }
    public function member(): BelongsTo { return $this->belongsTo(Member::class); }
    public function voidedBy(): BelongsTo { return $this->belongsTo(User::class, 'voided_by'); }
    public function items(): HasMany { return $this->hasMany(TransactionItem::class); }
    public function payments(): HasMany { return $this->hasMany(Payment::class); }
    public function isVoided(): bool { return $this->status === TransactionStatus::Voided; }
    public function scopeCompleted($query) { return $query->where('status', TransactionStatus::Completed); }
    public function scopeVoided($query) { return $query->where('status', TransactionStatus::Voided); }
}
