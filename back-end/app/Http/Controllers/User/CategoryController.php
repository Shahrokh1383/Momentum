<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\Category\StoreCategoryRequest;
use App\Http\Requests\User\Category\UpdateCategoryRequest;
use App\Http\Resources\User\CategoryResource;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $categories = $request->user()->categories()
            ->orderBy('sort_order')
            ->orderBy('created_at', 'desc')
            ->get();

        return $this->successResponse(
            CategoryResource::collection($categories),
            'Categories retrieved successfully.'
        );
    }

    public function store(StoreCategoryRequest $request): JsonResponse
    {
        $category = $request->user()->categories()->create($request->validated());

        return $this->successResponse(
            new CategoryResource($category),
            'Category created successfully.',
            201
        );
    }

    public function update(UpdateCategoryRequest $request, Category $category): JsonResponse
    {
        $category->update($request->validated());

        return $this->successResponse(
            new CategoryResource($category),
            'Category updated successfully.'
        );
    }

    public function destroy(Category $category): JsonResponse
    {
        if ($category->user_id !== auth()->id()) {
            return $this->errorResponse('forbidden', 'You do not own this category.', 403);
        }

        if ($category->is_default) {
            return $this->errorResponse('forbidden', 'Default categories cannot be deleted.', 403);
        }

        // Soft delete allowed even with active habits (user can restore/move habits later)
        $category->delete();

        return $this->successResponse(null, 'Category moved to trash successfully.');
    }

    public function trashed(Request $request): JsonResponse
    {
        $categories = $request->user()->categories()
            ->onlyTrashed()
            ->orderBy('deleted_at', 'desc')
            ->get();

        return $this->successResponse(
            CategoryResource::collection($categories),
            'Trashed categories retrieved successfully.'
        );
    }

    public function restore(Request $request, int $id): JsonResponse
    {
        $category = $request->user()->categories()->withTrashed()->findOrFail($id);

        $category->restore();

        return $this->successResponse(
            new CategoryResource($category),
            'Category restored successfully.'
        );
    }

    public function forceDelete(Request $request, int $id): JsonResponse
    {
        $category = $request->user()->categories()->withTrashed()->findOrFail($id);

        if ($category->is_default) {
            return $this->errorResponse('forbidden', 'Default categories cannot be permanently deleted.', 403);
        }

        // Will throw a QueryException if DB has restrict foreign keys, 
        // which is expected behavior for force deleting protected records.
        $category->forceDelete();

        return $this->successResponse(null, 'Category permanently deleted.');
    }
}