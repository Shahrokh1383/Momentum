<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HabitChecklistLog extends Model
{
    // Pure junction table — no temporal data needed
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