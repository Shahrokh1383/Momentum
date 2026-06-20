<?php

namespace App\Http\Resources\User;

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
            'schedule' => $this->schedule,
            'due_days_of_week' => $this->due_days_of_week ? explode(',', $this->due_days_of_week) : [],
            'frequency' => $this->frequency,
            'reminder_time' => $this->reminder_time,
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
}