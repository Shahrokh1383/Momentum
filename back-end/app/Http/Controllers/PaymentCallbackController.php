<?php

namespace App\Http\Controllers;

use App\Enums\Billing\PaymentStatus;
use App\Models\Billing\Payment;
use App\Models\Billing\Subscription;
use App\Services\User\Billing\PaymenterService;
use Illuminate\Http\Request;

class PaymentCallbackController extends Controller
{
    public function __construct(
        private PaymenterService $paymenterService
    ) {}

    /**
     * Handle the user redirect after bank payment.
     */
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

        return redirect("{$frontendUrl}/payment-result?transaction_id={$transactionId}");
    }

    /**
     * Handle Paymenter webhook (async business logic fulfillment).
     */
    public function webhook(Request $request)
    {
        // Delegate entirely to PaymenterService
        $this->paymenterService->handleWebhook($request);

        return response()->json(['status' => 'success']);
    }
}