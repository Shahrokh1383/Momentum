<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\Category\StoreCategoryRequest;
use App\Http\Requests\User\Category\UpdateCategoryRequest;
use App\Http\Resources\User\CategoryResource;
use App\Services\User\CategoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function __construct(
        private CategoryService $categoryService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $categories = $this->categoryService->getCategories($request->user());

        return $this->successResponse(
            CategoryResource::collection($categories),
            'Categories retrieved successfully.'
        );
    }

    public function store(StoreCategoryRequest $request): JsonResponse
    {
        $category = $this->categoryService->createCategory(
            $request->user(), 
            $request->validated()
        );

        return $this->successResponse(
            new CategoryResource($category),
            'Category created successfully.',
            201
        );
    }

    public function update(UpdateCategoryRequest $request, $category): JsonResponse
    {
        $category = $this->categoryService->updateCategory(
            $category, 
            $request->validated()
        );

        return $this->successResponse(
            new CategoryResource($category),
            'Category updated successfully.'
        );
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        try {
            $this->categoryService->deleteCategory($request->user(), $id);
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse('forbidden', $e->getMessage(), 403);
        }

        return $this->successResponse(null, 'Category moved to trash successfully.');
    }

    public function trashed(Request $request): JsonResponse
    {
        $categories = $this->categoryService->getTrashedCategories($request->user());

        return $this->successResponse(
            CategoryResource::collection($categories),
            'Trashed categories retrieved successfully.'
        );
    }

    public function restore(Request $request, int $id): JsonResponse
    {
        // The QuotaExceededException from the Service is automatically 
        // caught by Laravel's exception handler and returned as JSON.
        $category = $this->categoryService->restoreCategory($request->user(), $id);

        return $this->successResponse(
            new CategoryResource($category),
            'Category restored successfully.'
        );
    }

    public function forceDelete(Request $request, int $id): JsonResponse
    {
        try {
            $this->categoryService->forceDeleteCategory($request->user(), $id);
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse('forbidden', $e->getMessage(), 403);
        }

        return $this->successResponse(null, 'Category permanently deleted.');
    }
}