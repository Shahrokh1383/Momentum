<?php

namespace App\Console\Commands;

use App\Enums\PlanSlug;
use App\Enums\SubscriptionStatus;
use App\Events\SubscriptionExpired;
use App\Models\Subscription;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CheckSubscriptionStatus extends Command
{
    protected $signature = 'subscriptions:check-status';
    protected $description = 'Handle natural expirations and clean up old cancelled subscriptions';

    public function handle(): int
    {
        // 1. Natural Expiration: Downgrade to FREE using Atomic Updates
        $expiredCount = 0;
        
        // We still chunk to avoid memory exhaustion on large datasets
        Subscription::where('status', SubscriptionStatus::ACTIVE)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now())
            ->chunkById(100, function ($subscriptions) use (&$expiredCount) {
                foreach ($subscriptions as $subscription) {
                    // ATOMIC UPDATE: We enforce the status check at the database level.
                    // If another process (or an overlapping run) already updated this row,
                    // affectedRows will be 0, preventing duplicate event dispatches.
                    $affectedRows = DB::table('subscriptions')
                        ->where('id', $subscription->id)
                        ->where('status', SubscriptionStatus::ACTIVE->value) // Ensure it's still active in DB
                        ->update([
                            'status' => SubscriptionStatus::EXPIRED->value,
                            'plan'   => PlanSlug::FREE->value,
                            'updated_at' => now(),
                        ]);

                    if ($affectedRows > 0) {
                        // Refresh the Eloquent model to reflect the new DB state
                        $subscription->refresh();
                        
                        // Dispatch event ONLY if this specific process successfully updated the row
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

        $this->info("Downgraded {$expiredCount} expired subscriptions to Free plan.");
        $this->info("Permanently deleted {$deletedCount} old cancelled subscriptions.");
        
        return Command::SUCCESS;
    }
}