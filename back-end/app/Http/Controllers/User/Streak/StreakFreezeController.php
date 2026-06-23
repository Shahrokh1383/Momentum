<?php

namespace App\Http\Controllers\User\Streak;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\StreakFreeze\StoreStreakFreezeRequest;
use App\Http\Resources\User\StreakResource;
use App\Models\Habit\Habit;
use App\Services\User\Streak\StreakService;
use Illuminate\Http\JsonResponse;

class StreakFreezeController extends Controller
{
    public function __construct(
        private StreakService $streakService
    ) {}

    public function store(StoreStreakFreezeRequest $request, int $id): JsonResponse
    {
        $habit = Habit::where('id', $id)->where('user_id', $request->user()->id)->firstOrFail();

        $this->streakService->applyFreeze(
            $habit,
            $request->validated()['frozen_date'],
            $request->validated()['reason'] ?? null
        );

        $habit->load('streak');

        return $this->successResponse(
            new StreakResource($habit->streak),
            'Streak freeze applied successfully.'
        );
    }
}