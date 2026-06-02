<?php

namespace App\Http\Resources\User;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'avatar' => $this->avatar,
            'role' => $this->role->value,
            'email_verified_at' => $this->email_verified_at,
            'profile_visibility' => $this->profile_visibility->value,
            'is_premium' => $this->is_premium,
            'subscription' => [
                'plan' => $this->whenLoaded('subscription', $this->subscription?->plan->value),
                'status' => $this->whenLoaded('subscription', $this->subscription?->status->value),
                'expires_at' => $this->whenLoaded('subscription', $this->subscription?->expires_at),
            ],
            'created_at' => $this->created_at,
        ];
    }
}