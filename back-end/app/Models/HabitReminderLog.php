<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HabitReminderLog extends Model
{
    protected $fillable = [
        'user_id',
        'habit_id',
        'scheduled_time',
        'reminder_date',
    ];

    protected $casts = [
        'reminder_date' => 'date',
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