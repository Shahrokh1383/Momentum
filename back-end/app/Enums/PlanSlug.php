<?php

namespace App\Enums;

enum PlanSlug: string
{
    case FREE = 'free';
    case EXPERT = 'expert';
    case PREMIUM = 'premium';
}