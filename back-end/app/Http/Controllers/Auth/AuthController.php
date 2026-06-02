<?php

namespace App\Http\Controllers\Auth;

use App\Enums\EmailType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\User\UserResource;
use App\Models\SentEmailLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function register(RegisterRequest $request)
    {
        $user = User::create($request->validated());

        // Auto-login the user immediately after registration (Crucial for SPA Sanctum)
        Auth::login($user);
        $request->session()->regenerate();

        // Simulate email verification
        $token = Str::random(60);
        SentEmailLog::create([
            'recipient_email' => $user->email,
            'subject' => 'Verify Email Address',
            'body' => "Please verify your email using token: {$token}",
            'token' => $token,
            'type' => EmailType::EMAIL_VERIFICATION,
        ]);

        return $this->successResponse(
            new UserResource($user->load('subscription')),
            'Registration successful. Please verify your email.',
            201
        );
    }

    public function login(LoginRequest $request)
    {
        if (!Auth::attempt($request->only('email', 'password'), $request->boolean('remember'))) {
            return $this->errorResponse('authentication_failed', 'Invalid credentials', 401);
        }

        $user = User::where('email', $request->email)->firstOrFail();
        $request->session()->regenerate();

        return $this->successResponse(new UserResource($user->load('subscription')), 'Login successful');
    }

    public function logout(Request $request)
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return $this->successResponse(null, 'Logged out successfully');
    }

    public function me(Request $request)
    {
        return $this->successResponse(new UserResource($request->user()->load('subscription')));
    }
}