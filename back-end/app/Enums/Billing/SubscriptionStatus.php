<?php

namespace App\Enums\Billing;

enum SubscriptionStatus: string
{
    case PENDING_PAYMENT = 'pending_payment';
    case ACTIVE = 'active';
    case CANCELLED = 'cancelled';
    case EXPIRED = 'expired';
    case PAYMENT_FAILED = 'payment_failed';
}