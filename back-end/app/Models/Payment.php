<?php

namespace App\Models;

use App\Enums\PaymentStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'subscription_id',
        'amount',
        'currency',
        'status',
        'gateway_transaction_id',
        'card_number_masked',
        'gateway_response',
        'paid_at',
        'refunded_at',
    ];

    protected $casts = [
        'status' => PaymentStatus::class,
        'amount' => 'decimal:2',
        'gateway_response' => 'array',
        'paid_at' => 'datetime',
        'refunded_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function subscription()
    {
        return $this->belongsTo(Subscription::class);
    }

    public function isPending(): bool
    {
        return $this->status === PaymentStatus::PENDING;
    }

    public function isSuccess(): bool
    {
        return $this->status === PaymentStatus::SUCCESS;
    }

    public static function maskCardNumber(string $cardNumber): string
    {
        return str_repeat('*', strlen($cardNumber) - 4) . substr($cardNumber, -4);
    }
}