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
        // Enforce business rule: Quota limit
        // includeTrashed: true prevents the exploit (delete -> create -> restore)
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
        return $category->fresh();
    }

    public function deleteCategory(User $user, int $categoryId): void
    {
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
        // Enforce business rule: Quota limit
        // includeTrashed: false allows legitimate restore since total footprint doesn't increase
        $this->quotaService->ensureLimitNotExceeded(
            $user,
            'categories',
            'max_categories',
            includeTrashed: false
        );

        // Execute domain action
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