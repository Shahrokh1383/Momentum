<?php

namespace App\Models;

use App\Enums\PlanSlug;
use App\Enums\ProfileVisibility;
use App\Enums\UserRole;
use App\Mail\PasswordResetMail;
use App\Mail\VerificationMail;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $attributes = [
        'role' => 'user',
        'profile_visibility' => 'public',
    ];

    protected $fillable = [
        'name', 'email', 'password', 'role', 'provider', 'provider_id', 
        'avatar', 'profile_visibility', 'bio',
        'email_verified_at',
    ];

    protected $hidden = [
        'password', 'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'role' => UserRole::class,
        'profile_visibility' => ProfileVisibility::class,
    ];

    public function subscription()
    {
        return $this->hasOne(Subscription::class)->latestOfMany();
    }

    public function settings()
    {
        return $this->hasOne(UserSetting::class);
    }

    public function getIsPremiumAttribute(): bool
    {
        return $this->subscription?->isActive() && $this->subscription->plan !== PlanSlug::FREE;
    }

    /**
     * Uses Laravel's native Signed URLs (no DB storage needed).
     */
    public function sendEmailVerificationNotification(): void
    {
        $frontendUrl = rtrim(config('app.frontend_url', 'http://localhost:5173'), '/');

        $verificationUrl = app('url')->temporarySignedRoute(
            'api.verification.verify',
            now()->addMinutes(60),
            ['id' => $this->getKey(), 'hash' => sha1($this->getEmailForVerification())],
            false
        );

        // Append the relative path query parameters to the frontend URL
        $finalUrl = $frontendUrl . '/verify-email?' . parse_url($verificationUrl, PHP_URL_QUERY);

        Mail::to($this)->send(new VerificationMail($finalUrl));
    }

    public function sendPasswordResetNotification($token): void
    {
        $frontendUrl = rtrim(config('app.frontend_url', 'http://localhost:5173'), '/');

        $resetUrl = $frontendUrl . '/reset-password?' . http_build_query([
            'token' => $token,
            'email' => $this->email,
        ]);

        Mail::to($this)->send(new PasswordResetMail($resetUrl));
    }
}