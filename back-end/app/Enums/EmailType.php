<?php

namespace App\Enums;

enum EmailType: string
{
    case PASSWORD_RESET = 'password_reset';
    case EMAIL_VERIFICATION = 'email_verification';
}