<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\EmailVerificationController;
use App\Http\Controllers\Auth\OAuthController;
use App\Http\Controllers\Auth\PasswordResetController;
use Illuminate\Support\Facades\Route;

// ─── Credential Auth ──────────────────────────────────────────────────────────
Route::middleware('throttle:auth-limiter')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login',    [AuthController::class, 'login']);
});

// ─── Password Reset ───────────────────────────────────────────────────────────
Route::middleware('throttle:password-limiter')
    ->post('forgot-password', [PasswordResetController::class, 'forgot']);

Route::middleware('throttle:reset-limiter')
    ->post('reset-password', [PasswordResetController::class, 'reset']);

// ─── Email Verification ───────────────────────────────────────────────────────
// POST: verify token sent from frontend after user clicks email link
Route::middleware('throttle:reset-limiter')
    ->post('verify-email', [EmailVerificationController::class, 'verify']);

// POST: resend verification email
Route::middleware('throttle:password-limiter')
    ->post('verify-email/resend', [EmailVerificationController::class, 'resend']);

// ─── OAuth ────────────────────────────────────────────────────────────────────
Route::get('oauth/{provider}',          [OAuthController::class, 'redirect']);
Route::post('oauth/{provider}/callback',[OAuthController::class, 'callback']);