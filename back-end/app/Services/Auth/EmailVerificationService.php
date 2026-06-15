<?php

namespace App\Services\Auth;

use App\Models\User;
use Illuminate\Support\Facades\URL;

class EmailVerificationService
{
    /**
     * Generate the frontend-compatible signed verification URL.
     * Centralized to adhere to DRY principles across User and PendingRegistration models.
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
     * Validate the cryptographic signature of the Laravel Signed URL.
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
}