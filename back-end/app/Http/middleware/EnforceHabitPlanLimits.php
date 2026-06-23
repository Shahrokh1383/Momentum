<?php

namespace App\Http\Middleware;

use App\Enums\Billing\PlanSlug;
use App\Exceptions\FeatureLockedException;
use App\Services\User\Billing\PlanQuotaService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnforceHabitPlanLimits
{
    public function __construct(
        private PlanQuotaService $quotaService
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $isStore = $request->isMethod('POST');

        // 1. Quota check — only on store (creating a new habit)
        if ($isStore) {
            $this->quotaService->ensureLimitNotExceeded($user, 'habits', 'max_active_habits');
        }

        // 2. Habit type restriction
        $type = $request->input('type');
        if ($type) {
            if (!$this->quotaService->isHabitTypeAllowed($user, $type)) {
                $requiredPlan = $this->quotaService->getMinimumPlanForHabitType($type) ?? PlanSlug::EXPERT;
                throw new FeatureLockedException('habit_type:' . $type, $requiredPlan);
            }
        }

        // 3. Smart reminders restriction
        $hasBasicReminder = $request->filled('reminder_time');
        $scheduleReminders = $request->input('schedule.reminders', []);
        $hasSmartReminders = is_array($scheduleReminders) && count($scheduleReminders) > 1;

        if ($hasBasicReminder || $hasSmartReminders) {
            if (!$this->quotaService->isFeatureEnabled($user, 'has_smart_reminders')) {
                $requiredPlan = $this->quotaService->getMinimumPlanForFeature('has_smart_reminders') ?? PlanSlug::EXPERT;
                throw new FeatureLockedException('reminders', $requiredPlan);
            }
        }

        return $next($request);
    }
}