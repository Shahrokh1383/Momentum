<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\User\UserResource;
use App\Models\User;
use App\Services\Auth\EmailVerificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class AuthController extends Controller
{
    public function __construct(
        private readonly EmailVerificationService $emailVerificationService
    ) {}

    public function register(RegisterRequest $request): JsonResponse
    {
        $user = DB::transaction(function () use ($request) {
            $user = User::create($request->validated());

            // Send real verification email via dedicated service (SRP)
            $this->emailVerificationService->sendVerificationEmail($user);

            return $user;
        });

        // Auto-login kept outside transaction: session management is not a DB concern (SRP)
        Auth::login($user);
        $request->session()->regenerate();

        return $this->successResponse(
            new UserResource($user->load('subscription.planDetails')),
            'Registration successful. Please check your email to verify your account.',
            201
        );
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->email)->first();

        // Auth::validate only checks credentials without touching the session (SRP & Stateless safe)
        if (!$user || !Auth::validate($request->only('email', 'password'))) {
            return $this->errorResponse('authentication_failed', 'Invalid credentials', 401);
        }

        return $this->authenticateAndRespond($request, $user, 'Login successful');
    }

    public function logout(Request $request): JsonResponse
    {
         if ($request->hasSession()) {
            // SPA Logout: Invalidate session
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        } else {
            // API/Mobile Logout: Revoke the Bearer token
            $request->user()->currentAccessToken()->delete();
        }

        return $this->successResponse(null, 'Logged out successfully');
    }

    public function me(Request $request): JsonResponse
    {
        return $this->successResponse(
            new UserResource($request->user()->load('subscription.planDetails'))
        );
    }

    /**
     * Centralized Authentication Response
     * Handles both Stateful (SPA) and Stateless (API) authentication flows.
     */
    private function authenticateAndRespond(Request $request, User $user, string $message, int $status = 200): JsonResponse
    {
        if ($request->hasSession()) {
            // Stateful (React SPA): Authenticate via Session/Cookie
            Auth::login($user, $request->boolean('remember'));
            $request->session()->regenerate();

            return $this->successResponse(
                new UserResource($user->load('subscription.planDetails')),
                $message,
                $status
            );
        }

        // Stateless (Postman/Mobile): Authenticate via Bearer Token
        $token = $user->createToken('auth-token')->plainTextToken;

        return $this->successResponse(
            [
                'user' => new UserResource($user->load('subscription.planDetails')),
                'token' => $token,
            ],
            $message,
            $status
        );
    }
}