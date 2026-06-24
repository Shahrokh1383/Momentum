<?php

namespace App\Services\User\Identity\Auth;

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
            false // Relative URL
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
     * Validate an existing User's email verification.
     */
    public function verifySignedUrl(int $id, string $hash): bool
    {
        $user = User::find($id);

        if (!$user || !hash_equals(sha1($user->getEmailForVerification()), $hash)) {
            return false;
        }

        if ($user->hasVerifiedEmail()) {
            return true;
        }

        return $user->markEmailAsVerified();
    }

    /**
     * Cryptographically verify the signed URL parameters.
     * Bypasses manual HMAC reconstruction by regenerating the signed URL 
     * using Laravel's own engine with the exact same parameters and expiration.
     */
    public function hasValidSignature(int $id, string $hash, int $expires, string $signature): bool
    {
        // 1. Check expiration immediately
        if (now()->greaterThan(Carbon::createFromTimestamp($expires))) {
            return false;
        }

        // 2. Regenerate the signed URL using the exact same expiration and parameters
        $expectedUrl = URL::temporarySignedRoute(
            'api.verification.verify',
            Carbon::createFromTimestamp($expires),
            ['id' => $id, 'hash' => $hash],
            false
        );

        // 3. Extract the signature from the regenerated URL
        parse_str(parse_url($expectedUrl, PHP_URL_QUERY), $queryParams);
        $expectedSignature = $queryParams['signature'] ?? '';

        // 4. Constant-time comparison to prevent timing attacks
        return hash_equals($expectedSignature, $signature);
    }
}