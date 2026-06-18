<?php

namespace App\Http\Resources\User;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'color' => $this->color,
            'icon' => $this->icon,
            'sort_order' => $this->sort_order,
            'is_default' => $this->is_default,
            'created_at' => $this->created_at,
        ];
    }
}