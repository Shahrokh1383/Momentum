<?php

namespace App\Http\Requests\User\Habit;

use App\Enums\PlanSlug;
use App\Exceptions\FeatureLockedException;
use App\Services\User\Subscription\PlanQuotaService;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreHabitRequest extends FormRequest
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
        $rules = [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'category_id' => [
                'nullable', 
                'integer', 
                Rule::exists('categories', 'id')->where('user_id', $this->user()->id)
            ],
            'type' => ['required', 'string', Rule::in(['boolean', 'numeric', 'timer', 'checklist'])],
            'schedule' => ['nullable', 'array'],
            'schedule.reminders' => ['nullable', 'array'],
            'schedule.reminders.*' => ['date_format:H:i'],
            'due_days_of_week' => ['nullable', 'string', 'regex:/^[1-7](,[1-7])*$/'],
            'frequency' => ['required', 'string', Rule::in(['daily', 'weekly', 'custom'])],
            'reminder_time' => ['nullable', 'date_format:H:i'],
            'timezone' => ['sometimes', 'string', 'timezone'],
            'target_value' => ['nullable', 'numeric', 'min:0'],
            'unit' => ['nullable', 'string', 'max:50'],
            'is_active' => ['sometimes', 'boolean'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['required'],
            'checklist_items' => ['nullable', 'array'],
            'checklist_items.*.title' => ['required_with:checklist_items', 'string', 'max:255'],
            'checklist_items.*.sort_order' => ['nullable', 'integer', 'min:0'],
        ];

        // Checklist type requires at least one item
        if ($this->input('type') === 'checklist') {
            $rules['checklist_items'] = ['required', 'array', 'min:1'];
            $rules['checklist_items.*.title'] = ['required', 'string', 'max:255'];
        }

        return $rules;
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function () {
            $user = $this->user();

            // 1. Enforce Active Habit Quota
            $this->quotaService->ensureLimitNotExceeded($user, 'habits', 'max_active_habits');

            // 2. Enforce Habit Type Restriction
            $type = $this->input('type', 'boolean');
            if (!$this->quotaService->isHabitTypeAllowed($user, $type)) {
                $plan = $this->quotaService->getPlan($user);
                $requiredPlan = $this->quotaService->getUpgradeRequiredPlan($plan);
                throw new FeatureLockedException('habit_type:' . $type, $requiredPlan ?? PlanSlug::EXPERT);
            }

            // 3. Enforce Reminders Restriction (basic + smart, single gate)
            $hasBasicReminder = $this->filled('reminder_time');
            $scheduleReminders = $this->input('schedule.reminders', []);
            $hasSmartReminders = is_array($scheduleReminders) && count($scheduleReminders) > 1;

            if ($hasBasicReminder || $hasSmartReminders) {
                if (!$this->quotaService->isFeatureEnabled($user, 'has_smart_reminders')) {
                    $plan = $this->quotaService->getPlan($user);
                    $requiredPlan = $this->quotaService->getUpgradeRequiredPlan($plan);
                    throw new FeatureLockedException('reminders', $requiredPlan ?? PlanSlug::EXPERT);
                }
            }
        });
    }
}