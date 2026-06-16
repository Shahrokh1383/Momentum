<?php

namespace App\Http\Controllers;

use App\Enums\PaymentStatus;
use App\Models\Subscription;
use App\Models\Payment;
use Illuminate\Http\Request;

class PaymentCallbackController extends Controller
{
    public function handle(Request $request)
    {
        $ref = $request->query('ref');
        $transactionId = $request->query('transaction_id');
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');

        if (!$ref || !$transactionId) {
            return redirect("{$frontendUrl}/payment-result?status=failed");
        }

        $subscription = Subscription::where('transaction_ref', $ref)->first();

        if (!$subscription) {
            return redirect("{$frontendUrl}/payment-result?status=failed");
        }

        $payment = Payment::where('subscription_id', $subscription->id)
            ->where('status', PaymentStatus::PENDING) 
            ->latest()
            ->first();

        if ($payment && !$payment->gateway_transaction_id) {
            $payment->update(['gateway_transaction_id' => $transactionId]);
        }

        // Redirect to frontend to start polling
        return redirect("{$frontendUrl}/payment-result?transaction_id={$transactionId}");
    }
}