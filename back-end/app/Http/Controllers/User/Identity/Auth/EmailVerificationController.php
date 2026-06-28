<?php

namespace App\Http\Controllers\User\Identity\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ResendVerificationRequest;
use App\Http\Requests\Auth\VerifyEmailRequest;
use App\Models\Identity\PendingRegistration;
use App\Models\Identity\User;
use App\Services\User\Identity\Auth\EmailVerificationService;
use App\Services\User\Identity\Auth\PendingRegistrationService;
use App\Traits\HandlesAuthResponses;
use Illuminate\Http\JsonResponse;

class EmailVerificationController extends Controller
{
    use HandlesAuthResponses;

    public function __construct(
        private readonly EmailVerificationService $emailVerificationService,
        private readonly PendingRegistrationService $pendingRegistrationService
    ) {}

    /**
     * Note: InvalidVerificationSignatureException is globally handled by Laravel
     * and automatically returns a 422 JSON response. No try/catch needed here.
     */
    public function verify(VerifyEmailRequest $request): JsonResponse
    {
        $user = $this->emailVerificationService->verify(
            (int) $request->id,
            $request->hash,
            (int) $request->expires,
            $request->signature
        );

        // If the user was just promoted from PendingRegistration, they need to be logged in.
        // authenticateAndRespond handles SPA session vs API token seamlessly.
        if ($user->wasRecentlyCreated) {
            return $this->authenticateAndRespond(
                $request, 
                $user, 
                'Email verified successfully. You can now access your account.'
            );
        }

        // If it was an existing user just verifying their email, just return success.
        return $this->successResponse(null, 'Email verified successfully. You can now access your account.');
    }

    public function resend(ResendVerificationRequest $request): JsonResponse
    {
        $email = $request->email;

        $user = User::where('email', $email)->first();
        if ($user && !$user->hasVerifiedEmail()) {
            $this->emailVerificationService->sendVerificationEmail($user);
        } elseif (!$user) {
            $pending = PendingRegistration::where('email', $email)->first();
            if ($pending) {
                $this->pendingRegistrationService->sendVerificationEmail($pending);
            }
        }

        return $this->successResponse(null, 'If an account with that email exists and is unverified, a verification email has been sent.');
    }
}