<?php

namespace App\Services\Auth;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Laravel\Socialite\Contracts\Factory as SocialiteFactory;
use Laravel\Socialite\Two\AbstractProvider;
use Laravel\Socialite\Two\User as SocialiteUser;

class OAuthService
{
    private const ALLOWED_PROVIDERS = ['google', 'github'];

    public function __construct(private SocialiteFactory $socialite)
    {
    }

    public function getRedirectUrl(string $provider): array
    {
        $this->validateProvider($provider);

        /** @var AbstractProvider $driver */
        $driver = $this->socialite->driver($provider);

        $state = Str::random(40);
        Cache::put("oauth_state_{$state}", $provider, now()->addMinutes(10));

        $url = $driver->with(['state' => $state])->redirect()->getTargetUrl();

        return [
            'url' => $url,
            'state' => $state,
        ];
    }

    public function handleCallback(string $provider, string $code, string $state): SocialiteUser
    {
        $this->validateProvider($provider);

        $cachedProvider = Cache::pull("oauth_state_{$state}");
        
        if (!$cachedProvider || $cachedProvider !== $provider) {
            throw new \Exception('Invalid OAuth state parameter.');
        }

        /** @var AbstractProvider $driver */
        $driver = $this->socialite->driver($provider);

        return $driver->stateless()->user();
    }

    /**
     * Prevents account takeover by strictly verifying provider email status.
     */
    public function isEmailVerified(SocialiteUser $socialUser, string $provider): bool
    {
        if ($provider === 'github') {
            $emails = $socialUser->user['emails'] ?? [];
            $primaryEmail = collect($emails)->firstWhere('primary', true);
            return (bool) ($primaryEmail['verified'] ?? false);
        }

        // Google and others typically include it in the base user payload
        return (bool) ($socialUser->user['email_verified'] ?? false);
    }

    private function validateProvider(string $provider): void
    {
        if (!in_array($provider, self::ALLOWED_PROVIDERS)) {
            throw new \InvalidArgumentException("Unsupported OAuth provider: {$provider}");
        }
    }
}