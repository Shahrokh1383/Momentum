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

    /**
     * Initiate a plan upgrade — creates pending subscription + payment via gateway.
     *
     * @return array{subscription: Subscription, payment: Payment}
     */
    public function upgrade(User $user, PlanSlug $planSlug, string $cardNumber): array
    {
        $this->validateUpgrade($user, $planSlug);

        $plan = Plan::where('slug', $planSlug->value)->firstOrFail();
        $amount = $this->resolveAmount($plan, $planSlug);

        return DB::transaction(function () use ($user, $planSlug, $plan, $amount, $cardNumber): array {
            $currentSubscription = $this->getCurrent($user);

            if ($currentSubscription?->isActive()) {
                $this->performCancellation($currentSubscription);
            }

            // Cancel any existing pending subscription
            if ($currentSubscription?->isPendingPayment()) {
                $currentSubscription->update(['status' => SubscriptionStatus::CANCELLED]);
            }

            $subscription = Subscription::create([
                'user_id' => $user->id,
                'plan' => $planSlug,
                'status' => SubscriptionStatus::PENDING_PAYMENT,
                'starts_at' => null,
                'expires_at' => null,
                'cancelled_at' => null,
            ]);

            // Call Paymenter gateway
            $gatewayResponse = $this->paymenterService->pay($cardNumber, $amount);

            $payment = Payment::create([
                'user_id' => $user->id,
                'subscription_id' => $subscription->id,
                'amount' => $amount,
                'currency' => config('services.paymenter.currency'),
                'status' => PaymentStatus::PENDING,
                'gateway_transaction_id' => $gatewayResponse['transaction_id'],
                'card_number_masked' => Payment::maskCardNumber($cardNumber),
                'gateway_response' => $gatewayResponse,
            ]);

            return [
                'subscription' => $subscription,
                'payment' => $payment,
            ];
        });
    }

    /**
     * Verify payment status from gateway and activate subscription if successful.
     *
     * @return array{status: string, subscription: Subscription, payment: Payment}
     */
    public function verify(User $user, int $gatewayTransactionId): array
    {
        $payment = Payment::where('user_id', $user->id)
            ->where('gateway_transaction_id', $gatewayTransactionId)
            ->firstOrFail();

        if ($payment->isSuccess()) {
            return [
                'status' => 'already_confirmed',
                'subscription' => $payment->subscription,
                'payment' => $payment,
            ];
        }

        if (! $payment->isPending()) {
            return [
                'status' => $payment->status->value,
                'subscription' => $payment->subscription,
                'payment' => $payment,
            ];
        }

        $gatewayResponse = $this->paymenterService->verify($gatewayTransactionId);
        $gatewayStatus = $gatewayResponse['status'] ?? 'Unknown';

        if ($gatewayStatus === 'Success') {
            return $this->activateSubscription($payment, $gatewayResponse);
        }

        if (in_array($gatewayStatus, ['Failed', 'Refunded'])) {
            return $this->failPayment($payment, $gatewayResponse);
        }

        // Still pending
        return [
            'status' => 'pending',
            'subscription' => $payment->subscription,
            'payment' => $payment,
        ];
    }

    /**
     * Cancel active subscription and initiate refund via gateway.
     *
     * @return array{subscription: Subscription, payment: ?Payment}
     */
    public function cancel(User $user): array
    {
        $subscription = $this->getCurrent($user);

        if (! $subscription) {
            throw new \InvalidArgumentException('No active subscription found.');
        }

        if (! $subscription->isActive()) {
            throw new \InvalidArgumentException('Subscription is not active.');
        }

        if ($subscription->plan === PlanSlug::FREE) {
            throw new \InvalidArgumentException('Free plan cannot be cancelled.');
        }

        $payment = $subscription->latestPayment;

        if ($payment && $payment->isSuccess() && $payment->gateway_transaction_id) {
            $refundResponse = $this->paymenterService->refund($payment->gateway_transaction_id);

            $payment->update([
                'status' => PaymentStatus::REFUNDED,
                'refunded_at' => now(),
                'gateway_response' => $refundResponse,
            ]);
        }

        $subscription = $this->performCancellation($subscription);

        return [
            'subscription' => $subscription,
            'payment' => $payment?->fresh(),
        ];
    }

    /**
     * @return array{status: string, subscription: Subscription, payment: Payment}
     */
    private function activateSubscription(Payment $payment, array $gatewayResponse): array
    {
        $subscription = $payment->subscription;
        $planSlug = $subscription->plan;

        $expiresAt = match ($planSlug) {
            PlanSlug::PREMIUM => now()->addDays(30),
            PlanSlug::LIFETIME => null,
            default => null,
        };

        $subscription->update([
            'status' => SubscriptionStatus::ACTIVE,
            'starts_at' => now(),
            'expires_at' => $expiresAt,
        ]);

        $payment->update([
            'status' => PaymentStatus::SUCCESS,
            'paid_at' => now(),
            'gateway_response' => $gatewayResponse,
        ]);

        // Send confirmation email
        $plan = Plan::where('slug', $planSlug->value)->first();
        Mail::to($subscription->user->email)->send(
            new SubscriptionConfirmedMail($subscription->fresh(), $payment->fresh(), $plan)
        );

        return [
            'status' => 'confirmed',
            'subscription' => $subscription->fresh(),
            'payment' => $payment->fresh(),
        ];
    }

    /**
     * @return array{status: string, subscription: Subscription, payment: Payment}
     */
    private function failPayment(Payment $payment, array $gatewayResponse): array
    {
        $payment->update([
            'status' => PaymentStatus::FAILED,
            'gateway_response' => $gatewayResponse,
        ]);

        $payment->subscription->update([
            'status' => SubscriptionStatus::CANCELLED,
            'cancelled_at' => now(),
        ]);

        return [
            'status' => 'failed',
            'subscription' => $payment->subscription->fresh(),
            'payment' => $payment->fresh(),
        ];
    }

    private function performCancellation(Subscription $subscription): Subscription
    {
        $subscription->update([
            'status' => SubscriptionStatus::CANCELLED,
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

        if ($current?->plan === PlanSlug::LIFETIME && $current->isActive()) {
            throw new \InvalidArgumentException('Lifetime subscriptions cannot be changed.');
        }
    }

    private function resolveAmount(Plan $plan, PlanSlug $planSlug): float
    {
        return match ($planSlug) {
            PlanSlug::PREMIUM => (float) ($plan->price_monthly ?? 0.00),
            PlanSlug::LIFETIME => (float) ($plan->price_lifetime ?? 0.00),
            default => 0.00,
        };
    }
}