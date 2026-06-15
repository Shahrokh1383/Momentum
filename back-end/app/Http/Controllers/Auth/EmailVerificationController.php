<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ResendVerificationRequest;
use App\Services\Auth\EmailVerificationService;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmailVerificationController extends Controller
{
    public function __construct(
        private readonly EmailVerificationService $emailVerificationService
    ) {}

    public function verify(Request $request): JsonResponse
    {
        $request->validate([
            'id'        => ['required', 'integer'],
            'hash'      => ['required', 'string'],
            'expires'   => ['required', 'integer'],
            'signature' => ['required', 'string'],
        ]);

        // The frontend sends parameters in the query string (e.g., POST /verify-email?id=1&hash=...).
        // Laravel's native hasValidSignature checks the query string, making the synthetic request redundant.
        if (!$request->hasValidSignature(false)) {
            return $this->errorResponse(
                'invalid_token',
                'The verification link is invalid or has expired. Please request a new one.',
                422
            );
        }

        $verified = $this->emailVerificationService->verifySignedUrl(
            $request->id,
            $request->hash
        );

        if (!$verified) {
            return $this->errorResponse('verification_failed', 'Email verification failed.', 422);
        }

        return $this->successResponse(null, 'Email verified successfully. You can now access your account.');
    }

    public function resend(ResendVerificationRequest $request): JsonResponse
    {
        $user = User::where('email', $request->email)->first();

        if ($user && !$user->hasVerifiedEmail()) {
            $this->emailVerificationService->sendVerificationEmail($user);
        }

        return $this->successResponse(null, 'If an account with that email exists and is unverified, a verification email has been sent.');
    }
}