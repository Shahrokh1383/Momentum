<?php

namespace App\Services\User\Subscription;

use App\Enums\PlanSlug;
use App\Enums\SubscriptionStatus;
use App\Jobs\ProcessSimulatedPayment;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class SubscriptionService
{
    public function __construct(
        private SimulatedPaymentService $paymentService
    ) {
    }

    public function getCurrent(User $user): ?Subscription
    {
        return $user->subscription;
    }

    public function upgrade(User $user, PlanSlug $planSlug, string $paymentMethod = 'simulated'): array
    {
        if ($planSlug === PlanSlug::FREE) {
            throw new \InvalidArgumentException('Cannot upgrade to the free plan.');
        }

        return DB::transaction(function () use ($user, $planSlug, $paymentMethod) {
            $currentSubscription = $this->getCurrent($user);

            if ($currentSubscription?->plan === $planSlug) {
                throw new \InvalidArgumentException('You are already subscribed to this plan.');
            }

            if ($currentSubscription?->plan === PlanSlug::LIFETIME) {
                throw new \InvalidArgumentException('Lifetime subscriptions cannot be changed.');
            }

            $plan = Plan::where('slug', $planSlug->value)->firstOrFail();

            if ($currentSubscription?->isActive()) {
                $this->performCancellation($currentSubscription);
            }

            $expiresAt = match ($planSlug) {
                PlanSlug::PREMIUM => now()->addDays(30),
                PlanSlug::LIFETIME => null,
                default => null,
            };

            $amount = match ($planSlug) {
                PlanSlug::PREMIUM => $plan->price_monthly ?? 0.00,
                PlanSlug::LIFETIME => $plan->price_lifetime ?? 0.00,
                default => 0.00,
            };

            $newSubscription = Subscription::create([
                'user_id' => $user->id,
                'plan' => $planSlug,
                'status' => SubscriptionStatus::ACTIVE,
                'starts_at' => now(),
                'expires_at' => $expiresAt,
                'cancelled_at' => null,
                'payment_method' => $paymentMethod,
            ]);

            $payment = $this->paymentService->createPending($user, $newSubscription, $amount);

            ProcessSimulatedPayment::dispatch($payment)->delay(now()->addSeconds(3));

            return [
                'subscription' => $newSubscription,
                'payment' => $payment,
            ];
        });
    }

    public function cancel(User $user): Subscription
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

        return $this->performCancellation($subscription);
    }

    private function performCancellation(Subscription $subscription): Subscription
    {
        $subscription->update([
            'status' => SubscriptionStatus::CANCELLED,
            'cancelled_at' => now(),
        ]);

        return $subscription->fresh();
    }
}