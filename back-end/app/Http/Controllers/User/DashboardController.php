<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Http\Resources\User\DashboardResource;
use App\Http\Resources\User\HabitResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $today = now()->toDateString();

        $allActiveHabits = $user->habits()
            ->with([
                'streak',
                'checklistItems',
                'category',
                'logs' => fn ($q) => $q->where('logged_date', $today),
                'logs.habit',
                'logs.checklistLogs.checklistItem',
            ])
            ->where('is_active', true)
            ->get();

        $dueTodayHabits = $allActiveHabits->filter(
            fn ($habit) => $habit->isDueToday()
        );

        $completedCount = $dueTodayHabits->filter(
            fn ($habit) => $habit->logs->contains(fn ($log) => $log->status === 'completed')
        )->count();

        $totalDue = $dueTodayHabits->count();

        $streaks = $allActiveHabits->pluck('streak')->filter();

        return $this->successResponse(
            new DashboardResource((object) [
                'habits' => HabitResource::collection($dueTodayHabits),
                'completion_percentage' => $totalDue > 0
                    ? round(($completedCount / $totalDue) * 100, 2)
                    : 0,
                'streak_counts' => (object) [
                    'active_streaks' => $streaks->filter(fn ($s) => $s->current_streak > 0)->count(),
                    'best_streak' => $streaks->max('current_streak') ?? 0,
                ],
            ]),
            'Dashboard data retrieved successfully.'
        );
    }
}