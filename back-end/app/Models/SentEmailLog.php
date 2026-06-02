<?php

namespace App\Models;

use App\Enums\EmailType;
use Illuminate\Database\Eloquent\Model;

class SentEmailLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'recipient_email', 'subject', 'body', 'token', 'type', 'created_at',
    ];

    protected $casts = [
        'type' => EmailType::class,
        'created_at' => 'datetime',
    ];
}