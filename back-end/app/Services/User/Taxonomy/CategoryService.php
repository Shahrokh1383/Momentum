<?php

namespace App\Services\User\Taxonomy;

use App\Models\Taxonomy\Category;
use App\Models\Identity\User;
use App\Services\User\Billing\PlanQuotaService;

class CategoryService
{
    public function __construct(
        private PlanQuotaService $quotaService
    ) {}

    public function getCategories(User $user)
    {
        return $user->categories()
            ->orderBy('sort_order')
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function createCategory(User $user, array $data): Category
    {
        $this->quotaService->ensureLimitNotExceeded(
            $user,
            'categories',
            'max_categories',
            includeTrashed: true
        );

        return $user->categories()->create($data);
    }

    public function updateCategory(Category $category, array $data): Category
    {
        $category->update($data);
        // Removed $category->fresh() to avoid unnecessary DB query (KIIS principle)
        return $category; 
    }

    public function deleteCategory(User $user, int $categoryId): void
    {
        $category = $user->categories()->findOrFail($categoryId);
        $this->ensureNotDefault($category);

        $category->delete();
    }

    public function getTrashedCategories(User $user)
    {
        return $user->categories()
            ->onlyTrashed()
            ->orderBy('deleted_at', 'desc')
            ->get();
    }

    public function restoreCategory(User $user, int $categoryId): Category
    {
        $this->quotaService->ensureLimitNotExceeded(
            $user,
            'categories',
            'max_categories',
            includeTrashed: false
        );

        $category = $user->categories()->withTrashed()->findOrFail($categoryId);
        $category->restore();

        return $category;
    }

    public function forceDeleteCategory(User $user, int $categoryId): void
    {
        $category = $user->categories()->withTrashed()->findOrFail($categoryId);
        $this->ensureNotDefault($category);

        $category->forceDelete();
    }

    /**
     * Enforces Domain Rule: Default categories are immutable regarding deletion.
     * Throws DomainException instead of generic InvalidArgumentException.
     */
    private function ensureNotDefault(Category $category): void
    {
        if ($category->is_default) {
            throw new \DomainException('Default categories cannot be deleted or permanently removed.');
        }
    }
}