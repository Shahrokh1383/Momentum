<?php

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Route;

Route::middleware('throttle:auth-limiter')->group(function () {
    // Login and Register routes (5 per minute)
    // Route::post('login', [AuthController::class, 'login']);
    // Route::post('register', [AuthController::class, 'register']);
});

Route::middleware('throttle:password-limiter')->group(function () {
    // Password reset routes (1 per 5 minutes)
    // Route::post('forgot-password', [AuthController::class, 'forgotPassword']);
    // Route::post('reset-password', [AuthController::class, 'resetPassword']);
});

// CSRF Cookie endpoint (no rate limit needed beyond global API)
Route::get('/sanctum/csrf-cookie', function () {
    return response()->noContent();
});