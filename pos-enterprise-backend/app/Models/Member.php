<?php
namespace App\Models;
use App\Enums\MemberTier;
use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\{BelongsTo, HasMany};
class Member extends Model {
    use HasUuid;
    protected $fillable = [
        'company_id','name','phone','email','birth_date','points_balance',
        'tier','total_transaction_count','total_transaction_amount','is_active','registered_at_outlet_id'
    ];
    protected $casts = [
        'tier' => MemberTier::class,
        'birth_date' => 'date',
        'total_transaction_amount' => 'decimal:2',
        'is_active' => 'boolean',
    ];
    public function company(): BelongsTo { return $this->belongsTo(Company::class); }
    public function registeredAtOutlet(): BelongsTo { return $this->belongsTo(Outlet::class, 'registered_at_outlet_id'); }
    public function transactions(): HasMany { return $this->hasMany(Transaction::class); }
    public function pointTransactions(): HasMany { return $this->hasMany(PointTransaction::class); }
    public function recalculateTier(): void {
        $this->tier = MemberTier::fromSpent((int) $this->total_transaction_amount);
    }
}
