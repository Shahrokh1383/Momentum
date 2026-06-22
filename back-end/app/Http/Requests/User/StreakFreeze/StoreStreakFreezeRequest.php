<?php

namespace App\Http\Requests\User\StreakFreeze;

use App\Models\Habit;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStreakFreezeRequest extends FormRequest
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

        return [
            'frozen_date' => [
                'required',
                'date',
                'before_or_equal:today',
                Rule::unique('streak_freezes')->where(fn ($q) => $q->where('habit_id', $habit->id)),
            ],
            'reason' => ['nullable', 'string'],
        ];
    }
}