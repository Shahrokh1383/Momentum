<?php

namespace App\Services\User\Streak;

use App\Exceptions\QuotaExceededException;
use App\Models\Habit\Habit;
use App\Models\Streak\Streak;
use App\Models\Streak\StreakFreeze;
use App\Models\User;
use App\Services\User\Subscription\PlanQuotaService;
use Carbon\Carbon;

class StreakService
{
    public function __construct(
        private PlanQuotaService $quotaService
    ) {}

    public function calculate(Habit $habit): Streak
    {
        return $this->recalculate($habit);
    }

    public function recalculate(Habit $habit): Streak
    {
        $result = $this->performCalculation($habit);

        return Streak::updateOrCreate(
            ['habit_id' => $habit->id],
            [
                'user_id' => $habit->user_id,
                'current_streak' => $result['current'],
                'longest_streak' => max($result['current'], $habit->streak?->longest_streak ?? 0),
                'last_log_date' => $result['last_date'],
            ]
        );
    }

    public function applyFreeze(Habit $habit, string $frozenDate, ?string $reason = null): StreakFreeze
    {
        $this->ensureFreezeQuotaNotExceeded($habit->user, Carbon::parse($frozenDate));

        $freeze = StreakFreeze::create([
            'user_id' => $habit->user_id,
            'habit_id' => $habit->id,
            'frozen_date' => $frozenDate,
            'used_at' => now(),
            'reason' => $reason,
        ]);

        $this->recalculate($habit);

        return $freeze;
    }

    private function performCalculation(Habit $habit): array
    {
        $completedDates = $habit->logs()
            ->where('status', 'completed')
            ->orderByDesc('logged_date')
            ->pluck('logged_date')
            ->map(fn ($date) => $date->toDateString())
            ->values()
            ->all();

        if (empty($completedDates)) {
            return ['current' => 0, 'last_date' => null];
        }

        $frozenSet = $habit->streakFreezes()
            ->pluck('frozen_date')
            ->map(fn ($date) => $date->toDateString())
            ->flip()
            ->toArray();

        $completedSet = array_flip($completedDates);
        $lastDate = Carbon::parse($completedDates[0]);
        $currentStreak = 1;
        $cursor = $lastDate->copy()->subDay();

        while (true) {
            $key = $cursor->toDateString();

            if (!$habit->isDueToday($cursor)) {
                $cursor->subDay();
                continue;
            }

            if (isset($frozenSet[$key])) {
                $currentStreak++;
                $cursor->subDay();
                continue;
            }

            if (isset($completedSet[$key])) {
                $currentStreak++;
                $cursor->subDay();
                continue;
            }

            break;
        }

        return ['current' => $currentStreak, 'last_date' => $lastDate->toDateString()];
    }

    private function ensureFreezeQuotaNotExceeded(User $user, Carbon $date): void
    {
        $limit = $this->quotaService->getLimit($user, 'max_freezes_per_week');

        if ($limit === -1) {
            return;
        }

        $used = $user->streakFreezes()
            ->whereBetween('frozen_date', [$date->copy()->startOfWeek(), $date->copy()->endOfWeek()])
            ->count();

        if ($used >= $limit) {
            $plan = $this->quotaService->getPlan($user);
            throw new QuotaExceededException(
                resource: 'streak_freezes',
                limit: $limit,
                used: $used,
                upgradeRequired: $this->quotaService->getUpgradeRequiredPlan($plan)
            );
        }
    }
}