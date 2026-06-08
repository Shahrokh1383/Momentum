<?php

namespace App\Services\Auth;

use App\Enums\EmailType;
use App\Mail\PasswordResetMail;
use App\Models\SentEmailLog;
use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Mail;

class PasswordResetService
{
    // Token expiration in minutes — matches auth.passwords.users.expire config
    private const TOKEN_EXPIRY_MINUTES = 60;

    /**
     * Generate a reset token, persist it, and dispatch the email.
     * SRP: This service owns the entire "send password reset email" responsibility.
     */
    public function sendResetEmail(string $email): void
    {
        // Invalidate any previously issued reset tokens for this email (security: one active token at a time)
        SentEmailLog::where('recipient_email', $email)
            ->where('type', EmailType::PASSWORD_RESET)
            ->delete();

        $token    = Str::random(64);
        $resetUrl = $this->buildResetUrl($token, $email);

        SentEmailLog::create([
            'recipient_email' => $email,
            'subject'         => 'Reset Your Password',
            'body'            => $resetUrl,
            'token'           => $token,
            'type'            => EmailType::PASSWORD_RESET,
            'created_at'      => now(),
        ]);

        Mail::to($email)->send(new PasswordResetMail($resetUrl));
    }

    /**
     * Validate the reset token and update the user's password.
     * Returns true on success, false on invalid/expired token.
     */
    public function resetPassword(string $token, string $email, string $newPassword): bool
    {
        $log = SentEmailLog::where('token', $token)
            ->where('type', EmailType::PASSWORD_RESET)
            ->where('recipient_email', $email)
            ->first();

        if (!$log) {
            return false;
        }

        // Enforce token expiration
        if ($log->created_at->addMinutes(self::TOKEN_EXPIRY_MINUTES)->isPast()) {
            $log->delete();
            return false;
        }

        $user = User::where('email', $email)->first();

        if (!$user) {
            return false;
        }

        $user->update(['password' => $newPassword]);

        // Token is consumed — delete it (one-time use)
        $log->delete();

        return true;
    }

    /**
     * Build the frontend reset URL that the email link points to.
     */
    private function buildResetUrl(string $token, string $email): string
    {
        $frontendUrl = rtrim(config('app.frontend_url', 'http://localhost:5173'), '/');

        return $frontendUrl . '/reset-password?' . http_build_query([
            'token' => $token,
            'email' => $email,
        ]);
    }
}