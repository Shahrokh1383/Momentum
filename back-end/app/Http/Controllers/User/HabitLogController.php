<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\HabitLog\StoreHabitLogRequest;
use App\Http\Requests\User\HabitLog\UpdateHabitLogRequest;
use App\Http\Resources\User\HabitLogResource;
use App\Models\HabitLog;
use App\Services\User\Habit\HabitLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HabitLogController extends Controller
{
    public function __construct(
        private HabitLogService $habitLogService
    ) {}

    public function store(StoreHabitLogRequest $request, int $id): JsonResponse
    {
        $log = $this->habitLogService->logCompletion(
            $request->user(),
            $id,
            $request->validated()
        );

        return $this->successResponse(
            new HabitLogResource($log),
            'Habit logged successfully.',
            201
        );
    }

    public function update(UpdateHabitLogRequest $request, HabitLog $habit_log): JsonResponse
    {
        $log = $this->habitLogService->updateLog(
            $habit_log,
            $request->validated()
        );

        return $this->successResponse(
            new HabitLogResource($log),
            'Habit log updated successfully.'
        );
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->habitLogService->deleteLog($request->user(), $id);

        return $this->successResponse(null, 'Habit log deleted.');
    }
}