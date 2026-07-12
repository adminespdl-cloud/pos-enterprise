<?php
namespace App\Models;
use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\{BelongsTo, HasMany};
class Category extends Model {
    use HasUuid;
    protected $fillable = ['company_id','parent_id','name','sort_order','is_active'];
    protected $casts = ['is_active' => 'boolean', 'sort_order' => 'integer'];
    public function company(): BelongsTo { return $this->belongsTo(Company::class); }
    public function parent(): BelongsTo { return $this->belongsTo(Category::class, 'parent_id'); }
    public function children(): HasMany { return $this->hasMany(Category::class, 'parent_id')->orderBy('sort_order'); }
    public function products(): HasMany { return $this->hasMany(Product::class); }
}
