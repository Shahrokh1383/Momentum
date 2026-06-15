<?php

namespace App\Services\Auth;

use App\Models\PendingRegistration;
use App\Models\User;
use App\Mail\VerificationMail;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;

class PendingRegistrationService
{
    /**
     * Create or refresh a pending registration and send verification email.
     */
    public function createAndSend(array $data): PendingRegistration
    {
        // Allow re-registration: delete any old pending record for this email
        PendingRegistration::where('email', $data['email'])->delete();

        $pending = PendingRegistration::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'], // already hashed by mutator
            'expires_at' => now()->addHours(24),
        ]);

        $this->sendVerificationEmail($pending);

        return $pending;
    }

    /**
     * Send verification email with a signed URL pointing to the same verify-email endpoint.
     */
    public function sendVerificationEmail(PendingRegistration $pending): void
    {
        $finalUrl = app(EmailVerificationService::class)
            ->generateVerificationUrl($pending->id, $pending->email);

        Mail::to($pending->email)->send(new VerificationMail($finalUrl));
    }

    /**
     * Verify a pending registration using the signed URL parameters.
     * Returns the newly created User or null on failure.
     */
    public function verify(int $id, string $hash): ?User
    {
        $pending = PendingRegistration::find($id);

        if (!$pending || !hash_equals(sha1($pending->email), $hash)) {
            return null;
        }

        // Create the actual user with verified email
        $user = User::create([
            'name'              => $pending->name,
            'email'             => $pending->email,
            'password'          => $pending->password,
            'email_verified_at' => now(),
        ]);

        // Clean up the pending record
        $pending->delete();

        return $user;
    }
}