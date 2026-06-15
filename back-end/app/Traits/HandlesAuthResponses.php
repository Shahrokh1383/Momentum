<?php

namespace App\Traits;

use App\Http\Resources\User\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

trait HandlesAuthResponses
{
    use HasApiResponse;

    /**
     * Centralized Authentication Response.
     * Handles both Stateful (SPA) and Stateless (API/Mobile) authentication flows.
     */
    protected function authenticateAndRespond(Request $request, User $user, string $message, int $status = 200): JsonResponse
    {
        // Perform the actual login
        Auth::login($user, $request->boolean('remember'));

        if ($request->hasSession()) {
            // Stateful (React SPA): Regenerate session to prevent fixation
            $request->session()->regenerate();

            return $this->successResponse(
                new UserResource($user->load('subscription.planDetails')),
                $message,
                $status
            );
        }

        // Stateless (Postman/Mobile): Generate Sanctum Bearer Token
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