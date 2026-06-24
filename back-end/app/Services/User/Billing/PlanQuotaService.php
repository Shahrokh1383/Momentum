<?php

namespace App\Services\User\Billing;

use App\Enums\Billing\PlanSlug;
use App\Exceptions\FeatureLockedException;
use App\Exceptions\QuotaExceededException;
use App\Models\Billing\Plan; 
use App\Models\Identity\User;
use Illuminate\Support\Facades\Cache;

class PlanQuotaService
{
    /**
     * Get the user's effective plan.
     * Source of truth: active subscription. Falls back to plan_slug column, then FREE.
     */
    public function getPlan(User $user): Plan
    {
        if ($user->relationLoaded('plan') && $user->plan) {
            return $user->plan;
        }

        $effectiveSlug = $this->resolveEffectiveSlug($user);

        return Cache::rememberForever("plan_{$effectiveSlug->value}", function () use ($effectiveSlug) {
            return Plan::where('slug', $effectiveSlug->value)->firstOrFail();
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
     * Counts current resources for the user.
     */
    public function getUsage(User $user, string $resource, bool $includeTrashed = false, bool $includeArchived = false): int
    {
        return match ($resource) {
            'habits' => $includeArchived
                ? $user->habits()->withArchived()->count()
                : $user->habits()->count(),
            'groups' => 0,  // TODO: Replace with $user->groups()->count() when ready
            'categories' => $includeTrashed
                ? $user->categories()->withTrashed()->count()
                : $user->categories()->count(),
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
     * Parses the comma-separated allowed_habit_types column and checks membership.
     */
    public function isHabitTypeAllowed(User $user, string $type): bool
    {
        $plan = $this->getPlan($user);
        $allowedTypes = explode(',', $plan->allowed_habit_types);
        return in_array($type, $allowedTypes, true);
    }

    /**
     * Finds the minimum plan that allows a given habit type.
     * Returns null if no plan supports it (should never happen with correct seed data).
     */
    public function getMinimumPlanForHabitType(string $type): ?PlanSlug
    {
        return Cache::rememberForever("min_plan_habit_type_{$type}", function () use ($type) {
            return Plan::where('allowed_habit_types', 'LIKE', "%{$type}%")
                ->get()
                ->sortBy(fn (Plan $plan) => $plan->slug->level())
                ->first()?->slug;
        });
    }

    /**
     * Finds the minimum plan that has a given boolean feature enabled.
     * Returns null if no plan supports it.
     */
    public function getMinimumPlanForFeature(string $featureKey): ?PlanSlug
    {
        return Cache::rememberForever("min_plan_feature_{$featureKey}", function () use ($featureKey) {
            return Plan::where($featureKey, true)
                ->get()
                ->sortBy(fn (Plan $plan) => $plan->slug->level())
                ->first()?->slug;
        });
    }

    /**
     * Determines the next plan in the tier hierarchy (for quota exceeded scenarios).
     */
    public function getUpgradeRequiredPlan(Plan $currentPlan): ?PlanSlug
    {
        return match ($currentPlan->slug) {
            PlanSlug::FREE => PlanSlug::EXPERT,
            PlanSlug::EXPERT => PlanSlug::PREMIUM,
            PlanSlug::PREMIUM => null,
        };
    }

    /**
     * Enforce a limit on a resource. Throws exception if exceeded.
     */
    public function ensureLimitNotExceeded(User $user, string $resource, string $limitKey, bool $includeTrashed = false, bool $includeArchived = false): void
    {
        $limit = $this->getLimit($user, $limitKey);

        // -1 means unlimited
        if ($limit === -1) {
            return;
        }

        $used = $this->getUsage($user, $resource, $includeTrashed, $includeArchived);

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

    /**
     * Resolve the effective plan slug for a user.
     * Active subscription is the source of truth.
     */
    private function resolveEffectiveSlug(User $user): PlanSlug
    {
        if ($user->subscription?->isActive()) {
            return $user->subscription->plan;
        }

        return $user->plan_slug ?? PlanSlug::FREE;
    }
}