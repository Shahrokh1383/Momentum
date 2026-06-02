<?php

namespace App\Services\Auth;

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
     * Validate the provider and return the redirect URL.
     * @throws \InvalidArgumentException
     */
    public function getRedirectUrl(string $provider): string
    {
        $this->validateProvider($provider);

        /** @var AbstractProvider $driver */
        $driver = $this->socialite->driver($provider);

        return $driver->stateless()->redirect()->getTargetUrl();
    }

    /**
     * Validate the provider and retrieve the social user.
     * @throws \InvalidArgumentException
     * @throws \Exception
     */
    public function handleCallback(string $provider, string $code): SocialiteUser
    {
        $this->validateProvider($provider);

        /** @var AbstractProvider $driver */
        $driver = $this->socialite->driver($provider);

        return $driver->stateless()->user();
    }

    private function validateProvider(string $provider): void
    {
        if (!in_array($provider, self::ALLOWED_PROVIDERS)) {
            throw new \InvalidArgumentException("Unsupported OAuth provider: {$provider}");
        }
    }
}