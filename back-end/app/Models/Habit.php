<?php

namespace App\Models;

use App\Models\Scopes\ActiveHabitScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;
use App\Models\HabitReminderLog;
use Illuminate\Database\Eloquent\Relations\HasOne;

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
        'schedule' => 'array',
        'is_active' => 'boolean',
        'archived_at' => 'datetime',
        'target_value' => 'decimal:2',
    ];

    protected static function booted(): void
    {
        // Apply global scope so archived habits are hidden by default
        static::addGlobalScope(new ActiveHabitScope());
    }

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

    public function reminderLogs(): HasMany
    {
        return $this->hasMany(HabitReminderLog::class);
    }

    public function logs(): HasMany
    {
        return $this->hasMany(HabitLog::class);
    }

    public function checklistItems(): HasMany
    {
        return $this->hasMany(HabitChecklistItem::class);
    }

    public function streak(): HasOne
    {
        return $this->hasOne(Streak::class);
    }

    /**
     * Scope a query to only include archived habits.
     */
    public function scopeOnlyArchived(Builder $query): Builder
    {
        return $query->withoutGlobalScope(ActiveHabitScope::class)->whereNotNull('archived_at');
    }

    /**
     * Scope a query to include both active and archived habits.
     */
    public function scopeWithArchived(Builder $query): Builder
    {
        return $query->withoutGlobalScope(ActiveHabitScope::class);
    }

    /**
     * Determines if the habit is scheduled for today based on frequency and due days.
     */
    public function isDueToday(?Carbon $date = null): bool
    {
        $date = $date ?? Carbon::now($this->timezone);
        $todayIsoDay = (int) $date->format('N'); // 1 (Mon) to 7 (Sun)

        if ($this->frequency === 'daily') {
            return true;
        }

        if ($this->due_days_of_week) {
            $days = explode(',', $this->due_days_of_week);
            return in_array((string) $todayIsoDay, $days, true);
        }

        // Fallback for weekly/custom without specific days defined
        return true; 
    }
}