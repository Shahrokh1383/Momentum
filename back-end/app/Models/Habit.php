<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Habit extends Model
{
    protected $fillable = [
        'user_id',
        'category_id',
        'title',
        'description',
        'type',
        'schedule',
        'due_days_of_week',
        'frequency',
        'reminder_time',
        'timezone',
        'target_value',
        'unit',
        'is_active',
        'archived_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'schedule' => 'array',
        'target_value' => 'decimal:2',
        'archived_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'habit_tag');
    }

    public function logs(): HasMany
    {
        return $this->hasMany(HabitLog::class);
    }

    public function streak(): HasMany
    {
        return $this->hasMany(Streak::class);
    }
}