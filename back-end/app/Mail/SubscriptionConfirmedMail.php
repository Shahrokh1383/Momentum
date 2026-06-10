<?php

namespace App\Mail;

use App\Models\Payment;
use App\Models\Plan;
use App\Models\Subscription;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SubscriptionConfirmedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Subscription $subscription,
        public readonly Payment $payment,
        public readonly Plan $plan
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your Subscription is Active — ' . $this->plan->name,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.subscription-confirmed',
        );
    }
}