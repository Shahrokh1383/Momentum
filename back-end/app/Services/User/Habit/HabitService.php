<?php

namespace App\Services\User\Habit;

use App\Models\Habit\Habit;
use App\Models\User;
use App\Services\User\Subscription\PlanQuotaService;
use App\Services\User\Taxonomy\TagService;

class HabitService
{
    public function __construct(
        private PlanQuotaService $quotaService,
        private TagService $tagService
    ) {}

    public function getActiveHabits(User $user)
    {
        return $user->habits()
            ->with(['category', 'tags', 'streak', 'todayLog', 'checklistItems'])
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function getArchivedHabits(User $user)
    {
        return $user->habits()
            ->onlyArchived()
            ->with(['category', 'tags', 'streak'])
            ->orderBy('archived_at', 'desc')
            ->get();
    }

    public function createHabit(User $user, array $data): Habit
    {
        $tagsInput = $data['tags'] ?? [];
        unset($data['tags']);

        $checklistItemsInput = $data['checklist_items'] ?? [];
        unset($data['checklist_items']);

        $habit = $user->habits()->create($data);
        $this->syncTags($habit, $tagsInput, $user); // Pass $user object instead of ID
        $this->syncChecklistItems($habit, $checklistItemsInput);

        return $habit->load(['category', 'tags', 'checklistItems']);
    }

    public function getHabitById(User $user, int $id): Habit
    {
        return $user->habits()
            ->withArchived()
            ->with(['category', 'tags', 'checklistItems', 'streak'])
            ->findOrFail($id);
    }

    public function updateHabit(Habit $habit, array $data): Habit
    {
        $tagsInput = $data['tags'] ?? [];
        $hasTags = array_key_exists('tags', $data);
        unset($data['tags']);

        $checklistItemsInput = $data['checklist_items'] ?? [];
        $hasChecklistItems = array_key_exists('checklist_items', $data);
        unset($data['checklist_items']);

        $habit->update($data);

        if ($hasTags) {
            $this->syncTags($habit, $tagsInput, $habit->user);
        }

        if ($hasChecklistItems) {
            $this->syncChecklistItems($habit, $checklistItemsInput);
        }

        return $habit->load(['category', 'tags', 'checklistItems']);
    }

    public function archiveHabit(User $user, int $id): Habit
    {
        $habit = $user->habits()->findOrFail($id);

        if ($habit->archived_at !== null) {
            throw new \DomainException('Habit is already archived.');
        }

        $habit->update(['archived_at' => now()]);
        return $habit;
    }

    public function restoreHabit(User $user, int $id): Habit
    {
        $habit = $user->habits()
            ->withArchived()
            ->whereNotNull('archived_at')
            ->findOrFail($id);

        $this->quotaService->ensureLimitNotExceeded($user, 'habits', 'max_active_habits');

        $habit->update(['archived_at' => null]);
        return $habit->load(['category', 'tags', 'checklistItems', 'streak']);
    }

    public function deleteHabit(User $user, int $id): void
    {
        $habit = $user->habits()
            ->withArchived()
            ->findOrFail($id);

        $habit->forceDelete();
    }

    /**
     * Delegates tag resolution to TagService to prevent domain logic leakage.
     */
    private function syncTags(Habit $habit, array $tagsInput, User $user): void
    {
        $tagIds = [];

        foreach ($tagsInput as $tagInput) {
            $tagModel = $this->tagService->resolveTagInput($user, $tagInput);
            if ($tagModel) {
                $tagIds[] = $tagModel->id;
            }
        }

        $habit->tags()->sync(array_unique($tagIds));
    }

    private function syncChecklistItems(Habit $habit, array $items): void
    {
        $habit->checklistItems()->delete();

        foreach ($items as $index => $item) {
            $habit->checklistItems()->create([
                'title' => $item['title'],
                'sort_order' => $item['sort_order'] ?? $index,
            ]);
        }
    }
}