<?php

namespace App\Models;

use App\Enums\ProfileVisibility;
use App\Enums\UserRole;
use App\Models\Subscription;
use App\Models\UserSetting;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name', 'email', 'password', 'role', 'provider', 'provider_id', 
        'avatar', 'profile_visibility', 'bio',
    ];

    protected $hidden = [
        'password', 'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'role' => UserRole::class,
        'profile_visibility' => ProfileVisibility::class,
    ];

    public function subscription()
    {
        return $this->hasOne(Subscription::class)->latestOfMany();
    }

    public function settings()
    {
        return $this->hasOne(UserSetting::class);
    }

    public function simulatedPayments()
    {
        return $this->hasMany(SimulatedPayment::class);
    }
}