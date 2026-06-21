<?php

namespace App\Console\Commands;

use App\Enums\PaymentStatus;
use App\Enums\PlanSlug;
use App\Enums\SubscriptionStatus;
use App\Events\SubscriptionExpired;
use App\Models\Subscription;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CheckSubscriptionStatus extends Command
{
    protected $signature = 'subscriptions:check-status';
    protected $description = 'Handle natural expirations, clean up old cancelled, and fail abandoned pending subscriptions';

    public function handle(): int
    {
        // 1. Natural Expiration: Downgrade to FREE using Atomic Updates
        $expiredCount = 0;

        Subscription::where('status', SubscriptionStatus::ACTIVE)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now())
            ->chunkById(100, function ($subscriptions) use (&$expiredCount) {
                foreach ($subscriptions as $subscription) {
                    $affectedRows = DB::table('subscriptions')
                        ->where('id', $subscription->id)
                        ->where('status', SubscriptionStatus::ACTIVE->value)
                        ->update([
                            'status'     => SubscriptionStatus::EXPIRED->value,
                            'plan'       => PlanSlug::FREE->value,
                            'updated_at' => now(),
                        ]);

                    if ($affectedRows > 0) {
                        $subscription->refresh();

                        // Keep users.plan_slug in sync with the subscription
                        $subscription->user->update(['plan_slug' => PlanSlug::FREE]);

                        event(new SubscriptionExpired($subscription));
                        $expiredCount++;
                    }
                }
            });

        // 2. DB Hygiene: Hard delete 30-day old cancelled subscriptions
        $deletedCount = Subscription::where('status', SubscriptionStatus::CANCELLED)
            ->whereNotNull('cancelled_at')
            ->where('cancelled_at', '<', now()->subDays(30))
            ->delete();

        // 3. Abandoned Payments: Cancel subscriptions pending payment for over 1 hour
        $abandonedCount = 0;
        Subscription::where('status', SubscriptionStatus::PENDING_PAYMENT)
            ->where('created_at', '<', now()->subHour())
            ->chunkById(100, function ($subscriptions) use (&$abandonedCount) {
                foreach ($subscriptions as $subscription) {
                    DB::transaction(function () use ($subscription) {
                        // Mark the pending payment as failed
                        $subscription->payments()
                            ->where('status', PaymentStatus::PENDING)
                            ->update(['status' => PaymentStatus::FAILED->value]);

                        // Cancel the subscription
                        $subscription->update([
                            'status'       => SubscriptionStatus::CANCELLED,
                            'cancelled_at' => now(),
                        ]);
                    });
                    $abandonedCount++;
                }
            });

        $this->info("Downgraded {$expiredCount} expired subscriptions to Free plan.");
        $this->info("Permanently deleted {$deletedCount} old cancelled subscriptions.");
        $this->info("Cancelled {$abandonedCount} abandoned pending payment subscriptions.");

        return Command::SUCCESS;
    }
}