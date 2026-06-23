<?php

namespace App\Services\User\Taxonomy;

use App\Models\Taxonomy\Tag;
use App\Models\User;
use Illuminate\Support\Str;

class TagService
{
    public function getTags(User $user)
    {
        return $user->tags()->orderBy('name')->get();
    }

    public function createTag(User $user, array $data): Tag
    {
        return $user->tags()->create($data);
    }

    public function updateTag(Tag $tag, array $data): Tag
    {
        $tag->update($data);
        return $tag;
    }

    public function deleteTag(User $user, int $tagId): void
    {
        // findOrFail guarantees the tag belongs to the user (prevents IDOR vulnerabilities)
        $tag = $user->tags()->findOrFail($tagId);
        $tag->delete();
    }

    public function getAutocompleteTags(User $user, string $query)
    {
        return $user->tags()
            ->where('name', 'like', "%{$query}%")
            ->limit(10)
            ->get();
    }

    /**
     * Resolves tag input for Habit synchronization.
     * If numeric, finds existing tag owned by user. If string, creates/finds by slug.
     */
    public function resolveTagInput(User $user, string|int $tagInput): ?Tag
    {
        if (is_numeric($tagInput)) {
            return $user->tags()->find($tagInput); 
        }

        $slug = Str::slug($tagInput);
        
        // Relies on Tag model's booted event for slug generation (DRY)
        return Tag::firstOrCreate(
            ['user_id' => $user->id, 'slug' => $slug],
            ['name' => $tagInput, 'color' => '#6B7280']
        );
    }
}