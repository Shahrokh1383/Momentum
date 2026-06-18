<?php

namespace App\Http\Requests\User\Tag;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTagRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('tags', 'name')->where(fn ($query) => $query->where('user_id', $this->user()->id)),
            ],
            'color' => ['sometimes', 'string', 'hex_color'],
        ];
    }
}