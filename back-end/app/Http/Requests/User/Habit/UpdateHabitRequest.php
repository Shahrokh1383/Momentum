<?php

namespace App\Http\Requests\User\Habit;

use App\Enums\PlanSlug;
use App\Exceptions\FeatureLockedException;
use App\Services\User\Subscription\PlanQuotaService;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateHabitRequest extends FormRequest
{
    public function __construct(
        private PlanQuotaService $quotaService
    ) {}

    public function authorize(): bool
    {
        return $this->route('habit')->user_id === $this->user()->id;
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'category_id' => [
                'nullable', 
                'integer', 
                Rule::exists('categories', 'id')->where('user_id', $this->user()->id)
            ],
            'type' => ['sometimes', 'string', Rule::in(['boolean', 'numeric', 'timer', 'checklist'])],
            'schedule' => ['nullable', 'array'],
            'schedule.reminders' => ['nullable', 'array'],
            'schedule.reminders.*' => ['date_format:H:i'],
            'due_days_of_week' => ['nullable', 'string', 'regex:/^[1-7](,[1-7])*$/'],
            'frequency' => ['sometimes', 'string', Rule::in(['daily', 'weekly', 'custom'])],
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
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $user = $this->user();

            // 1. Enforce Habit Type Restriction (if type is being updated)
            if ($this->has('type')) {
                $type = $this->input('type');
                
                if (!$this->quotaService->isHabitTypeAllowed($user, $type)) {
                    $plan = $this->quotaService->getPlan($user);
                    $requiredPlan = $this->quotaService->getUpgradeRequiredPlan($plan);
                    throw new FeatureLockedException('habit_type:' . $type, $requiredPlan ?? PlanSlug::EXPERT);
                }

                // When switching to checklist, items must be provided
                if ($type === 'checklist') {
                    $items = $this->input('checklist_items', []);
                    if (!is_array($items) || count($items) === 0) {
                        $validator->errors()->add(
                            'checklist_items',
                            'At least one checklist item is required when type is checklist.'
                        );
                    }
                }
            }

            // 2. Enforce Reminders Restriction (basic + smart, single gate)
            $hasBasicReminder = $this->has('reminder_time') && $this->filled('reminder_time');
            $hasScheduleReminders = $this->has('schedule.reminders');
            $hasSmartReminders = $hasScheduleReminders 
                && is_array($this->input('schedule.reminders', [])) 
                && count($this->input('schedule.reminders', [])) > 1;

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