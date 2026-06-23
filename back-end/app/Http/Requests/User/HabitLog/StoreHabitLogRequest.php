<?php

namespace App\Http\Requests\User\HabitLog;

use App\Models\Habit;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreHabitLogRequest extends FormRequest
{
    private ?Habit $habit = null;

    private function getHabit(): ?Habit
    {
        if ($this->habit !== null) {
            return $this->habit;
        }

        return $this->habit = Habit::where('id', $this->route('id'))
            ->where('user_id', $this->user()->id)
            ->first();
    }

    public function authorize(): bool
    {
        return $this->getHabit() !== null;
    }

    public function rules(): array
    {
        $habit = $this->getHabit();

        if (!$habit) {
            return [];
        }

        $rules = [
            'logged_date' => ['required', 'date'],
            'notes' => ['nullable', 'string'],
        ];

        if ($habit->type === 'numeric') {
            $todaySum = $habit->logs()
                ->whereDate('logged_date', now()->timezone($habit->timezone ?? 'UTC'))
                ->sum('value');
            $remaining = (float) $habit->target_value - (float) $todaySum;

            $rules['value'] = [
                'required', 'numeric', 'min:0',
                function ($attribute, $value, $fail) use ($remaining) {
                    if ($remaining <= 0) {
                        $fail('You have already reached the numeric target for today.');
                    } elseif ($value > $remaining) {
                        $fail("The logged value cannot exceed the remaining target of {$remaining}.");
                    }
                },
            ];
        }

        if ($habit->type === 'timer') {
            $targetSeconds = $this->convertToSeconds($habit->target_value, $habit->unit);
            $targetLabel = (int) $habit->target_value . ' ' . ($habit->unit ?? 'seconds');

            $rules['duration_seconds'] = [
                'required', 'integer', "min:{$targetSeconds}",
                function ($attribute, $value, $fail) use ($targetSeconds, $targetLabel) {
                    if ($value < $targetSeconds) {
                        $fail("Timer must reach the target of {$targetLabel} before it can be saved.");
                    }
                },
            ];
        }

        if ($habit->type === 'checklist') {
            $rules['checklist_logs'] = ['required', 'array', 'min:1'];
            $rules['checklist_logs.*.checklist_item_id'] = [
                'required', 'integer', 'distinct',
                Rule::exists('habit_checklist_items', 'id')->where('habit_id', $habit->id),
            ];
            $rules['checklist_logs.*.is_checked'] = ['required', 'boolean'];
        }

        return $rules;
    }

    /**
     * Convert a target value with its unit into total seconds.
     */
    private function convertToSeconds(?string $targetValue, ?string $unit): int
    {
        $value = (float) ($targetValue ?? 0);

        return (int) match ($unit) {
            'hours'   => $value * 3600,
            'minutes' => $value * 60,
            default   => $value, // seconds
        };
    }
}