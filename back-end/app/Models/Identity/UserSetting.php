<?php

namespace App\Models\Identity;

use App\Enums\Theme;
use App\Models\Identity\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'timezone', 'theme', 'language', 'date_format',
    ];

    protected $casts = [
        'theme' => Theme::class,
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}