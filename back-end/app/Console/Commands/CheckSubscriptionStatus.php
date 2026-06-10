<?php

namespace App\Console\Commands;

use App\Enums\PlanSlug;
use App\Enums\SubscriptionStatus;
use App\Models\Subscription;
use Illuminate\Console\Command;

class CheckSubscriptionStatus extends Command
{
    protected $signature = 'subscriptions:check-status';
    protected $description = 'Handle natural expirations and clean up old cancelled subscriptions';

    public function handle(): int
    {
        // 1. Natural Expiration: Downgrade to FREE
        $expiredCount = 0;
        Subscription::where('status', SubscriptionStatus::ACTIVE)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now())
            ->chunkById(100, function ($subscriptions) use (&$expiredCount) {
                foreach ($subscriptions as $subscription) {
                    $subscription->update([
                        'status' => SubscriptionStatus::EXPIRED,
                        'plan'   => PlanSlug::FREE,
                    ]);
                    $expiredCount++;
                }
            });

        // 2. DB Hygiene: Hard delete 30-day old cancelled subscriptions
        $deletedCount = Subscription::where('status', SubscriptionStatus::CANCELLED)
            ->whereNotNull('cancelled_at')
            ->where('cancelled_at', '<', now()->subDays(30))
            ->delete();

        $this->info("Downgraded {$expiredCount} expired subscriptions to Free plan.");
        $this->info("Permanently deleted {$deletedCount} old cancelled subscriptions.");
        
        return Command::SUCCESS;
    }
}