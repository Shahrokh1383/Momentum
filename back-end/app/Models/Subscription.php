<?php

namespace App\Models;

use App\Enums\PlanSlug;
use App\Enums\SubscriptionStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Subscription extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'plan', 'status', 'starts_at', 'expires_at', 
        'cancelled_at', 'payment_method', 'transaction_ref',
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

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function isActive(): bool
    {
        return $this->status === SubscriptionStatus::ACTIVE 
            && ($this->expires_at === null || $this->expires_at->isFuture());
    }

    public function planDetails()
    {
        return $this->belongsTo(Plan::class, 'plan', 'slug');
    }
}