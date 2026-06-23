<?php

namespace App\Models\Billing;

use App\Enums\Billing\PlanSlug;
use App\Enums\Billing\SubscriptionStatus;
use App\Models\Identity\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;

class Subscription extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'plan', 'status', 'starts_at', 
        'expires_at', 'cancelled_at', 'transaction_ref',
    ];

    protected $casts = [
        'plan' => PlanSlug::class,
        'status' => SubscriptionStatus::class,
        'starts_at' => 'datetime',
        'expires_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (Subscription $subscription) {
            if (empty($subscription->transaction_ref)) {
                $subscription->transaction_ref = Str::uuid();
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function planDetails(): BelongsTo
    {
        return $this->belongsTo(Plan::class, 'plan', 'slug');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function latestPayment(): HasOne
    {
        return $this->hasOne(Payment::class)->latestOfMany();
    }

    public function isActive(): bool
    {
        return $this->status === SubscriptionStatus::ACTIVE
            && ($this->expires_at === null || $this->expires_at->isFuture());
    }

    public function isPendingPayment(): bool
    {
        return $this->status === SubscriptionStatus::PENDING_PAYMENT;
    }
}