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

    /**
     * Validate the provider, generate a secure state, and return the redirect URL.
     * @throws \InvalidArgumentException
     */
    public function getRedirectUrl(string $provider): array
    {
        $this->validateProvider($provider);

        /** @var AbstractProvider $driver */
        $driver = $this->socialite->driver($provider);

        // Generate a cryptographically secure state parameter to prevent CSRF
        $state = Str::random(40);
        
        // Store state in cache for 10 minutes
        Cache::put("oauth_state_{$state}", $provider, now()->addMinutes(10));

        // Pass the state to the provider
        $url = $driver->with(['state' => $state])->redirect()->getTargetUrl();

        return [
            'url' => $url,
            'state' => $state, // Return state so frontend can pass it back
        ];
    }

    /**
     * Validate the provider, verify the state, and retrieve the social user.
     * @throws \InvalidArgumentException
     * @throws \Exception
     */
    public function handleCallback(string $provider, string $code, string $state): SocialiteUser
    {
        $this->validateProvider($provider);

        // Verify the state parameter against the cache to prevent CSRF attacks
        $cachedProvider = Cache::pull("oauth_state_{$state}");
        
        if (!$cachedProvider || $cachedProvider !== $provider) {
            throw new \Exception('Invalid OAuth state parameter.');
        }

        /** @var AbstractProvider $driver */
        $driver = $this->socialite->driver($provider);

        // We use stateless() here because we manually verified the state via Cache.
        // This allows the flow to work seamlessly for both SPA and API clients.
        return $driver->stateless()->user();
    }

    private function validateProvider(string $provider): void
    {
        if (!in_array($provider, self::ALLOWED_PROVIDERS)) {
            throw new \InvalidArgumentException("Unsupported OAuth provider: {$provider}");
        }
    }
}