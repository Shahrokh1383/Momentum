<?php

namespace App\Http\Resources\User;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PlanResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug?->value,
            'duration_months' => $this->duration_months,
            'limits' => [
                'max_active_habits' => $this->max_active_habits,
                'max_groups' => $this->max_groups,
                'max_categories' => $this->max_categories,
                'max_freezes_per_week' => $this->max_freezes_per_week,
                'max_photos_per_log' => $this->max_photos_per_log,
                'max_pdfs_per_month' => $this->max_pdfs_per_month,
                'allowed_habit_types' => explode(',', $this->allowed_habit_types),
            ],
            'features' => [
                'has_advanced_analytics' => $this->has_advanced_analytics,
                'has_insights' => $this->has_insights,
                'has_predictive_insights' => $this->has_predictive_insights,
                'has_smart_reminders' => $this->has_smart_reminders,
                'has_xp_booster' => $this->has_xp_booster,
                'xp_multiplier' => (float) $this->xp_multiplier,
            ],
            'pricing' => [
                'monthly' => $this->price_monthly,
                'yearly' => $this->price_yearly,
            ],
            'created_at' => $this->created_at,
        ];
    }
}