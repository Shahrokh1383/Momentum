<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\User\Subscription\PlansController;
use App\Http\Controllers\User\Subscription\SubscriptionController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'verified', 'throttle:api-limiter'])->group(function () {

    Route::post('logout', [AuthController::class, 'logout']);
    Route::get('me', [AuthController::class, 'me']);

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
});