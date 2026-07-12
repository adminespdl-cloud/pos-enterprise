<?php
namespace App\Models;
use App\Enums\ShiftStatus;
use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\{BelongsTo, HasMany};
class Shift extends Model {
    use HasUuid;
    protected $fillable = [
        'outlet_id','cashier_id','opened_at','closed_at',
        'opening_cash','closing_cash','expected_cash','cash_difference','status','notes'
    ];
    protected $casts = [
        'status' => ShiftStatus::class,
        'opening_cash' => 'decimal:2',
        'closing_cash' => 'decimal:2',
        'expected_cash' => 'decimal:2',
        'cash_difference' => 'decimal:2',
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
    ];
    public function outlet(): BelongsTo { return $this->belongsTo(Outlet::class); }
    public function cashier(): BelongsTo { return $this->belongsTo(User::class, 'cashier_id'); }
    public function transactions(): HasMany { return $this->hasMany(Transaction::class); }
    public function isOpen(): bool { return $this->status === ShiftStatus::Open; }
    public function scopeOpen($query) { return $query->where('status', ShiftStatus::Open); }
}
