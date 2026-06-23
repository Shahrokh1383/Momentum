<?php

namespace App\Http\Requests\User\Subscription;

use App\Enums\Billing\PlanSlug;
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
        ];
    }

    public function plan(): PlanSlug
    {
        return PlanSlug::from($this->validated('plan_slug'));
    }
}