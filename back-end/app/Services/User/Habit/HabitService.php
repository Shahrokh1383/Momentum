<?php

namespace App\Services\User\Habit;

use App\Models\Habit;
use App\Models\Tag;
use App\Models\User;
use App\Services\User\Subscription\PlanQuotaService;
use Illuminate\Support\Str;

class HabitService
{
    public function __construct(
        private PlanQuotaService $quotaService
    ) {}

    /**
     * Fetch active habits for a user.
     */
    public function getActiveHabits(User $user)
    {
        return $user->habits()
            ->with(['category', 'tags', 'streak', 'todayLog', 'checklistItems'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->filter(fn (Habit $habit) => $habit->isDueToday())
            ->values();
    }

    /**
     * Fetch archived habits for a user.
     */
    public function getArchivedHabits(User $user)
    {
        return $user->habits()
            ->onlyArchived()
            ->with(['category', 'tags', 'streak'])
            ->orderBy('archived_at', 'desc')
            ->get();
    }

    /**
     * Create a new habit and sync tags + checklist items.
     */
    public function createHabit(User $user, array $data): Habit
    {
        $tagsInput = $data['tags'] ?? [];
        unset($data['tags']);

        $checklistItemsInput = $data['checklist_items'] ?? [];
        unset($data['checklist_items']);

        $habit = $user->habits()->create($data);
        $this->syncTags($habit, $tagsInput, $user->id);
        $this->syncChecklistItems($habit, $checklistItemsInput);

        return $habit->load(['category', 'tags', 'checklistItems']);
    }

    /**
     * Fetch a single habit (including archived).
     */
    public function getHabitById(User $user, int $id): Habit
    {
        return $user->habits()
            ->withArchived()
            ->with(['category', 'tags', 'checklistItems', 'streak'])
            ->findOrFail($id);
    }

    /**
     * Update an existing habit and conditionally sync tags + checklist items.
     */
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
            $this->syncTags($habit, $tagsInput, $habit->user_id);
        }

        if ($hasChecklistItems) {
            $this->syncChecklistItems($habit, $checklistItemsInput);
        }

        return $habit->load(['category', 'tags', 'checklistItems']);
    }

    /**
     * Archive a habit.
     */
    public function archiveHabit(User $user, int $id): Habit
    {
        $habit = $user->habits()->findOrFail($id);

        if ($habit->archived_at !== null) {
            throw new \DomainException('Habit is already archived.');
        }

        $habit->update(['archived_at' => now()]);
        return $habit;
    }

    /**
     * Restore an archived habit (enforces quota).
     */
    public function restoreHabit(User $user, int $id): Habit
    {
        $habit = $user->habits()
            ->withArchived()
            ->whereNotNull('archived_at')
            ->findOrFail($id);

        // Enforce quota before restoring
        $this->quotaService->ensureLimitNotExceeded($user, 'habits', 'max_active_habits');

        $habit->update(['archived_at' => null]);
        return $habit->load(['category', 'tags', 'checklistItems', 'streak']);
    }

    /**
     * Permanently delete a habit.
     */
    public function deleteHabit(User $user, int $id): void
    {
        $habit = $user->habits()
            ->withArchived()
            ->findOrFail($id);

        $habit->forceDelete();
    }

    /**
     * Sync tags for a habit. (DRY Principle applied)
     * If a tag is numeric, it links an existing ID.
     * If it's a string, it creates a new tag (relying on the Tag model's booted slug generator).
     */
    private function syncTags(Habit $habit, array $tagsInput, int $userId): void
    {
        $tagIds = [];

        foreach ($tagsInput as $tag) {
            if (is_numeric($tag)) {
                $tagModel = Tag::where('id', $tag)->where('user_id', $userId)->first();
                if ($tagModel) {
                    $tagIds[] = $tagModel->id;
                }
            } else {
                // Generate slug to prevent duplicate tag names with different cases
                $slug = Str::slug($tag);
                
                // firstOrCreate will trigger the Tag model's booted creating event 
                // to set the slug if it doesn't exist, fulfilling DRY.
                $tagModel = Tag::firstOrCreate(
                    ['user_id' => $userId, 'slug' => $slug],
                    ['name' => $tag, 'color' => '#6B7280']
                );
                $tagIds[] = $tagModel->id;
            }
        }

        $habit->tags()->sync(array_unique($tagIds));
    }

    /**
     * Replace all checklist items for a habit.
     * Uses delete-all-recreate (same pattern as tag sync — atomic replacement).
     */
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