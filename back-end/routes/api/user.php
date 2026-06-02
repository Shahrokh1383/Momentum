<?php

use App\Http\Controllers\Auth\AuthController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'verified', 'throttle:api-limiter'])->group(function () {
    
    Route::post('logout', [AuthController::class, 'logout']);
    Route::get('me', [AuthController::class, 'me']);

    // Premium-only routes (example)
    // Route::middleware('premium')->group(function () { ... });

    // File upload routes (example)
    // Route::middleware('throttle:upload-limiter')->group(function () { ... });
});