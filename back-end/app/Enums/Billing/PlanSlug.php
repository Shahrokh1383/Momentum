<?php

namespace App\Enums\Billing;

enum PlanSlug: string
{
    case FREE = 'free';
    case EXPERT = 'expert';
    case PREMIUM = 'premium';

    public function level(): int
    {
        return match ($this) {
            self::FREE => 0,
            self::EXPERT => 1,
            self::PREMIUM => 2,
        };
    }
}