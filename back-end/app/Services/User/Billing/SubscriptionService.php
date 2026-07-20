<?php

namespace App\Services\User\Billing;

use App\Enums\Billing\PaymentStatus;
use App\Enums\Billing\PlanSlug;
use App\Enums\Billing\SubscriptionStatus;
use App\Models\Billing\Plan;
use App\Models\Billing\Subscription;
use App\Models\Identity\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SubscriptionService
{
    public function __construct(
        private PaymenterService $paymenterService
    ) {}

    public function getCurrent(User $user): ?Subscription
    {
        $user->loadMissing('subscription.latestPayment');
        return $user->subscription;
    }

    public function upgrade(User $user, PlanSlug $planSlug): Subscription
    {
        $this->validateUpgrade($user, $planSlug);

        $plan = Plan::where('slug', $planSlug->value)->firstOrFail();
        $amount = $this->resolveAmount($plan, $planSlug);

        DB::transaction(function () use ($user): void {
            $current = $this->getCurrent($user);

            if ($current?->isActive()) {
                $this->cancelExistingSubscription($current);
            }

            if ($current?->isPendingPayment()) {
                // Fail the old pending payment to maintain a clean state
                if ($current->latestPayment && $current->latestPayment->isPending()) {
                    $current->latestPayment()->update(['status' => PaymentStatus::FAILED]);
                }
                $current->update(['status' => SubscriptionStatus::PAYMENT_FAILED]);
            }
        });

        $subscription = Subscription::create([
            'user_id'         => $user->id,
            'plan'            => $planSlug,
            'status'          => SubscriptionStatus::PENDING_PAYMENT,
            'starts_at'       => null,
            'expires_at'      => null,
            'cancelled_at'    => null,
            'transaction_ref' => (string) Str::uuid(),
        ]);

        // Payment initiation is now delegated entirely to PaymenterService.
        // The controller will call this method and then pass the subscription to PaymenterService.
        // We just return the subscription; the payment creation happens outside.
        return $subscription;
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
        $refundResult = null;

        // Only initiate refund via PaymenterService (API call, no DB change).
        // The actual refunded status will be set by the webhook.
        if ($payment && $payment->isSuccess() && $payment->gateway_transaction_id) {
            $refundResult = $this->paymenterService->initiateRefund($payment);
        }

        DB::transaction(function () use ($subscription, $user): void {
            $subscription->update([
                'status'       => SubscriptionStatus::CANCELLED,
                'cancelled_at' => now(),
                'plan'         => PlanSlug::FREE,
            ]);

            // Keep user.plan_slug in sync
            $user->update(['plan_slug' => PlanSlug::FREE]);
        });

        return [
            'subscription'  => $subscription->fresh(),
            'payment'       => $payment?->fresh(),
            'refund_result' => $refundResult,
        ];
    }

    private function cancelExistingSubscription(Subscription $subscription): void
    {
        $subscription->update([
            'status'       => SubscriptionStatus::CANCELLED,
            'cancelled_at' => now(),
        ]);
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
        return match ($planSlug) {
            PlanSlug::EXPERT  => (float) ($plan->price_monthly ?? 0.00),
            PlanSlug::PREMIUM => (float) ($plan->price_monthly ?? 0.00),
            default           => 0.00,
        };
    }
}