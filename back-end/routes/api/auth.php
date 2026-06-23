<?php

use App\Http\Controllers\User\Identity\Auth\AuthController;
use App\Http\Controllers\User\Identity\Auth\EmailVerificationController;
use App\Http\Controllers\User\Identity\Auth\OAuthController;
use App\Http\Controllers\User\Identity\Auth\PasswordResetController;
use Illuminate\Support\Facades\Route;

// ─── Credential Auth ──────────────────────────────────────────────────────────
Route::middleware('throttle:auth-limiter')->group(function () {
    Route::post('login',    [AuthController::class, 'login']);
    Route::post('register', [AuthController::class, 'register']);
});


// ─── Password Reset ───────────────────────────────────────────────────────────
Route::middleware('throttle:password-limiter')
    ->post('forgot-password', [PasswordResetController::class, 'forgot']);

Route::middleware('throttle:reset-limiter')
    ->post('reset-password', [PasswordResetController::class, 'reset']);

// ─── Email Verification ───────────────────────────────────────────────────────
Route::middleware('throttle:reset-limiter')
    ->post('verify-email', [EmailVerificationController::class, 'verify'])
    ->name('api.verification.verify'); 

Route::middleware('throttle:password-limiter')
    ->post('verify-email/resend', [EmailVerificationController::class, 'resend']);

// ─── OAuth ────────────────────────────────────────────────────────────────────
Route::get('oauth/{provider}',          [OAuthController::class, 'redirect']);
Route::post('oauth/{provider}/callback',[OAuthController::class, 'callback']);
Route::middleware(['auth:sanctum', 'verified'])->group(function () {
    Route::delete('oauth/{provider}', [OAuthController::class, 'unlink']);
});