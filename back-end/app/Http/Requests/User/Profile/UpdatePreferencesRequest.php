<?php

namespace App\Http\Requests\User\Profile;

use App\Enums\Theme;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePreferencesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'timezone' => ['sometimes', 'string', 'timezone'], // Native Laravel timezone validation
            'theme' => ['sometimes', Rule::enum(Theme::class)],
            'language' => ['sometimes', 'string', 'max:10'],
            'date_format' => ['sometimes', 'string', 'max:20'],
        ];
    }
}