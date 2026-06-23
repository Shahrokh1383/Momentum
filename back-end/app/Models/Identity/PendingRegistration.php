<?php

namespace App\Models\Identity;

use Illuminate\Database\Eloquent\Model;

class PendingRegistration extends Model
{
    protected $fillable = ['name', 'email', 'password', 'expires_at'];

    protected $casts = [
        'expires_at' => 'datetime',
    ];

    // Hash password automatically (mirrors User model)
    public function setPasswordAttribute(string $value): void
    {
        $this->attributes['password'] = bcrypt($value);
    }
}