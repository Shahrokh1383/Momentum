<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\Auth\EmailVerificationService;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;

class EmailVerificationController extends Controller
{
    public function __construct(
        private readonly EmailVerificationService $emailVerificationService
    ) {}

     /**
     * Verify the email using the signed URL parameters.
     */
    public function verify(Request $request): JsonResponse
    {
        $request->validate([
            'id'        => ['required', 'integer'],
            'hash'      => ['required', 'string'],
            'expires'   => ['required', 'integer'],
            'signature' => ['required', 'string'],
        ]);

        // 1. Verify the RELATIVE cryptographic signature and expiration (2nd parameter = false)
        if (!URL::hasValidSignature($request, false)) {
            return $this->errorResponse(
                'invalid_token',
                'The verification link is invalid or has expired. Please request a new one.',
                422
            );
        }

        // 2. Verify the user hash and mark as verified
        $verified = $this->emailVerificationService->verifySignedUrl(
            $request->id,
            $request->hash
        );

        if (!$verified) {
            return $this->errorResponse('verification_failed', 'Email verification failed.', 422);
        }

        return $this->successResponse(null, 'Email verified successfully. You can now access your account.');
    }

    /**
     * Resend the verification email to the user.
     */
    public function resend(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email', 'exists:users,email'],
        ]);

        $user = User::where('email', $request->email)->firstOrFail();

        if ($user->hasVerifiedEmail()) {
            return $this->successResponse(null, 'Your email is already verified.');
        }

        $this->emailVerificationService->sendVerificationEmail($user);

        return $this->successResponse(null, 'Verification email sent. Please check your inbox.');
    }
}