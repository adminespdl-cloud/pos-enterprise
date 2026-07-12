<?php
namespace App\Models;
use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class SyncLog extends Model {
    use HasUuid;
    public $timestamps = false;
    const UPDATED_AT = 'updated_at';
    protected $fillable = ['outlet_id','device_id','last_push_at','last_pull_at','pending_count','failed_count','last_error'];
    protected $casts = [
        'last_push_at' => 'datetime',
        'last_pull_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
    public function outlet(): BelongsTo { return $this->belongsTo(Outlet::class); }
}
