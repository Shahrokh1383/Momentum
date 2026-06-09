<?php

namespace App\Services\Auth;

use App\Models\User;
use Illuminate\Support\Facades\URL;

class EmailVerificationService
{
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