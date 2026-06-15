<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\User;
use App\Services\Auth\EmailVerificationService;
use App\Traits\HandlesAuthResponses;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class AuthController extends Controller
{
    use HandlesAuthResponses;

    public function __construct(
        private readonly EmailVerificationService $emailVerificationService
    ) {}

    public function register(RegisterRequest $request): JsonResponse
    {
        $user = DB::transaction(function () use ($request) {
            $user = User::create($request->validated());
            $this->emailVerificationService->sendVerificationEmail($user);
            return $user;
        });

        // The trait handles Auth::login, session regeneration, and token generation
        return $this->authenticateAndRespond(
            $request, 
            $user, 
            'Registration successful. Please check your email to verify your account.', 
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

    public function me(Request $request): JsonResponse
    {
        return $this->successResponse(
            new \App\Http\Resources\User\UserResource($request->user()->load('subscription.planDetails'))
        );
    }
}