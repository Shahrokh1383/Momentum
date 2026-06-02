<?php

namespace App\Models;

use App\Enums\PlanSlug;
use App\Models\Subscription;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Plan extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'slug', 'max_active_habits', 'max_groups', 'max_freezes_per_week',
        'max_photos_per_log', 'max_pdfs_per_month', 'has_advanced_analytics',
        'has_insights', 'has_xp_booster', 'has_unlimited_photos',
        'price_monthly', 'price_lifetime',
    ];

    protected $casts = [
        'slug' => PlanSlug::class,
        'max_active_habits' => 'integer',
        'max_groups' => 'integer',
        'max_freezes_per_week' => 'integer',
        'max_photos_per_log' => 'integer',
        'max_pdfs_per_month' => 'integer',
        'has_advanced_analytics' => 'boolean',
        'has_insights' => 'boolean',
        'has_xp_booster' => 'boolean',
        'has_unlimited_photos' => 'boolean',
        'price_monthly' => 'decimal:2',
        'price_lifetime' => 'decimal:2',
    ];

    public function subscriptions()
    {
        return $this->hasMany(Subscription::class, 'plan', 'slug');
    }
}