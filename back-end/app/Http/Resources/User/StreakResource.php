<?php

namespace App\Http\Resources\User;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StreakResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'current_streak' => $this->current_streak,
            'longest_streak' => $this->longest_streak,
            'last_log_date' => $this->last_log_date?->toDateString(),
        ];
    }
}