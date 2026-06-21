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
            $rules['value'] = ['required', 'numeric', 'min:0'];
        }

        if ($habit->type === 'timer') {
            $rules['duration_seconds'] = ['required', 'integer', 'min:1'];
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
}