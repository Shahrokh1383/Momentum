<?php

namespace App\Http\Requests\User\HabitLog;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateHabitLogRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->route('habit_log')->user_id === $this->user()->id;
    }

    public function rules(): array
    {
        $type = $this->route('habit_log')->habit->type;

        $rules = [
            'status' => ['sometimes', 'string', Rule::in(['pending', 'completed', 'missed', 'skipped'])],
            'notes' => ['nullable', 'string'],
        ];

        if ($type === 'numeric') {
            $rules['value'] = ['sometimes', 'nullable', 'numeric', 'min:0'];
        }

        if ($type === 'timer') {
            $rules['duration_seconds'] = ['sometimes', 'nullable', 'integer', 'min:1'];
        }

        if ($type === 'checklist') {
            $rules['checklist_logs'] = ['sometimes', 'nullable', 'array'];
            $rules['checklist_logs.*.checklist_item_id'] = [
                'required_with:checklist_logs', 'integer', 'distinct',
                Rule::exists('habit_checklist_items', 'id')->where('habit_id', $this->route('habit_log')->habit_id),
            ];
            $rules['checklist_logs.*.is_checked'] = ['required_with:checklist_logs', 'boolean'];
        }

        return $rules;
    }
}