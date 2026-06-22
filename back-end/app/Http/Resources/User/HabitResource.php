<?php

namespace App\Http\Resources\User;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Http\Resources\User\StreakResource;

class HabitResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'type' => $this->type,
            'schedule' => $this->normalizeScheduleTime($this->schedule),
            'due_days_of_week' => $this->due_days_of_week ? explode(',', $this->due_days_of_week) : [],
            'frequency' => $this->frequency,
            'reminder_time' => $this->formatTime($this->reminder_time),
            'timezone' => $this->timezone,
            'target_value' => $this->target_value,
            'unit' => $this->unit,
            'is_active' => $this->is_active,
            'is_due_today' => $this->isDueToday(),
            'archived_at' => $this->archived_at,
            'category' => new CategoryResource($this->whenLoaded('category')),
            'tags' => TagResource::collection($this->whenLoaded('tags')),
            'checklist_items' => $this->when(
                $this->type === 'checklist' && $this->relationLoaded('checklistItems'),
                fn() => $this->checklistItems->map(fn($item) => [
                    'id' => $item->id,
                    'title' => $item->title,
                    'sort_order' => $item->sort_order,
                ])
            ),
            'streak' => new StreakResource($this->whenLoaded('streak')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }

    private function formatTime(?string $time): ?string
    {
        return $time ? Carbon::parse($time)->format('H:i') : null;
    }

    private function normalizeScheduleTime(?array $schedule): ?array
    {
        if (!$schedule || !isset($schedule['reminders']) || !is_array($schedule['reminders'])) {
            return $schedule;
        }

        $schedule['reminders'] = array_map(
            fn(string $time) => $this->formatTime($time),
            $schedule['reminders']
        );

        return $schedule;
    }
}