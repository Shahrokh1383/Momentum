<?php

namespace App\Observers;

use App\Models\Habit\Habit;
use App\Models\Habit\HabitLog;
use App\Services\User\Streak\StreakService;

class HabitLogObserver
{
    public function __construct(
        private StreakService $streakService
    ) {}

    public function created(HabitLog $log): void
    {
        $this->recalculateForHabit($log);
    }

    public function updated(HabitLog $log): void
    {
        $this->recalculateForHabit($log);
    }

    public function deleted(HabitLog $log): void
    {
        $this->recalculateForHabit($log);
    }

    private function recalculateForHabit(HabitLog $log): void
    {
        if ($log->habit_id) {
            $habit = Habit::find($log->habit_id);
            if ($habit) {
                $this->streakService->recalculate($habit);
            }
        }
    }
}