<?php

namespace App\Services\Auth;

use App\Mail\VerificationMail;
use App\Models\SentEmailLog;
use App\Models\User;
use App\Enums\EmailType;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Mail;

class EmailVerificationService
{
    // Token expiration in minutes — matches auth.verification.expire config
    private const TOKEN_EXPIRY_MINUTES = 60;

    /**
     * Generate a signed verification token, persist it, and send the email.
     * SRP: This service owns the entire "send verification email" responsibility.
     */
    public function sendVerificationEmail(User $user): void
    {
        // Delete any previously issued tokens for this user to prevent stale tokens
        SentEmailLog::where('recipient_email', $user->email)
            ->where('type', EmailType::EMAIL_VERIFICATION)
            ->delete();

        $token = Str::random(64);
        $verificationUrl = $this->buildVerificationUrl($token, $user->email);

        SentEmailLog::create([
            'recipient_email' => $user->email,
            'subject'         => 'Verify Your Email Address',
            'body'            => $verificationUrl,
            'token'           => $token,
            'type'            => EmailType::EMAIL_VERIFICATION,
            'created_at'      => now(),
        ]);

        Mail::to($user->email)->send(new VerificationMail($verificationUrl));
    }

    /**
     * Verify a token and mark the user's email as verified.
     * Returns the User on success, null on failure.
     */
    public function verifyToken(string $token): ?User
    {
        $log = SentEmailLog::where('token', $token)
            ->where('type', EmailType::EMAIL_VERIFICATION)
            ->first();

        if (!$log) {
            return null;
        }

        // Enforce token expiration (KISS: simple timestamp comparison)
        if ($log->created_at->addMinutes(self::TOKEN_EXPIRY_MINUTES)->isPast()) {
            $log->delete();
            return null;
        }

        $user = User::where('email', $log->recipient_email)->first();

        if (!$user) {
            return null;
        }

        if (!$user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
        }

        // Token is consumed — delete it (one-time use)
        $log->delete();

        return $user;
    }

    /**
     * Build the frontend verification URL.
     * The frontend route receives token + email and calls the backend API.
     */
    private function buildVerificationUrl(string $token, string $email): string
    {
        $frontendUrl = rtrim(config('app.frontend_url', 'http://localhost:5173'), '/');

        return $frontendUrl . '/verify-email?' . http_build_query([
            'token' => $token,
            'email' => $email,
        ]);
    }
}