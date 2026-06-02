<?php

use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'verified', 'role:admin', 'throttle:api-limiter'])->group(function () {
    
    // Admin routes (60 per minute)
    // Route::get('/dashboard-stats', [AdminDashboardController::class, 'stats']);
});