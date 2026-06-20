<?php

namespace App\Services\User;

use App\Exceptions\QuotaExceededException;
use App\Models\Category;
use App\Models\User;
use App\Services\User\Subscription\PlanQuotaService;

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
        return $user->categories()->create($data);
    }

    public function updateCategory(Category $category, array $data): Category
    {
        $category->update($data);
        return $category->fresh();
    }

    public function deleteCategory(User $user, int $categoryId): void
    {
        // Scoping through $user->categories() inherently ensures ownership, 
        // eliminating the need for manual user_id checks.
        $category = $user->categories()->findOrFail($categoryId);

        if ($category->is_default) {
            throw new \InvalidArgumentException('Default categories cannot be deleted.');
        }

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
        // 1. Enforce business rule: Quota limit
        $this->quotaService->ensureLimitNotExceeded(
            $user,
            'categories',
            'max_categories'
        );

        // 2. Execute domain action
        $category = $user->categories()->withTrashed()->findOrFail($categoryId);
        $category->restore();

        return $category;
    }

    public function forceDeleteCategory(User $user, int $categoryId): void
    {
        $category = $user->categories()->withTrashed()->findOrFail($categoryId);

        if ($category->is_default) {
            throw new \InvalidArgumentException('Default categories cannot be permanently deleted.');
        }

        $category->forceDelete();
    }
}