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
            new UserResource($user->load('subscription')),
            'Registration successful. Please check your email to verify your account.',
            201
        );
    }

    public function login(LoginRequest $request): JsonResponse
    {
        if (!Auth::attempt($request->only('email', 'password'), $request->boolean('remember'))) {
            return $this->errorResponse('authentication_failed', 'Invalid credentials', 401);
        }

        $user = User::where('email', $request->email)->firstOrFail();
        $request->session()->regenerate();

        return $this->successResponse(
            new UserResource($user->load('subscription')),
            'Login successful'
        );
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return $this->successResponse(null, 'Logged out successfully');
    }

    public function me(Request $request): JsonResponse
    {
        return $this->successResponse(
            new UserResource($request->user()->load('subscription'))
        );
    }
}