<?php

namespace App\Services\User\Subscription;

use App\Enums\PaymentStatus;
use App\Models\SimulatedPayment;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Support\Str;

class SimulatedPaymentService
{
    public function createPending(User $user, Subscription $subscription, float $amount, string $currency = 'USD'): SimulatedPayment
    {
        return SimulatedPayment::create([
            'user_id' => $user->id,
            'subscription_id' => $subscription->id,
            'amount' => $amount,
            'currency' => $currency,
            'status' => PaymentStatus::PENDING,
            'provider_ref' => 'sim_' . Str::random(16),
            'payload' => [
                'initiated_at' => now()->toIso8601String(),
                'payment_method' => $subscription->payment_method,
            ],
        ]);
    }

    public function markSuccess(SimulatedPayment $payment): void
    {
        $payment->update([
            'status' => PaymentStatus::SUCCESS,
            'processed_at' => now(),
            'payload' => array_merge($payment->payload ?? [], [
                'processed_at' => now()->toIso8601String(),
                'result' => 'approved',
            ]),
        ]);
    }

    public function markFailed(SimulatedPayment $payment, string $reason = 'Payment failed'): void
    {
        $payment->update([
            'status' => PaymentStatus::FAILED,
            'processed_at' => now(),
            'payload' => array_merge($payment->payload ?? [], [
                'processed_at' => now()->toIso8601String(),
                'result' => 'declined',
                'reason' => $reason,
            ]),
        ]);
    }
}