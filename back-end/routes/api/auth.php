<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\EmailVerificationController;
use App\Http\Controllers\Auth\OAuthController;
use App\Http\Controllers\Auth\PasswordResetController;
use Illuminate\Support\Facades\Route;

// Credential Auth
Route::middleware('throttle:auth-limiter')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);
});

// Password Reset
Route::middleware('throttle:password-limiter')->group(function () {
    Route::post('forgot-password', [PasswordResetController::class, 'forgot']);
    Route::post('reset-password', [PasswordResetController::class, 'reset']);
});

// Email Verification
Route::post('verify-email/latest-token', [EmailVerificationController::class, 'latestToken']);
Route::get('verify-email/{token}', [EmailVerificationController::class, 'verify']);
Route::middleware('throttle:password-limiter')->post('verify-email/resend', [EmailVerificationController::class, 'resend']);

// OAuth
Route::get('oauth/{provider}', [OAuthController::class, 'redirect']);
Route::post('oauth/{provider}/callback', [OAuthController::class, 'callback']);