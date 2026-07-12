<?php
namespace App\Models;
use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class PointTransaction extends Model {
    use HasUuid;
    public $timestamps = false;
    const CREATED_AT = 'created_at';
    protected $fillable = ['member_id','transaction_id','type','points','balance_after','description'];
    protected $casts = ['created_at' => 'datetime'];
    public function member(): BelongsTo { return $this->belongsTo(Member::class); }
    public function transaction(): BelongsTo { return $this->belongsTo(Transaction::class); }
}
