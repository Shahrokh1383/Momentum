<?php

namespace App\Services\User\Subscription;

use App\Enums\PaymentStatus;
use App\Enums\PlanSlug;
use App\Enums\SubscriptionStatus;
use App\Mail\SubscriptionConfirmedMail;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class SubscriptionService
{
    public function __construct(
        private PaymenterService $paymenterService
    ) {}

    public function getCurrent(User $user): ?Subscription
    {
        return $user->subscription;
    }

    public function upgrade(User $user, PlanSlug $planSlug, string $cardNumber): array
    {
        $this->validateUpgrade($user, $planSlug);

        $plan = Plan::where('slug', $planSlug->value)->firstOrFail();
        $amount = $this->resolveAmount($plan, $planSlug);

        DB::transaction(function () use ($user): void {
            $current = $this->getCurrent($user);

            if ($current?->isActive()) {
                $this->performCancellation($current);
            }

            if ($current?->isPendingPayment()) {
                $current->update(['status' => SubscriptionStatus::CANCELLED]);
            }
        });

        $subscription = Subscription::create([
            'user_id'      => $user->id,
            'plan'         => $planSlug,
            'status'       => SubscriptionStatus::PENDING_PAYMENT,
            'starts_at'    => null,
            'expires_at'   => null,
            'cancelled_at' => null,
        ]);

        try {
            $gatewayResponse = $this->paymenterService->pay($cardNumber, $amount);
        } catch (\Exception $e) {
            $subscription->update(['status' => SubscriptionStatus::CANCELLED]);
            throw $e;
        }

        $payment = Payment::create([
            'user_id'                => $user->id,
            'subscription_id'        => $subscription->id,
            'amount'                 => $amount,
            'currency'               => config('services.paymenter.currency'),
            'status'                 => PaymentStatus::PENDING,
            'gateway_transaction_id' => $gatewayResponse['transaction_id'],
            'card_number_masked'     => Payment::maskCardNumber($cardNumber),
            'gateway_response'       => $gatewayResponse,
        ]);

        return [
            'subscription' => $subscription,
            'payment'      => $payment,
        ];
    }

    public function verify(User $user, int $gatewayTransactionId): array
    {
        $payment = Payment::where('user_id', $user->id)
            ->where('gateway_transaction_id', $gatewayTransactionId)
            ->firstOrFail();

        if ($payment->isSuccess()) {
            return [
                'status'       => 'already_confirmed',
                'subscription' => $payment->subscription,
                'payment'      => $payment,
            ];
        }

        if (! $payment->isPending()) {
            return [
                'status'       => $payment->status->value,
                'subscription' => $payment->subscription,
                'payment'      => $payment,
            ];
        }

        $gatewayResponse = $this->paymenterService->verify($gatewayTransactionId);
        $gatewayStatus   = $gatewayResponse['status'] ?? 'Unknown';

        if ($gatewayStatus === 'Success') {
            return $this->activateSubscription($payment, $gatewayResponse);
        }

        if (in_array($gatewayStatus, ['Failed', 'Refunded'])) {
            return $this->failPayment($payment, $gatewayResponse);
        }

        return [
            'status'       => 'pending',
            'subscription' => $payment->subscription,
            'payment'      => $payment,
        ];
    }

    public function cancel(User $user): array
    {
        $subscription = $this->getCurrent($user);

        if (! $subscription || ! $subscription->isActive()) {
            throw new \InvalidArgumentException('No active subscription found.');
        }

        if ($subscription->plan === PlanSlug::FREE) {
            throw new \InvalidArgumentException('Free plan cannot be cancelled.');
        }

        $payment = $subscription->latestPayment;

        $refundResponse = null;
        if ($payment && $payment->isSuccess() && $payment->gateway_transaction_id) {
            $refundResponse = $this->paymenterService->refund($payment->gateway_transaction_id);
        }

        DB::transaction(function () use ($subscription, $payment, $refundResponse): void {
            if ($refundResponse !== null) {
                $payment->update([
                    'status'           => PaymentStatus::REFUNDED,
                    'refunded_at'      => now(),
                    'gateway_response' => array_merge(
                        $payment->gateway_response ?? [],
                        ['refund' => $refundResponse]
                    ),
                ]);
            }

            // Immediately cancel the subscription (No Grace Period)
            $subscription->update([
                'status'       => SubscriptionStatus::CANCELLED,
                'cancelled_at' => now(),
            ]);
        });

        return [
            'subscription' => $subscription->fresh(),
            'payment'      => $payment?->fresh(),
        ];
    }

    private function activateSubscription(Payment $payment, array $gatewayResponse): array
    {
        $subscription = $payment->subscription;
        $plan = Plan::where('slug', $subscription->plan->value)->first();
        
        // Calculate dynamic expiration based on plan duration
        $expiresAt = ($plan && $plan->duration_months) 
            ? now()->addMonths($plan->duration_months) 
            : null;

        DB::transaction(function () use ($subscription, $payment, $expiresAt, $gatewayResponse): void {
            $subscription->update([
                'status'     => SubscriptionStatus::ACTIVE,
                'starts_at'  => now(),
                'expires_at' => $expiresAt,
            ]);

            $payment->update([
                'status'           => PaymentStatus::SUCCESS,
                'paid_at'          => now(),
                'gateway_response' => $gatewayResponse,
            ]);
        });

        $subscription = $subscription->fresh();
        $payment      = $payment->fresh();

        Mail::to($subscription->user->email)->queue(
            new SubscriptionConfirmedMail($subscription, $payment, $plan)
        );

        return [
            'status'       => 'confirmed',
            'subscription' => $subscription,
            'payment'      => $payment,
        ];
    }

    private function failPayment(Payment $payment, array $gatewayResponse): array
    {
        DB::transaction(function () use ($payment, $gatewayResponse): void {
            $payment->update([
                'status'           => PaymentStatus::FAILED,
                'gateway_response' => $gatewayResponse,
            ]);

            $payment->subscription->update([
                'status'       => SubscriptionStatus::CANCELLED,
                'cancelled_at' => now(),
            ]);
        });

        return [
            'status'       => 'failed',
            'subscription' => $payment->subscription->fresh(),
            'payment'      => $payment->fresh(),
        ];
    }

    private function performCancellation(Subscription $subscription): Subscription
    {
        $subscription->update([
            'status'       => SubscriptionStatus::CANCELLED,
            'cancelled_at' => now(),
        ]);

        return $subscription->fresh();
    }

    private function validateUpgrade(User $user, PlanSlug $planSlug): void
    {
        if ($planSlug === PlanSlug::FREE) {
            throw new \InvalidArgumentException('Cannot upgrade to the free plan.');
        }

        $current = $this->getCurrent($user);

        if ($current?->plan === $planSlug && $current->isActive()) {
            throw new \InvalidArgumentException('You are already subscribed to this plan.');
        }
    }

    private function resolveAmount(Plan $plan, PlanSlug $planSlug): float
    {
        // Keeping it simple, default to monthly price
        return match ($planSlug) {
            PlanSlug::EXPERT  => (float) ($plan->price_monthly ?? 0.00),
            PlanSlug::PREMIUM => (float) ($plan->price_monthly ?? 0.00),
            default           => 0.00,
        };
    }
}