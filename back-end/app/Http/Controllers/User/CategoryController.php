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

        if ($category->activeHabits()->exists()) {
            return $this->errorResponse(
                'category_in_use',
                'Cannot delete category with active habits.',
                422
            );
        }

        $category->delete();

        return $this->successResponse(null, 'Category deleted successfully.');
    }
}