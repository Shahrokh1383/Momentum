<?php

namespace App\Services\User\Identity\Auth;

use App\Exceptions\Identity\InvalidVerificationSignatureException;
use App\Models\Identity\PendingRegistration;
use App\Models\Identity\User;
use App\Services\User\Identity\Auth\PendingRegistrationService;
use Carbon\Carbon;
use Illuminate\Support\Facades\URL;

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
     * Validates signature, then promotes a PendingRegistration if the link was for a pending record,
     * otherwise falls back to verifying an existing user's email.
     *
     * @throws InvalidVerificationSignatureException
     */
    public function verify(int $id, string $hash, int $expires, string $signature): User
    {
        // 1. Validate cryptographic signature (global check)
        if (! $this->hasValidSignature($id, $hash, $expires, $signature)) {
            throw new InvalidVerificationSignatureException();
        }

        // 2. Priority: Check pending registrations first to avoid ID collision with users table
        $pending = PendingRegistration::find($id);
        if ($pending && hash_equals(sha1($pending->email), $hash)) {
            $pendingService = app(PendingRegistrationService::class);
            $newUser = $pendingService->verify($id, $hash);

            if (! $newUser) {
                // Promotion failed unexpectedly
                throw new InvalidVerificationSignatureException();
            }

            return $newUser;
        }

        // 3. Fallback: Existing user verification (backward compatibility)
        $user = User::find($id);
        if ($user) {
            if (! hash_equals(sha1($user->getEmailForVerification()), $hash)) {
                throw new InvalidVerificationSignatureException();
            }

            if (! $user->hasVerifiedEmail()) {
                $user->markEmailAsVerified();
            }

            return $user;
        }

        // 4. No matching record found
        throw new InvalidVerificationSignatureException();
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