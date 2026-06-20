<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\Habit\StoreHabitRequest;
use App\Http\Requests\User\Habit\UpdateHabitRequest;
use App\Http\Resources\User\HabitResource;
use App\Models\Habit;
use App\Services\User\Habit\HabitService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HabitController extends Controller
{
    public function __construct(
        private HabitService $habitService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $habits = $this->habitService->getActiveHabits($request->user());

        return $this->successResponse(
            HabitResource::collection($habits),
            'Active habits retrieved successfully.'
        );
    }

    public function archived(Request $request): JsonResponse
    {
        $habits = $this->habitService->getArchivedHabits($request->user());

        return $this->successResponse(
            HabitResource::collection($habits),
            'Archived habits retrieved successfully.'
        );
    }

    public function store(StoreHabitRequest $request): JsonResponse
    {
        $habit = $this->habitService->createHabit($request->user(), $request->validated());

        return $this->successResponse(
            new HabitResource($habit),
            'Habit created successfully.',
            201
        );
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $habit = $this->habitService->getHabitById($request->user(), $id);

        return $this->successResponse(
            new HabitResource($habit),
            'Habit retrieved successfully.'
        );
    }

    public function update(UpdateHabitRequest $request, Habit $habit): JsonResponse
    {
        $habit = $this->habitService->updateHabit($habit, $request->validated());

        return $this->successResponse(
            new HabitResource($habit),
            'Habit updated successfully.'
        );
    }

    public function archive(Request $request, int $id): JsonResponse
    {
        try {
            $habit = $this->habitService->archiveHabit($request->user(), $id);
        } catch (\DomainException $e) {
            return $this->errorResponse('already_archived', $e->getMessage(), 422);
        }

        return $this->successResponse(
            new HabitResource($habit),
            'Habit archived successfully.'
        );
    }

    public function restore(Request $request, int $id): JsonResponse
    {
        $habit = $this->habitService->restoreHabit($request->user(), $id);

        return $this->successResponse(
            new HabitResource($habit),
            'Habit restored successfully.'
        );
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->habitService->deleteHabit($request->user(), $id);

        return $this->successResponse(null, 'Habit permanently deleted.');
    }
}