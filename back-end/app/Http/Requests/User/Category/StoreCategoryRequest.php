<?php

namespace App\Http\Requests\User\Category;

use App\Services\User\Subscription\PlanQuotaService;
use Illuminate\Foundation\Http\FormRequest;

class StoreCategoryRequest extends FormRequest
{
    public function __construct(
        private PlanQuotaService $quotaService
    ) {}

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'color' => ['required', 'string', 'hex_color'],
            'icon' => ['required', 'string', 'max:50'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function () {
            $this->quotaService->ensureLimitNotExceeded(
                $this->user(),
                'categories',
                'max_categories'
            );
        });
    }
}