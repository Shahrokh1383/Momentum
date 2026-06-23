<?php

namespace App\Http\Requests\User\Profile;

use App\Enums\Identity\ProfileVisibility;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'bio' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'profile_visibility' => ['sometimes', Rule::enum(ProfileVisibility::class)],
        ];
    }
}