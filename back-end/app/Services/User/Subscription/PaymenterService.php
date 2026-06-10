<?php

namespace App\Services\User\Subscription;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PaymenterService
{
    private string $apiUrl;
    private string $apiKey;
    private string $currency;

    public function __construct()
    {
        $this->apiUrl = config('services.paymenter.url');
        $this->apiKey = config('services.paymenter.key');
        $this->currency = config('services.paymenter.currency');
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
     * Initiate a payment — holds funds on user's card.
     *
     * @param string $userCardNumber
     * @param float $amount 
     * @return array{transaction_id: int, status: string}
     * @throws \Exception
     */
    public function pay(string $userCardNumber, float $amount): array
    {
        try {
            $response = $this->httpClient()->post("{$this->apiUrl}/pay", [
                'destination_card_number' => $userCardNumber, 
                'amount' => $amount,
                'currency_code' => $this->currency,
            ]);

            if ($response->successful()) {
                Log::info('Paymenter: Payment initiated', $response->json());
                return $response->json();
            }

            Log::error('Paymenter: Payment failed', [
                'status' => $response->status(),
                'body' => $response->json(),
            ]);

            throw new \Exception(
                $response->json('error', 'Payment initiation failed.'),
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

            Log::error('Paymenter: Verification failed', [
                'transaction_id' => $transactionId,
                'status' => $response->status(),
                'body' => $response->json(),
            ]);

            throw new \Exception(
                $response->json('error', 'Verification failed.'),
                $response->status()
            );
            
        } catch (ConnectionException $e) {
            Log::error('Paymenter: Connection failed during verify', ['error' => $e->getMessage()]);
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
                Log::info('Paymenter: Refund processed', $response->json());
                return $response->json();
            }

            Log::error('Paymenter: Refund failed', [
                'transaction_id' => $transactionId,
                'status' => $response->status(),
                'body' => $response->json(),
            ]);

            throw new \Exception(
                $response->json('error', 'Refund failed.'),
                $response->status()
            );

        } catch (ConnectionException $e) {
            Log::error('Paymenter: Connection failed during refund', ['error' => $e->getMessage()]);
            throw new \Exception('Payment gateway is unreachable during refund.', 503);
        }
    }
}