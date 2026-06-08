<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\Auth\EmailVerificationService;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmailVerificationController extends Controller
{
    public function __construct(
        private readonly EmailVerificationService $emailVerificationService
    ) {}

    /**
     * Verify the email using the token from the URL query string.
     * The frontend receives this token from the email link and calls this endpoint.
     */
    public function verify(Request $request): JsonResponse
    {
        $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
        ]);

        $user = $this->emailVerificationService->verifyToken($request->token);

        if (!$user) {
            return $this->errorResponse(
                'invalid_token',
                'The verification link is invalid or has expired. Please request a new one.',
                422
            );
        }

        return $this->successResponse(null, 'Email verified successfully. You can now access your account.');
    }

    /**
     * Resend the verification email to the authenticated user.
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