<?php

namespace App\Models\Habit;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HabitChecklistLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'habit_log_id',
        'checklist_item_id',
        'is_checked',
    ];

    protected $casts = [
        'is_checked' => 'boolean',
    ];

    public function habitLog(): BelongsTo
    {
        return $this->belongsTo(HabitLog::class);
    }

    public function checklistItem(): BelongsTo
    {
        return $this->belongsTo(HabitChecklistItem::class);
    }
}