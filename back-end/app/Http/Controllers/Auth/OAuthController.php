<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\OAuthCallbackRequest;
use App\Http\Resources\User\UserResource;
use App\Models\User;
use App\Services\Auth\OAuthService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class OAuthController extends Controller
{
    public function __construct(private OAuthService $oauthService)
    {
    }

    public function redirect(Request $request, string $provider)
    {
        try {
            $url = $this->oauthService->getRedirectUrl($provider);
            return $this->successResponse(['url' => $url], 'OAuth URL generated');
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse('invalid_provider', $e->getMessage(), 400);
        }
    }

    public function callback(OAuthCallbackRequest $request, string $provider)
    {
        try {
            $socialUser = $this->oauthService->handleCallback($provider, $request->code);
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse('invalid_provider', $e->getMessage(), 400);
        } catch (\Exception $e) {
            return $this->errorResponse('oauth_failed', 'Could not authenticate with ' . $provider, 401);
        }

        $user = User::updateOrCreate(
            [
                'provider' => $provider,
                'provider_id' => $socialUser->getId(),
            ],
            [
                'name' => $socialUser->getName() ?? $socialUser->getNickname(),
                'email' => $socialUser->getEmail(),
                'avatar' => $socialUser->getAvatar(),
                'email_verified_at' => now(), // Trust the OAuth provider's email verification
            ]
        );

        Auth::login($user);
        $request->session()->regenerate();

        return $this->successResponse(new UserResource($user->load('subscription')), 'OAuth login successful');
    }
}