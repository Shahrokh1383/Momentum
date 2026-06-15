<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\OAuthCallbackRequest;
use App\Models\User;
use App\Services\Auth\OAuthService;
use App\Traits\HandlesAuthResponses;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OAuthController extends Controller
{
    use HandlesAuthResponses;

    public function __construct(private OAuthService $oauthService) {}

    public function redirect(Request $request, string $provider)
    {
        try {
            $data = $this->oauthService->getRedirectUrl($provider);
            return $this->successResponse($data, 'OAuth URL generated');
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse('invalid_provider', $e->getMessage(), 400);
        }
    }

    public function callback(OAuthCallbackRequest $request, string $provider)
    {
        try {
            $socialUser = $this->oauthService->handleCallback($provider, $request->code, $request->state);
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse('invalid_provider', $e->getMessage(), 400);
        } catch (\Exception $e) {
            return $this->errorResponse('oauth_failed', $e->getMessage(), 401);
        }

        $existingUser = User::where('email', $socialUser->getEmail())->first();

        if ($existingUser) {
            // STRICT SECURITY: GitHub often omits 'email_verified'. We default to false to prevent account takeover.
            $isVerified = $socialUser->user['email_verified'] ?? $socialUser->user['email_verified_at'] ?? false;
            
            if (!$isVerified) {
                return $this->errorResponse(
                    'oauth_email_unverified', 
                    'The OAuth provider has not verified this email address. Please log in with your credentials to link your account.', 
                    403
                );
            }
        }

        try {
            $user = DB::transaction(function () use ($existingUser, $socialUser, $provider) {
                if ($existingUser) {
                    $existingUser->update([
                        'provider' => $provider,
                        'provider_id' => $socialUser->getId(),
                        'avatar' => $existingUser->avatar ?? $socialUser->getAvatar(),
                        'email_verified_at' => $existingUser->email_verified_at ?? now(),
                    ]);
                    return $existingUser;
                }

                return User::create([
                    'name' => $socialUser->getName() ?? $socialUser->getNickname(),
                    'email' => $socialUser->getEmail(),
                    'provider' => $provider,
                    'provider_id' => $socialUser->getId(),
                    'avatar' => $socialUser->getAvatar(),
                    'email_verified_at' => now(), 
                ]);
            });
        } catch (\Exception $e) {
            return $this->errorResponse('oauth_failed', 'Failed to link or create account.', 500);
        }

        return $this->authenticateAndRespond($request, $user, 'OAuth login successful');
    }
}