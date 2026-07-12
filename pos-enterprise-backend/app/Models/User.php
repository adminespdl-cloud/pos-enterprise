<?php
namespace App\Models;
use App\Enums\UserRole;
use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Relations\{BelongsTo, BelongsToMany, HasMany};
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
class User extends Authenticatable {
    use HasApiTokens, HasUuid, Notifiable, SoftDeletes;
    protected $fillable = [
        'company_id','name','email','phone','password_hash',
        'pin_hash','role','is_active','last_login_at','login_attempts','locked_until'
    ];
    protected $hidden = ['password_hash','pin_hash'];
    protected $casts = [
        'role'          => UserRole::class,
        'is_active'     => 'boolean',
        'last_login_at' => 'datetime',
        'locked_until'  => 'datetime',
    ];
    public function getAuthPassword(): string { return $this->password_hash ?? ''; }
    public function company(): BelongsTo { return $this->belongsTo(Company::class); }
    public function outlets(): BelongsToMany { return $this->belongsToMany(Outlet::class, 'user_outlets'); }
    public function shifts(): HasMany { return $this->hasMany(Shift::class, 'cashier_id'); }
    public function isLocked(): bool {
        return $this->locked_until !== null && $this->locked_until->isFuture();
    }
}
