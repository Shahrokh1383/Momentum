<?php

namespace App\Enums;

enum PlanSlug: string
{
    case FREE = 'free';
    case PREMIUM = 'premium';
    case LIFETIME = 'lifetime';
}