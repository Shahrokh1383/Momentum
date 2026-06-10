<?php

namespace App\Http\Resources\User;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SubscriptionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'plan' => $this->whenLoaded('planDetails', fn () => new PlanResource($this->planDetails)),
            'plan_slug' => $this->plan?->value,
            'status' => $this->status?->value,
            'starts_at' => $this->starts_at,
            'expires_at' => $this->expires_at,
            'cancelled_at' => $this->cancelled_at,
            'transaction_ref' => $this->transaction_ref,
            'created_at' => $this->created_at,
        ];
    }
}