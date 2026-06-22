<?php

namespace App\Services\User\Habit;

use App\Exceptions\QuotaExceededException;
use App\Models\Habit;
use App\Models\Streak;
use App\Models\StreakFreeze;
use App\Models\User;
use App\Services\User\Subscription\PlanQuotaService;
use Carbon\Carbon;

class StreakService
{
    public function __construct(
        private PlanQuotaService $quotaService
    ) {}

    /**
     * Calculate or recalculate streak for a habit (full from-scratch).
     */
    public function calculate(Habit $habit): Streak
    {
        return $this->recalculate($habit);
    }

    /**
     * Recalculate streak from scratch. Called by observers on log changes.
     */
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

    /**
     * Apply a freeze to a specific date for a habit.
     * Enforces weekly freeze quota then recalculates streak.
     */
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

    /**
     * Walk backwards from most recent completed log, counting consecutive due-days.
     * Frozen days and non-due days are skipped without breaking the streak.
     */
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

            if (isset($frozenSet[$key])) {
                $cursor->subDay();
                continue;
            }

            if (!$habit->isDueToday($cursor)) {
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

    /**
     * Check if the user has exceeded their weekly freeze quota.
     */
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