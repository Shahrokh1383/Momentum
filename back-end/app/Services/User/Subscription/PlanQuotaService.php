<?php

namespace App\Services\User\Subscription;

use App\Models\Plan;
use App\Models\User;

class PlanQuotaService
{
    /**
     * Dynamically retrieves the user's active plan from the database.
     * Relies on the User model's 'active_plan' accessor to ensure we only 
     * return a plan if the subscription is truly active and not expired.
     */
    public function getUserPlan(User $user): ?Plan
    {
        $activePlanSlug = $user->active_plan;

        return Plan::where('slug', $activePlanSlug)->first();
    }

    /**
     * Stub: Check if user can create a new habit.
     * TODO: Integrate with Habit module to compare $currentHabitCount.
     */
    public function canCreateHabit(User $user, int $currentHabitCount = 0): bool
    {
        $limit = $this->getUserPlan($user)?->max_active_habits ?? 5;

        return $currentHabitCount < $limit;
    }

    /**
     * Stub: Check if user can create a new category.
     * TODO: Integrate with Category module to compare $currentCategoryCount.
     */
    public function canCreateCategory(User $user, int $currentCategoryCount = 0): bool
    {
        $limit = $this->getUserPlan($user)?->max_categories ?? 0;

        return $currentCategoryCount < $limit;
    }

    /**
     * Stub: Check if user can use a specific habit type.
     * TODO: Integrate with Habit module when creating/updating habits.
     */
    public function canUseHabitType(User $user, string $type): bool
    {
        $plan = $this->getUserPlan($user);
        $allowedTypes = $plan?->allowed_habit_types;

        // If no restrictions are defined for the plan, allow all types
        if (empty($allowedTypes)) {
            return true;
        }

        // Parse comma-separated string from database into an array
        if (is_string($allowedTypes)) {
            $allowedTypes = array_map('trim', explode(',', $allowedTypes));
        }

        return in_array($type, $allowedTypes, true);
    }

    /**
     * Stub: Check if user can upload a photo.
     * TODO: Integrate with Photo/Log module to compare $currentPhotoCount.
     */
    public function canUploadPhoto(User $user, int $currentPhotoCount = 0): bool
    {
        $plan = $this->getUserPlan($user);

        if ($plan?->has_unlimited_photos) {
            return true;
        }

        $limit = $plan?->max_photos_per_log ?? 1;

        return $currentPhotoCount < $limit;
    }

    /**
     * Stub: Check if user can create a group.
     * TODO: Integrate with Group module to compare $currentGroupCount.
     */
    public function canCreateGroup(User $user, int $currentGroupCount = 0): bool
    {
        $limit = $this->getUserPlan($user)?->max_groups ?? 1;

        return $currentGroupCount < $limit;
    }

    /**
     * Stub: Check if user can upload a PDF.
     * TODO: Integrate with PDF module to compare $currentPdfCount.
     */
    public function canUploadPdf(User $user, int $currentPdfCount = 0): bool
    {
        $limit = $this->getUserPlan($user)?->max_pdfs_per_month ?? 1;

        return $currentPdfCount < $limit;
    }

    public function hasFeature(User $user, string $feature): bool
    {
        $plan = $this->getUserPlan($user);

        return match ($feature) {
            'advanced_analytics' => $plan?->has_advanced_analytics ?? false,
            'insights' => $plan?->has_insights ?? false,
            'xp_booster' => $plan?->has_xp_booster ?? false,
            'unlimited_photos' => $plan?->has_unlimited_photos ?? false,
            default => false,
        };
    }

    public function getFreezeLimit(User $user): int
    {
        return $this->getUserPlan($user)?->max_freezes_per_week ?? 1;
    }
}