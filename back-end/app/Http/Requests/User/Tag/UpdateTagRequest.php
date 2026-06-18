<?php

namespace App\Http\Requests\User\Tag;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTagRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->route('tag')->user_id === $this->user()->id;
    }

    public function rules(): array
    {
        return [
            'name' => [
                'sometimes',
                'string',
                'max:255',
                Rule::unique('tags', 'name')
                    ->ignore($this->route('tag')->id)
                    ->where(fn ($query) => $query->where('user_id', $this->user()->id)),
            ],
            'color' => ['sometimes', 'string', 'hex_color'],
        ];
    }
}