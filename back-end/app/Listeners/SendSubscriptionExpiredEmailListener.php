<?php

namespace App\Listeners;

use App\Events\SubscriptionExpired;
use App\Mail\SubscriptionExpiredMail;
use Illuminate\Support\Facades\Mail;

class SendSubscriptionExpiredEmailListener
{
    /**
     * Create the event listener.
     */
    public function __construct()
    {
        //
    }

    /**
     * Handle the event.
     */
    public function handle(SubscriptionExpired $event): void
    {
        // Queue the email to the subscription's user
        Mail::to($event->subscription->user)->queue(
            new SubscriptionExpiredMail($event->subscription)
        );
    }
}