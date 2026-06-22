<?php

namespace App\Http\Resources\User;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DashboardResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'habits' => $this->habits,
            'completion_percentage' => $this->completion_percentage,
            'streak_counts' => [
                'active_streaks' => $this->streak_counts->active_streaks,
                'best_streak' => $this->streak_counts->best_streak,
            ],
        ];
    }
}