<?php

namespace App\Listeners\Billing;

use App\Events\Billing\SubscriptionExpired;
use App\Mail\Billing\SubscriptionExpiredMail;
use Illuminate\Support\Facades\Mail;

class SendSubscriptionExpiredEmailListener
{
    public function __construct()
    {
        //
    }

    public function handle(SubscriptionExpired $event): void
    {
        Mail::to($event->subscription->user)->queue(
            new SubscriptionExpiredMail($event->subscription)
        );
    }
}