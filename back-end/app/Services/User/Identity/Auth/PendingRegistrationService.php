<?php

namespace App\Services\User\Identity\Auth;

use App\Mail\Auth\VerificationMail;
use App\Models\Identity\PendingRegistration;
use App\Models\Identity\User;
use App\Services\User\Identity\Auth\EmailVerificationService;
use Illuminate\Support\Facades\Mail;

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
            'password' => $data['password'], // Mutator in model handles hashing
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

        // Create the actual user with verified email (excluding password to avoid double-hashing via Eloquent cast)
        $user = User::create([
            'name'              => $pending->name,
            'email'             => $pending->email,
            'email_verified_at' => now(),
        ]);

        // Update password directly via query builder to bypass Eloquent's 'hashed' cast
        User::where('id', $user->id)->update(['password' => $pending->password]);

        // Clean up the pending record
        $pending->delete();

        return $user;
    }
}