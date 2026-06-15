<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\User;
use App\Services\Auth\EmailVerificationService;
use App\Services\Auth\PendingRegistrationService;
use App\Traits\HandlesAuthResponses;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    use HandlesAuthResponses;

    public function __construct(
        private readonly EmailVerificationService $emailVerificationService
    ) {}

    public function register(RegisterRequest $request): JsonResponse
    {
        $pendingService = app(PendingRegistrationService::class);
        $pending = $pendingService->createAndSend($request->validated());

        // Return only the email so frontend can store it for resend
        return $this->successResponse(
            ['email' => $pending->email],
            'Registration initiated. Please check your email to verify your account.',
            201
        );
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->email)->first();

        // Auth::validate checks credentials without touching the session
        if (!$user || !Auth::validate($request->only('email', 'password'))) {
            return $this->errorResponse('authentication_failed', 'Invalid credentials', 401);
        }

        return $this->authenticateAndRespond($request, $user, 'Login successful');
    }

    public function logout(Request $request): JsonResponse
    {
        if ($request->hasSession()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        } else {
            $request->user()->currentAccessToken()->delete();
        }

        return $this->successResponse(null, 'Logged out successfully');
    }

    /**
     * Revoke all active tokens and sessions across all devices.
     */
    public function logoutAll(Request $request): JsonResponse
    {
        $user = $request->user();

        // Revoke all API tokens (Mobile/External clients)
        $user->tokens()->delete();

        // Invalidate current SPA session
        if ($request->hasSession()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return $this->successResponse(null, 'Logged out from all devices successfully.');
    }

    public function me(Request $request): JsonResponse
    {
        return $this->successResponse(
            new \App\Http\Resources\User\UserResource($request->user()->load('subscription.planDetails'))
        );
    }
}