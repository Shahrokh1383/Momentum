<?php

namespace App\Services\User\Billing;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PaymenterService
{
    private string $apiUrl;
    private string $apiKey;

    public function __construct()
    {
        $this->apiUrl = config('services.paymenter.url');
        $this->apiKey = config('services.paymenter.key');
    }

    /**
     * Build the base HTTP client.
     * Adheres to DRY by centralizing HTTP setup.
     */
    private function httpClient()
    {
        return Http::withHeaders([
            'x-api-key' => $this->apiKey,
        ])->timeout(15);
    }

    /**
     *  Create a Payment Session (Intent) for Hosted Payment Page
     */
    public function createSession(float $amount, string $currencyCode, string $userEmail, string $callbackUrl): array
    {
        try {
            $response = $this->httpClient()->post("{$this->apiUrl}/pay", [
                'amount'        => $amount,
                'currency_code' => $currencyCode,
                'user_email'    => $userEmail,
                'callback_url'  => $callbackUrl,
            ]);

            if ($response->successful()) {
                Log::info('Paymenter: Session created', $response->json());
                return $response->json();
            }

            Log::error('Paymenter: Session creation failed', [
                'status' => $response->status(),
                'body' => $response->json(),
            ]);

            throw new \Exception(
                $response->json('error', 'Payment session creation failed.'),
                $response->status()
            );

        } catch (ConnectionException $e) {
            Log::error('Paymenter: Connection failed', ['error' => $e->getMessage()]);
            throw new \Exception('Payment gateway is unreachable. Please check your connection.', 503);
        }
    }

    /**
     * Verify a transaction status.
     *
     * @return array{status: string, ...}
     * @throws \Exception
     */
    public function verify(int $transactionId): array
    {
        try {
            $response = $this->httpClient()->get("{$this->apiUrl}/verify/{$transactionId}");

            if ($response->successful()) {
                return $response->json();
            }

            throw new \Exception(
                $response->json('error', 'Verification failed.'),
                $response->status()
            );
            
        } catch (ConnectionException $e) {
            throw new \Exception('Payment gateway is unreachable during verification.', 503);
        }
    }

    /**
     * Refund a completed transaction.
     *
     * @return array{status: string, ...}
     * @throws \Exception
     */
    public function refund(int $transactionId): array
    {
        try {
            $response = $this->httpClient()->post("{$this->apiUrl}/refund", [
                'transaction_id' => $transactionId,
            ]);

            if ($response->successful()) {
                return $response->json();
            }

            throw new \Exception(
                $response->json('error', 'Refund failed.'),
                $response->status()
            );

        } catch (ConnectionException $e) {
            throw new \Exception('Payment gateway is unreachable during refund.', 503);
        }
    }
}