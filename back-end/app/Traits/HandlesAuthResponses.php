<?php

namespace App\Traits;

use App\Http\Resources\User\UserResource;
use App\Models\Identity\User;
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
        $remember = $request->boolean('remember');
        
        // Perform the actual login
        Auth::login($user, $remember);

        if ($this->isStatefulRequest($request)) {
            // Stateful (React SPA): Regenerate session to prevent fixation
            $request->session()->regenerate();

            return $this->successResponse(
                new UserResource($user->load('subscription.planDetails')),
                $message,
                $status
            );
        }

        // Stateless (Postman/Mobile): Generate Sanctum Bearer Token
        // Fix #5: Apply expiration based on "Remember Me"
        $expiration = $remember ? now()->addYear() : now()->addDay();
        $token = $user->createToken('auth-token', ['*'], $expiration)->plainTextToken;

        return $this->successResponse(
            [
                'user' => new UserResource($user->load('subscription.planDetails')),
                'token' => $token,
            ],
            $message,
            $status
        );
    }

    /**
     * Determine if the request is a stateful SPA request.
     * Replaces the flawed $request->hasSession() logic.
     */
    private function isStatefulRequest(Request $request): bool
    {
        // If the client is explicitly using a Bearer token, it's strictly stateless API
        if ($request->bearerToken()) {
            return false;
        }

        if (! $request->hasSession()) {
            return false;
        }

        // Check if the request originates from a configured stateful domain (Sanctum SPA)
        $referer = $request->headers->get('referer') ?? $request->headers->get('origin');
        if (! $referer) {
            return false; 
        }

        $refererHost = parse_url($referer, PHP_URL_HOST);
        if (! $refererHost) {
            return false;
        }

        $statefulDomains = collect(config('sanctum.stateful'));

        return $statefulDomains->contains(function ($domain) use ($refererHost) {
            // Sanctum stateful domains might include ports (e.g., localhost:3000)
            $domainHost = explode(':', trim($domain))[0];
            return $refererHost === $domainHost || str_ends_with($refererHost, '.' . $domainHost);
        });
    }
}