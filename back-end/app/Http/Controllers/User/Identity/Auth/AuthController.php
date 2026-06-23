<?php

namespace App\Http\Controllers\User\Identity\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\User\UserResource;
use App\Models\Identity\User;
use App\Services\User\Identity\Auth\PendingRegistrationService;
use App\Traits\HandlesAuthResponses;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    use HandlesAuthResponses;

    public function __construct(
        private readonly PendingRegistrationService $pendingRegistrationService
    ) {}

    public function register(RegisterRequest $request): JsonResponse
    {
        $pending = $this->pendingRegistrationService->createAndSend($request->validated());

        return $this->successResponse(
            ['email' => $pending->email],
            'Registration initiated. Please check your email to verify your account.',
            201
        );
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->email)->first();

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

    public function logoutAll(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->tokens()->delete();

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
            new UserResource(
                $request->user()->load(['subscription.planDetails', 'settings'])
            )
        );
    }
}