<?php

namespace App\Models\Streak;

use App\Models\Identity\User;
use App\Models\Habit\Habit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StreakFreeze extends Model
{
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