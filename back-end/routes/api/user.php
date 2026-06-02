<?php

use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'verified', 'throttle:api-limiter'])->group(function () {
    
    // Standard user routes (60 per minute)
    // Route::get('/profile', [ProfileController::class, 'show']);

    // Premium-only routes
    Route::middleware('premium')->group(function () {
        // Route::get('/advanced-analytics', [AnalyticsController::class, 'advanced']);
    });

    // File upload routes (10 per minute)
    Route::middleware('throttle:upload-limiter')->group(function () {
        // Route::post('/habits/{id}/photo', [HabitLogController::class, 'uploadPhoto']);
    });
});