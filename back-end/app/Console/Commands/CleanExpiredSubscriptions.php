<?php

namespace App\Console\Commands;

use App\Enums\SubscriptionStatus;
use App\Events\SubscriptionExpired;
use App\Models\Subscription;
use Illuminate\Console\Command;

class CleanExpiredSubscriptions extends Command
{
    protected $signature = 'subscriptions:clean-expired';
    protected $description = 'Set status to expired for subscriptions past their expires_at timestamp';

    public function handle(): int
    {
        $count = 0;

        Subscription::where('status', SubscriptionStatus::ACTIVE)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now())
            ->chunkById(100, function ($subscriptions) use (&$count) {
                foreach ($subscriptions as $subscription) {
                    $subscription->update(['status' => SubscriptionStatus::EXPIRED]);
                    SubscriptionExpired::dispatch($subscription);
                    $count++;
                }
            });

        $this->info("Expired {$count} subscriptions.");
        
        return Command::SUCCESS;
    }
}