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
     * @throws \InvalidArgumentException
     * @throws \Exception
     */
    public function upgrade(User $user, PlanSlug $planSlug, string $cardNumber): array
    {
        $this->validateUpgrade($user, $planSlug);

        $plan = Plan::where('slug', $planSlug->value)->firstOrFail();
        $amount = $this->resolveAmount($plan, $planSlug);

        // Step 1: Atomically cancel any existing subscriptions
        // Keep this transaction small and fast — no HTTP calls inside
        DB::transaction(function () use ($user): void {
            $current = $this->getCurrent($user);

            if ($current?->isActive()) {
                $this->performCancellation($current);
            }

            if ($current?->isPendingPayment()) {
                $current->update(['status' => SubscriptionStatus::CANCELLED]);
            }
        });

        // Step 2: Create the pending subscription record
        // Outside the previous transaction — it's a lightweight single write
        $subscription = Subscription::create([
            'user_id'      => $user->id,
            'plan'         => $planSlug,
            'status'       => SubscriptionStatus::PENDING_PAYMENT,
            'starts_at'    => null,
            'expires_at'   => null,
            'cancelled_at' => null,
        ]);

        // Step 3: Call external gateway — NEVER inside a DB transaction
        // If gateway fails, we clean up the pending subscription and rethrow
        try {
            $gatewayResponse = $this->paymenterService->pay($cardNumber, $amount);
        } catch (\Exception $e) {
            $subscription->update(['status' => SubscriptionStatus::CANCELLED]);
            throw $e;
        }

        // Step 4: Persist the payment record
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

    /**
     * Verify payment status from gateway and activate subscription if successful.
     *
     * @return array{status: string, subscription: Subscription, payment: Payment}
     * @throws \Exception
     */
    public function verify(User $user, int $gatewayTransactionId): array
    {
        $payment = Payment::where('user_id', $user->id)
            ->where('gateway_transaction_id', $gatewayTransactionId)
            ->firstOrFail();

        // Already finalized — return early, no gateway call needed
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

        // Call gateway to get current status
        $gatewayResponse = $this->paymenterService->verify($gatewayTransactionId);
        $gatewayStatus   = $gatewayResponse['status'] ?? 'Unknown';

        if ($gatewayStatus === 'Success') {
            return $this->activateSubscription($payment, $gatewayResponse);
        }

        if (in_array($gatewayStatus, ['Failed', 'Refunded'])) {
            return $this->failPayment($payment, $gatewayResponse);
        }

        // Still pending at gateway
        return [
            'status'       => 'pending',
            'subscription' => $payment->subscription,
            'payment'      => $payment,
        ];
    }

    /**
     * Cancel active subscription and initiate refund via gateway.
     *
     * @return array{subscription: Subscription, payment: ?Payment}
     * @throws \InvalidArgumentException
     * @throws \Exception
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

        // Step 1: Call gateway BEFORE opening any DB transaction
        // External HTTP calls must never hold DB locks open
        $refundResponse = null;
        if ($payment && $payment->isSuccess() && $payment->gateway_transaction_id) {
            $refundResponse = $this->paymenterService->refund($payment->gateway_transaction_id);
        }

        // Step 2: Atomically persist both the refund and cancellation
        DB::transaction(function () use ($subscription, $payment, $refundResponse): void {
            if ($refundResponse !== null) {
                $payment->update([
                    'status'           => PaymentStatus::REFUNDED,
                    'refunded_at'      => now(),
                    // Merge refund data with original gateway response
                    // Preserves original payment confirmation data alongside refund data
                    'gateway_response' => array_merge(
                        $payment->gateway_response ?? [],
                        ['refund' => $refundResponse]
                    ),
                ]);
            }

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

    /**
     * Activate subscription after gateway confirms payment success.
     * Sends confirmation email asynchronously via queue.
     *
     * @return array{status: string, subscription: Subscription, payment: Payment}
     */
    private function activateSubscription(Payment $payment, array $gatewayResponse): array
    {
        $subscription = $payment->subscription;
        $planSlug     = $subscription->plan;

        $expiresAt = match ($planSlug) {
            PlanSlug::PREMIUM  => now()->addDays(30),
            PlanSlug::LIFETIME => null,
            default            => null,
        };

        // Atomically activate subscription and mark payment as successful
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

        // Queue the email — prevents blocking the verify HTTP response
        // Requires: php artisan queue:work
        $plan = Plan::where('slug', $planSlug->value)->first();
        Mail::to($subscription->user->email)->queue(
            new SubscriptionConfirmedMail($subscription, $payment, $plan)
        );

        return [
            'status'       => 'confirmed',
            'subscription' => $subscription,
            'payment'      => $payment,
        ];
    }

    /**
     * Mark payment as failed and cancel the associated subscription.
     *
     * @return array{status: string, subscription: Subscription, payment: Payment}
     */
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

        if ($current?->plan === PlanSlug::LIFETIME && $current->isActive()) {
            throw new \InvalidArgumentException('Lifetime subscriptions cannot be changed.');
        }
    }

    private function resolveAmount(Plan $plan, PlanSlug $planSlug): float
    {
        return match ($planSlug) {
            PlanSlug::PREMIUM  => (float) ($plan->price_monthly ?? 0.00),
            PlanSlug::LIFETIME => (float) ($plan->price_lifetime ?? 0.00),
            default            => 0.00,
        };
    }
}