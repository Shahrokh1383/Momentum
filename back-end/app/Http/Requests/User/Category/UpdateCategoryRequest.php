<?php

namespace App\Http\Requests\User\Category;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->route('category')->user_id === $this->user()->id;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'color' => ['sometimes', 'string', 'hex_color'],
            'icon' => ['sometimes', 'string', 'max:50'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}