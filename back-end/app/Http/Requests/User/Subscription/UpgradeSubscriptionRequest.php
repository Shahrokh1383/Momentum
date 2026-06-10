<?php

namespace App\Http\Requests\User\Subscription;

use App\Enums\PlanSlug;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpgradeSubscriptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'plan_slug' => ['required', 'string', Rule::enum(PlanSlug::class)],
            'card_number' => ['required', 'string', 'digits:16'],
        ];
    }

    public function plan(): PlanSlug
    {
        return PlanSlug::from($this->validated('plan_slug'));
    }

    public function messages(): array
    {
        return [
            'card_number.required' => 'Card number is required.',
            'card_number.digits' => 'Card number must be exactly 16 digits.',
        ];
    }
}