<?php

namespace App\Services\User\Subscription;

use App\Enums\PlanSlug;
use App\Exceptions\FeatureLockedException;
use App\Exceptions\QuotaExceededException;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

class PlanQuotaService
{
    /**
     * Get the user's effective plan, falling back to Free.
     */
    public function getPlan(User $user): Plan
    {
        // Eager load relationship if not already loaded to prevent N+1
        if ($user->relationLoaded('plan') && $user->plan) {
            return $user->plan;
        }

        $planSlug = $user->plan_slug ?? PlanSlug::FREE;

        return Cache::rememberForever("plan_{$planSlug->value}", function () use ($planSlug) {
            return Plan::where('slug', $planSlug->value)->firstOrFail();
        });
    }

    /**
     * Fetches the limit for a specific key (e.g., max_active_habits).
     * Returns -1 for unlimited.
     */
    public function getLimit(User $user, string $key): int
    {
        $plan = $this->getPlan($user);
        return (int) $plan->{$key};
    }

    /**
     * Counts current active resources for the user.
     * Extend this switch statement as you build out Habits, Categories, etc.
     */
    public function getUsage(User $user, string $resource): int
    {
        return match ($resource) {
            'habits' => $user->habits()->count(),
            'groups' => 0,  // TODO: Replace with $user->groups()->count() when ready
            'categories' => $user->categories()->withTrashed()->count(),
            default => 0,
        };
    }

    /**
     * Checks boolean feature flags (e.g., has_smart_reminders).
     */
    public function isFeatureEnabled(User $user, string $key): bool
    {
        $plan = $this->getPlan($user);
        return (bool) $plan->{$key};
    }

    /**
     * Parses the comma-separated allowed_habit_types column into an array and checks.
     */
    public function isHabitTypeAllowed(User $user, string $type): bool
    {
        $plan = $this->getPlan($user);
        $allowedTypes = explode(',', $plan->allowed_habit_types);
        return in_array($type, $allowedTypes);
    }

    /**
     * Determines the minimum plan required to unlock more resources.
     */
    public function getUpgradeRequiredPlan(Plan $currentPlan): ?PlanSlug
    {
        return match ($currentPlan->slug) {
            PlanSlug::FREE => PlanSlug::EXPERT,
            PlanSlug::EXPERT => PlanSlug::PREMIUM,
            default => null,
        };
    }

    /**
     * Enforce a limit on a resource. Throws exception if exceeded.
     */
    public function ensureLimitNotExceeded(User $user, string $resource, string $limitKey): void
    {
        $limit = $this->getLimit($user, $limitKey);
        
        // -1 means unlimited
        if ($limit === -1) {
            return;
        }

        $used = $this->getUsage($user, $resource);

        if ($used >= $limit) {
            $plan = $this->getPlan($user);
            throw new QuotaExceededException(
                resource: $resource,
                limit: $limit,
                used: $used,
                upgradeRequired: $this->getUpgradeRequiredPlan($plan)
            );
        }
    }

    /**
     * Enforce a feature flag. Throws exception if locked.
     */
    public function ensureFeatureIsEnabled(User $user, string $featureKey, PlanSlug $requiredPlan): void
    {
        if (!$this->isFeatureEnabled($user, $featureKey)) {
            throw new FeatureLockedException($featureKey, $requiredPlan);
        }
    }
}