<?php

namespace App\Http\Resources\User;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HabitLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $data = [
            'id' => $this->id,
            'habit_id' => $this->habit_id,
            'logged_date' => $this->logged_date->toDateString(),
            'status' => $this->status,
            'notes' => $this->notes,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];

        if ($this->habit->type === 'numeric') {
            $data['value'] = $this->value;
        }

        if ($this->habit->type === 'timer') {
            $data['duration_seconds'] = $this->duration_seconds;
        }

        if ($this->habit->type === 'checklist') {
            $data['checklist_logs'] = $this->checklistLogs->map(fn($log) => [
                'checklist_item_id' => $log->checklist_item_id,
                'title' => $log->checklistItem->title,
                'sort_order' => $log->checklistItem->sort_order,
                'is_checked' => $log->is_checked,
            ]);
        }

        return $data;
    }
}