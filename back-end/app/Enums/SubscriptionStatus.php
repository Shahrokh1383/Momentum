<?php

namespace App\Enums;

enum SubscriptionStatus: string
{
    case PENDING_PAYMENT = 'pending_payment';
    case ACTIVE = 'active';
    case CANCELLED = 'cancelled';
    case EXPIRED = 'expired';
}