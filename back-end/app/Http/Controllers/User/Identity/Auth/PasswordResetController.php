<?php

namespace App\Http\Controllers\User\Identity\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Services\User\Identity\Auth\PasswordResetService;
use Illuminate\Http\JsonResponse;

class PasswordResetController extends Controller
{
    public function __construct(
        private readonly PasswordResetService $passwordResetService
    ) {}

    /**
     * Send password reset email.
     * Always returns a generic success message to prevent email enumeration attacks.
     */
    public function forgot(ForgotPasswordRequest $request): JsonResponse
    {
        // The service handles token generation, persistence, and email dispatch (SRP)
        $this->passwordResetService->sendResetEmail($request->email);

        return $this->successResponse(
            null,
            'If an account with that email exists, a password reset link has been sent.'
        );
    }

    /**
     * Reset the user's password using a valid token.
     */
    public function reset(ResetPasswordRequest $request): JsonResponse
    {
        $success = $this->passwordResetService->resetPassword(
            $request->token,
            $request->email,
            $request->password
        );

        if (!$success) {
            return $this->errorResponse(
                'invalid_token',
                'The password reset link is invalid or has expired. Please request a new one.',
                422
            );
        }

        return $this->successResponse(null, 'Password reset successfully. You can now log in with your new password.');
    }
}