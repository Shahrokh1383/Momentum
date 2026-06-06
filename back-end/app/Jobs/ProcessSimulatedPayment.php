<?php

namespace App\Jobs;

use App\Models\SimulatedPayment;
use App\Services\User\Subscription\SimulatedPaymentService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessSimulatedPayment implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public SimulatedPayment $payment
    ) {
    }

    public function handle(SimulatedPaymentService $paymentService): void
    {
        // In production, this would integrate with Stripe/PayPal/Adyen.
        // For simulation, we always approve after the queue delay.
        $paymentService->markSuccess($this->payment);
    }
}