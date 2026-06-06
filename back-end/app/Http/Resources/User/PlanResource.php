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
            'limits' => [
                'max_active_habits' => $this->max_active_habits,
                'max_groups' => $this->max_groups,
                'max_freezes_per_week' => $this->max_freezes_per_week,
                'max_photos_per_log' => $this->max_photos_per_log,
                'max_pdfs_per_month' => $this->max_pdfs_per_month,
            ],
            'features' => [
                'has_advanced_analytics' => $this->has_advanced_analytics,
                'has_insights' => $this->has_insights,
                'has_xp_booster' => $this->has_xp_booster,
                'has_unlimited_photos' => $this->has_unlimited_photos,
            ],
            'pricing' => [
                'monthly' => $this->price_monthly,
                'lifetime' => $this->price_lifetime,
            ],
            'created_at' => $this->created_at,
        ];
    }
}