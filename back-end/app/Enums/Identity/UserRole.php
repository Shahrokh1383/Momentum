<?php

namespace App\Enums\Identity;

enum UserRole: string
{
    case USER = 'user';
    case ADMIN = 'admin';
}