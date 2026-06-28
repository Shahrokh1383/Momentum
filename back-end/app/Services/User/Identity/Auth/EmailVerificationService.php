<?php

namespace App\Services\User\Identity\Auth;

use App\Exceptions\Identity\InvalidVerificationSignatureException;
use App\Models\Identity\User;
use Illuminate\Support\Facades\URL;
use Carbon\Carbon;

class EmailVerificationService
{
    /**
     * Generate the frontend-compatible signed verification URL.
     */
    public function generateVerificationUrl(int $id, string $email): string
    {
        $frontendUrl = rtrim(config('app.frontend_url', 'http://localhost:5173'), '/');

        $verificationUrl = URL::temporarySignedRoute(
            'api.verification.verify',
            now()->addMinutes(60),
            ['id' => $id, 'hash' => sha1($email)],
            false
        );

        return $frontendUrl . '/verify-email?' . parse_url($verificationUrl, PHP_URL_QUERY);
    }

    /**
     * Triggers the notification process delegated to the User entity.
     */
    public function sendVerificationEmail(User $user): void
    {
        $user->sendEmailVerificationNotification();
    }

    /**
     * Centralized verification orchestration.
     * Validates signature, checks existing users, and falls back to pending registrations.
     * 
     * @throws InvalidVerificationSignatureException
     */
    public function verify(int $id, string $hash, int $expires, string $signature): User
    {
        // 1. Validate Cryptographic Signature
        if (! $this->hasValidSignature($id, $hash, $expires, $signature)) {
            throw new InvalidVerificationSignatureException();
        }

        // 2. Try existing User verification (backward compatible)
        $user = User::find($id);
        if ($user) {
            if (!hash_equals(sha1($user->getEmailForVerification()), $hash)) {
                throw new InvalidVerificationSignatureException();
            }

            if (!$user->hasVerifiedEmail()) {
                $user->markEmailAsVerified();
            }

            return $user;
        }

        // 3. Fallback to pending registration promotion
        $pendingService = app(PendingRegistrationService::class);
        $newUser = $pendingService->verify($id, $hash);

        if (!$newUser) {
            throw new InvalidVerificationSignatureException();
        }

        return $newUser;
    }

    /**
     * Cryptographically verify the signed URL parameters.
     */
    private function hasValidSignature(int $id, string $hash, int $expires, string $signature): bool
    {
        if (now()->greaterThan(Carbon::createFromTimestamp($expires))) {
            return false;
        }

        $expectedUrl = URL::temporarySignedRoute(
            'api.verification.verify',
            Carbon::createFromTimestamp($expires),
            ['id' => $id, 'hash' => $hash],
            false
        );

        parse_str(parse_url($expectedUrl, PHP_URL_QUERY), $queryParams);
        $expectedSignature = $queryParams['signature'] ?? '';

        return hash_equals($expectedSignature, $signature);
    }
}