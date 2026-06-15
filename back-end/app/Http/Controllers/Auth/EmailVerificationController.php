<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ResendVerificationRequest;
use App\Services\Auth\EmailVerificationService;
use App\Services\Auth\PendingRegistrationService;
use Illuminate\Support\Facades\Auth;
use App\Http\Resources\User\UserResource;
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
        $validated = $request->validate([
            'id'        => ['required', 'integer'],
            'hash'      => ['required', 'string'],
            'expires'   => ['required', 'integer'],
            'signature' => ['required', 'string'],
        ]);

        // Sort params and validate signature (unchanged)
        $queryParams = $validated;
        ksort($queryParams);
        $uri = $request->url() . '?' . http_build_query($queryParams);
        $syntheticRequest = Request::create($uri, 'GET');

        if (! $syntheticRequest->hasValidSignature(false)) {
            return $this->errorResponse(
                'invalid_token',
                'The verification link is invalid or has expired. Please request a new one.',
                422
            );
        }

        // Try existing User verification first (backward compatible)
        $user = User::find($validated['id']);
        if ($user) {
            $verified = $this->emailVerificationService->verifySignedUrl(
                $validated['id'],
                $validated['hash']
            );
            if ($verified) {
                return $this->successResponse(null, 'Email verified successfully. You can now access your account.');
            }
            return $this->errorResponse('verification_failed', 'Email verification failed.', 422);
        }

        // Fallback to pending registration verification
        $pendingService = app(PendingRegistrationService::class);
        $newUser = $pendingService->verify($validated['id'], $validated['hash']);

        if ($newUser) {
            // Log in the newly created user (stateful SPA)
            Auth::login($newUser);
            $request->session()->regenerate();

            return $this->successResponse(
                new UserResource($newUser->load('subscription.planDetails')),
                'Email verified successfully. You can now access your account.'
            );
        }

        return $this->errorResponse('verification_failed', 'Email verification failed.', 422);
    }

    public function resend(ResendVerificationRequest $request): JsonResponse
    {
        $email = $request->email;

        // Check existing unverified user
        $user = User::where('email', $email)->first();
        if ($user && !$user->hasVerifiedEmail()) {
            $this->emailVerificationService->sendVerificationEmail($user);
        } elseif (!$user) {
            // Check pending registration
            $pending = \App\Models\PendingRegistration::where('email', $email)->first();
            if ($pending) {
                $pendingService = app(\App\Services\Auth\PendingRegistrationService::class);
                $pendingService->sendVerificationEmail($pending);
            }
        }

        return $this->successResponse(null, 'If an account with that email exists and is unverified, a verification email has been sent.');
    }
}