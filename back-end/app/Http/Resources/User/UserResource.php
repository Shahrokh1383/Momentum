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
            'active_plan' => $this->active_plan,
            'subscription' => $this->whenLoaded('subscription', fn () => new SubscriptionResource($this->subscription)),
            'created_at' => $this->created_at,
        ];
    }
}