<?php

namespace App\Models;

use App\Enums\PlanSlug;
use App\Enums\ProfileVisibility;
use App\Enums\UserRole;
use App\Mail\PasswordResetMail;
use App\Mail\VerificationMail;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\HasApiTokens;

/**
 * @property-read Subscription|null $subscription
 * @property-read UserSetting|null $settings
 * @property-read string $active_plan
 */
class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $attributes = [
        'role' => 'user',
        'profile_visibility' => 'public',
        'plan_slug' => PlanSlug::FREE->value,
    ];

    protected $fillable = [
        'name', 'email', 'password', 'role', 'provider', 'provider_id', 
        'avatar', 'profile_visibility', 'bio', 'plan_slug',
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
        'plan_slug' => PlanSlug::class,
    ];

    public function subscription()
    {
        return $this->hasOne(Subscription::class)->latestOfMany();
    }

    public function settings()
    {
        return $this->hasOne(UserSetting::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class, 'plan_slug', 'slug');
    }

    public function getActivePlanAttribute(): string
    {
        if ($this->subscription?->isActive()) {
            return $this->subscription->plan->value;
        }

        return PlanSlug::FREE->value;
    }

    public function sendEmailVerificationNotification(): void
    {
        $finalUrl = app(\App\Services\Auth\EmailVerificationService::class)
            ->generateVerificationUrl($this->getKey(), $this->getEmailForVerification());

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