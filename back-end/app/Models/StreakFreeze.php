<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StreakFreeze extends Model
{
    // Migration only has created_at, not updated_at
    public const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'habit_id',
        'frozen_date',
        'used_at',
        'reason',
    ];

    protected $casts = [
        'frozen_date' => 'date',
        'used_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function habit(): BelongsTo
    {
        return $this->belongsTo(Habit::class);
    }
}