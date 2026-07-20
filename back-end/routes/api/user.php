<?php

use App\Http\Controllers\User\Identity\Auth\AuthController;
use App\Http\Controllers\User\Identity\AvatarController;
use App\Http\Controllers\User\Identity\SettingsController;
use App\Http\Controllers\User\Billing\PlansController;
use App\Http\Controllers\User\Billing\SubscriptionController;
use App\Http\Controllers\User\Taxonomy\CategoryController;
use App\Http\Controllers\User\Taxonomy\TagController;
use App\Http\Controllers\User\Habit\HabitController;
use App\Http\Controllers\User\Habit\HabitLogController;
use App\Http\Controllers\User\Streak\StreakFreezeController;
use App\Http\Controllers\User\DashboardController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'verified', 'throttle:api-limiter'])->group(function () {

    Route::post('logout', [AuthController::class, 'logout']);
    Route::post('logout-all', [AuthController::class, 'logoutAll']);
    Route::get('me', [AuthController::class, 'me']);
    Route::get('dashboard', [DashboardController::class, 'index']);
    
    // Profile & Settings Module
    Route::prefix('profile')->group(function () {
        Route::get('avatar', [AvatarController::class, 'show']);
        Route::post('avatar', [AvatarController::class, 'update']);
        Route::delete('avatar', [AvatarController::class, 'destroy']);
        Route::put('/', [SettingsController::class, 'updateProfile']);
        Route::put('preferences', [SettingsController::class, 'updatePreferences']);
    });

    // Plans
    Route::get('plans', [PlansController::class, 'index']);

    // Subscription
    Route::prefix('subscription')->group(function () {
        Route::get('/', [SubscriptionController::class, 'current']);
        Route::get('quotas', [SubscriptionController::class, 'quotas']);
        Route::post('upgrade', [SubscriptionController::class, 'upgrade']);
        Route::get('verify/{transactionId}', [SubscriptionController::class, 'verify'])
            ->whereUuid('transactionId');
        Route::delete('/', [SubscriptionController::class, 'cancel']);
    });

    // Categories
    Route::prefix('categories')->group(function () {
        Route::get('trashed', [CategoryController::class, 'trashed']);
        Route::post('{id}/restore', [CategoryController::class, 'restore']);
        Route::delete('{id}/force-delete', [CategoryController::class, 'forceDelete']);
        Route::get('/', [CategoryController::class, 'index']);
        Route::post('/', [CategoryController::class, 'store']);
        Route::put('/{category}', [CategoryController::class, 'update']);
        Route::delete('/{category}', [CategoryController::class, 'destroy']);
    });

    // Tags
    Route::prefix('tags')->group(function () {
        Route::get('/', [TagController::class, 'index']);
        Route::get('/autocomplete', [TagController::class, 'autocomplete']);
        Route::post('/', [TagController::class, 'store']);
        Route::put('/{tag}', [TagController::class, 'update']);
        Route::delete('/{tag}', [TagController::class, 'destroy']);
    });

    // Habits
    Route::prefix('habits')->group(function () {
        Route::get('/', [HabitController::class, 'index']);
        Route::get('/archived', [HabitController::class, 'archived']);
        Route::post('/', [HabitController::class, 'store'])->middleware('habit.plan');
        Route::get('/{id}', [HabitController::class, 'show'])->whereNumber('id');
        Route::put('/{habit}', [HabitController::class, 'update'])->middleware('habit.plan');

        Route::post('/{id}/archive', [HabitController::class, 'archive'])->whereNumber('id');
        Route::post('/{id}/restore', [HabitController::class, 'restore'])->whereNumber('id');
        Route::delete('/{id}', [HabitController::class, 'destroy'])->whereNumber('id');

        // Habit Logs (nested under habit)
        Route::post('/{id}/logs', [HabitLogController::class, 'store'])->whereNumber('id');
        Route::post('/{id}/freezes', [StreakFreezeController::class, 'store'])->whereNumber('id');
    });

    // Habit Logs (standalone for update/destroy)
    Route::prefix('habit-logs')->group(function () {
        Route::put('/{habit_log}', [HabitLogController::class, 'update']);
        Route::delete('/{id}', [HabitLogController::class, 'destroy'])->whereNumber('id');
    });

    Route::middleware(['tier:expert'])->prefix('expert')->group(function () {
        // Route::get('/analytics', [App\Http\Controllers\User\Expert\AnalyticsController::class, 'index']);
    });

    Route::middleware(['tier:premium'])->prefix('premium')->group(function () {
        // Route::get('/priority-support', [App\Http\Controllers\User\Premium\SupportController::class, 'index']);
    });
});