<?php
namespace App\Models;
use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
class Company extends Model {
    use HasUuid;
    protected $fillable = ['name','email','phone','address','city','logo_url','timezone','currency','settings','is_active'];
    protected $casts = ['settings' => 'array', 'is_active' => 'boolean'];
    public function outlets(): HasMany { return $this->hasMany(Outlet::class); }
    public function users(): HasMany { return $this->hasMany(User::class); }
    public function products(): HasMany { return $this->hasMany(Product::class); }
    public function categories(): HasMany { return $this->hasMany(Category::class); }
    public function members(): HasMany { return $this->hasMany(Member::class); }
    public function vouchers(): HasMany { return $this->hasMany(Voucher::class); }
}
