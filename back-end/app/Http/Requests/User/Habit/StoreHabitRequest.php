<?php

namespace App\Http\Requests\User\Habit;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreHabitRequest extends FormRequest
{
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

        if ($this->input('type') === 'checklist') {
            $rules['checklist_items'] = ['required', 'array', 'min:1'];
            $rules['checklist_items.*.title'] = ['required', 'string', 'max:255'];
        }

        return $rules;
    }
}