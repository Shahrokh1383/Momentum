<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PaymentCallbackController;

Route::get('/', function () {
    return response()->json(['message' => 'Web fallback route hit. Check your request URL or method.']);
});
Route::get('/payment/callback', [PaymentCallbackController::class, 'handle'])->name('payment.callback');