<?php

namespace App\Models\Habit;

use App\Models\Identity\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HabitLog extends Model
{
    protected $fillable = [
        'habit_id',
        'user_id',
        'logged_date',
        'status',
        'notes',
        'value',
        'duration_seconds',
    ];

    protected $casts = [
        'logged_date' => 'date',
        'value' => 'decimal:2',
        'duration_seconds' => 'integer',
    ];

    public function habit(): BelongsTo
    {
        return $this->belongsTo(Habit::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function checklistLogs(): HasMany
    {
        return $this->hasMany(HabitChecklistLog::class);
    }
}