<?php

namespace App\Enums;

enum ProfileVisibility: string
{
    case PUBLIC = 'public';
    case FRIENDS_ONLY = 'friends_only';
    case PRIVATE = 'private';
}