<?php

namespace App\Services\User\Billing;

use App\Enums\Billing\PaymentStatus;
use App\Enums\Billing\SubscriptionStatus;
use App\Mail\Billing\SubscriptionConfirmedMail;
use App\Models\Billing\Payment;
use App\Models\Billing\Plan;
use App\Models\Billing\Subscription;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class PaymenterService
{
    private string $apiUrl;
    private string $apiKey;
    private string $webhookSecret;

    public function __construct()
    {
        $this->apiUrl = config('services.paymenter.url');
        $this->apiKey = config('services.paymenter.key');
        $this->webhookSecret = config('services.paymenter.webhook_secret');
    }

    // ──────────────────────────────
    // Payment Initiation
    // ──────────────────────────────
    public function initiatePayment(Subscription $subscription, float $amount, string $callbackUrl): Payment
    {
        // Create the Payment record immediately
        $payment = Payment::create([
            'user_id'                => $subscription->user_id,
            'subscription_id'        => $subscription->id,
            'amount'                 => $amount,
            'currency'               => config('services.paymenter.currency'),
            'status'                 => PaymentStatus::PENDING,
            'gateway_transaction_id' => null,
        ]);

        try {
            $gatewayResponse = $this->createSession(
                $amount,
                config('services.paymenter.currency'),
                $subscription->user->email,
                $callbackUrl
            );
        } catch (\Exception $e) {
            $payment->update(['status' => PaymentStatus::FAILED]);
            $subscription->update(['status' => SubscriptionStatus::PAYMENT_FAILED]);
            throw $e;
        }

        $payment->update(['gateway_response' => $gatewayResponse]);

        return $payment;
    }

    // ──────────────────────────────
    // Read-Only Lookup for Polling
    // ──────────────────────────────
    public function getPaymentByTransactionId(string $transactionId): ?Payment
    {
        return Payment::where('gateway_transaction_id', $transactionId)
            ->latest()
            ->first();
    }

    // ──────────────────────────────
    // Webhook Handling
    // ──────────────────────────────
    public function handleWebhook(Request $request): void
    {
        $signature = $request->header('X-Paymenter-Signature');
        $payload = $request->getContent();

        // Verify HMAC signature
        $computed = 'sha256=' . hash_hmac('sha256', $payload, $this->webhookSecret);
        if (!hash_equals($signature, $computed)) {
            Log::warning('Paymenter webhook signature invalid');
            abort(401, 'Invalid signature');
        }

        $data = json_decode($payload, true);
        if (!$data || !isset($data['transaction_id'])) {
            abort(400, 'Invalid payload');
        }

        $payment = Payment::where('gateway_transaction_id', $data['transaction_id'])->first();
        if (!$payment) {
            Log::warning('Paymenter webhook: payment not found', ['transaction_id' => $data['transaction_id']]);
            abort(404, 'Payment not found');
        }

        $this->fulfillPayment($payment, $data['event'], $data);
    }

    // ──────────────────────────────
    // Refund Initiation (only API call, no DB update)
    // ──────────────────────────────
    public function initiateRefund(Payment $payment): array
    {
        return $this->refund($payment->gateway_transaction_id);
    }

    // ──────────────────────────────
    // PRIVATE: Gateway API Calls
    // ──────────────────────────────
    private function httpClient()
    {
        return Http::withHeaders(['x-api-key' => $this->apiKey])->timeout(15);
    }

    private function createSession(float $amount, string $currencyCode, string $userEmail, string $callbackUrl): array
    {
        $response = $this->httpClient()->post("{$this->apiUrl}/pay", [
            'amount'        => $amount,
            'currency_code' => $currencyCode,
            'user_email'    => $userEmail,
            'callback_url'  => $callbackUrl,
        ]);

        if ($response->successful()) {
            return $response->json();
        }

        Log::error('Paymenter: Session creation failed', [
            'status' => $response->status(),
            'body' => $response->json(),
        ]);

        throw new \Exception($response->json('error', 'Session creation failed.'), $response->status());
    }

    private function refund(string $transactionId): array
    {
        $response = $this->httpClient()->post("{$this->apiUrl}/refund", [
            'transaction_id' => $transactionId,
        ]);

        if ($response->successful()) {
            return $response->json();
        }

        Log::error('Paymenter: Refund failed', [
            'status' => $response->status(),
            'body' => $response->json(),
        ]);

        throw new \Exception($response->json('error', 'Refund failed.'), $response->status());
    }

    // ──────────────────────────────
    // PRIVATE: Business Fulfillment
    // ──────────────────────────────
    private function fulfillPayment(Payment $payment, string $event, array $data): void
    {
        // Idempotency: only act if payment is still pending
        if ($payment->status !== PaymentStatus::PENDING) {
            Log::info('Paymenter webhook: payment already processed', [
                'transaction_id' => $data['transaction_id'],
                'current_status' => $payment->status->value,
            ]);
            return;
        }

        match ($event) {
            'payment.completed' => $this->completePayment($payment, $data),
            'payment.failed'    => $this->failPayment($payment, $data),
            'payment.refunded'  => $this->refundPayment($payment, $data),
            default => Log::warning('Unknown webhook event', ['event' => $event]),
        };
    }

    private function completePayment(Payment $payment, array $data): void
    {
        DB::transaction(function () use ($payment, $data) {
            $payment->update([
                'status'           => PaymentStatus::SUCCESS,
                'paid_at'          => now(),
                'gateway_response' => array_merge($payment->gateway_response ?? [], $data),
            ]);

            $subscription = $payment->subscription;
            $plan = Plan::where('slug', $subscription->plan->value)->first();
            $expiresAt = ($plan && $plan->duration_months)
                ? now()->addMonths($plan->duration_months)
                : null;

            $subscription->update([
                'status'     => SubscriptionStatus::ACTIVE,
                'starts_at'  => now(),
                'expires_at' => $expiresAt,
            ]);

            // Keep user.plan_slug in sync
            $subscription->user->update(['plan_slug' => $subscription->plan]);
        });

        // Refresh relations for the mail
        $payment->refresh();
        $subscription = $payment->subscription;
        $plan = Plan::where('slug', $subscription->plan->value)->first();

        Mail::to($subscription->user->email)->queue(
            new SubscriptionConfirmedMail($subscription, $payment, $plan)
        );
    }

    private function failPayment(Payment $payment, array $data): void
    {
        DB::transaction(function () use ($payment, $data) {
            $payment->update([
                'status'           => PaymentStatus::FAILED,
                'gateway_response' => array_merge($payment->gateway_response ?? [], $data),
            ]);

            $payment->subscription->update([
                'status' => SubscriptionStatus::PAYMENT_FAILED,
            ]);
        });
    }

    private function refundPayment(Payment $payment, array $data): void
    {
        DB::transaction(function () use ($payment, $data) {
            $payment->update([
                'status'           => PaymentStatus::REFUNDED,
                'refunded_at'      => now(),
                'gateway_response' => array_merge($payment->gateway_response ?? [], $data),
            ]);

            // Optionally mark subscription as cancelled if it was active
            $subscription = $payment->subscription;
            if ($subscription->status === SubscriptionStatus::ACTIVE) {
                $subscription->update([
                    'status'       => SubscriptionStatus::CANCELLED,
                    'cancelled_at' => now(),
                    'plan'         => \App\Enums\Billing\PlanSlug::FREE,
                ]);
                $subscription->user->update(['plan_slug' => \App\Enums\Billing\PlanSlug::FREE]);
            }
        });
    }
}