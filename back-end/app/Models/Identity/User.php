<?php

namespace App\Models\Identity; 

use App\Enums\Billing\PlanSlug;
use App\Enums\Identity\ProfileVisibility;
use App\Enums\Identity\UserRole;
use App\Mail\Auth\PasswordResetMail;
use App\Mail\Auth\VerificationMail;
use App\Models\Billing\Plan; 
use App\Models\Billing\Subscription; 
use App\Models\Habit\Habit; 
use App\Models\Habit\HabitLog;
use App\Models\Identity\UserSetting; 
use App\Models\Streak\Streak; 
use App\Models\Streak\StreakFreeze;
use App\Models\Taxonomy\Category;
use App\Models\Taxonomy\Tag;
use App\Services\User\Identity\Auth\EmailVerificationService;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
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
        'avatar', 'avatar_path', 'profile_visibility', 'bio', 'plan_slug',
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

    public function categories(): HasMany
    {
        return $this->hasMany(Category::class);
    }

    public function tags(): HasMany
    {
        return $this->hasMany(Tag::class);
    }

    public function habits(): HasMany
    {
        return $this->hasMany(Habit::class);
    }

    public function habitLogs(): HasMany
    {
        return $this->hasMany(HabitLog::class);
    }

    public function streaks(): HasMany
    {
        return $this->hasMany(Streak::class);
    }

    public function streakFreezes(): HasMany
    {
        return $this->hasMany(StreakFreeze::class);
    }

    public function sendEmailVerificationNotification(): void
    {
        $finalUrl = app(EmailVerificationService::class)
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