<?php

namespace App\Http\Resources\User;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

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