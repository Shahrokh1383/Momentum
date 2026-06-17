<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\User\Profile\AvatarController;
use App\Http\Controllers\User\Profile\SettingsController;
use App\Http\Controllers\User\Subscription\PlansController;
use App\Http\Controllers\User\Subscription\SubscriptionController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'verified', 'throttle:api-limiter'])->group(function () {

    Route::post('logout', [AuthController::class, 'logout']);
    Route::post('logout-all', [AuthController::class, 'logoutAll']);
    Route::get('me', [AuthController::class, 'me']);

    // Profile & Settings Module
    Route::prefix('profile')->group(function () {
        Route::get('avatar', [AvatarController::class, 'show']);
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
            ->whereNumber('transactionId');
        Route::delete('/', [SubscriptionController::class, 'cancel']);
    });

    Route::middleware(['tier:expert'])->prefix('expert')->group(function () {
        // Route::get('/analytics', [App\Http\Controllers\User\Expert\AnalyticsController::class, 'index']);
    });

    Route::middleware(['tier:premium'])->prefix('premium')->group(function () {
        // Route::get('/priority-support', [App\Http\Controllers\User\Premium\SupportController::class, 'index']);
    });
});