<?php
namespace App\Models;
use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\{BelongsTo, BelongsToMany, HasMany};
use Illuminate\Database\Eloquent\SoftDeletes;
class Outlet extends Model {
    use HasUuid, SoftDeletes;
    protected $fillable = [
        'company_id','name','address','city','phone','email',
        'tax_rate','qris_image_url','bank_name','bank_account_number',
        'bank_account_name','operating_hours','active_payment_methods',
        'settings','is_active'
    ];
    protected $casts = [
        'tax_rate' => 'decimal:2',
        'operating_hours' => 'array',
        'active_payment_methods' => 'array',
        'settings' => 'array',
        'is_active' => 'boolean',
    ];
    public function company(): BelongsTo { return $this->belongsTo(Company::class); }
    public function users(): BelongsToMany { return $this->belongsToMany(User::class, 'user_outlets'); }
    public function shifts(): HasMany { return $this->hasMany(Shift::class); }
    public function transactions(): HasMany { return $this->hasMany(Transaction::class); }
    public function inventoryStocks(): HasMany { return $this->hasMany(InventoryStock::class); }
    public function inventoryMovements(): HasMany { return $this->hasMany(InventoryMovement::class); }
}
