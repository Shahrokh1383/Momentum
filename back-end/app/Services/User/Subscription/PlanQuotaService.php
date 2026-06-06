<?php

namespace App\Services\User\Subscription;

use App\Enums\PlanSlug;
use App\Models\Plan;
use App\Models\User;

class PlanQuotaService
{
    public function getUserPlan(User $user): ?Plan
    {
        $planSlug = $user->subscription?->plan;

        if (! $planSlug) {
            return Plan::where('slug', PlanSlug::FREE->value)->first();
        }

        return Plan::where('slug', $planSlug->value)->first();
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