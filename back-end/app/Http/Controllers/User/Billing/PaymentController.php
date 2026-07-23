<?php

namespace App\Http\Controllers\User\Billing;

use App\Http\Controllers\Controller;
use App\Http\Resources\User\PaymentResource;
use App\Http\Resources\User\SubscriptionResource;
use App\Services\User\Billing\PaymenterService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function __construct(
        private PaymenterService $paymenterService
    ) {}

    public function verify(Request $request, string $transactionId): JsonResponse
    {
        $payment = $this->paymenterService->getPaymentByTransactionId($transactionId);

        if (! $payment) {
            return $this->errorResponse('not_found', 'Payment not found.', 404);
        }

        $status = $payment->status->value;
        $message = match ($status) {
            'success' => 'Payment confirmed.',
            'pending' => 'Payment is still being processed.',
            'failed'  => 'Payment failed.',
            'refunded'=> 'Payment has been refunded.',
            default   => 'Unknown status.',
        };

        $data = [
            'status'   => $status,
            'deadline' => $payment->created_at->addMinutes(15)->toIso8601String(),
            'payment'  => new PaymentResource($payment),
        ];

        // Optionally include subscription data if this payment is tied to a subscription
        if ($payment->subscription) {
            $data['subscription'] = new SubscriptionResource(
                $payment->subscription->load('planDetails')
            );
        }

        return $this->successResponse($data, $message);
    }
}