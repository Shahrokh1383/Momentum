<?php

namespace App\Models;

use App\Enums\PlanSlug;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Plan extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'slug', 'duration_months', 'max_active_habits', 'max_groups', 
        'max_freezes_per_week', 'max_photos_per_log', 'max_pdfs_per_month', 
        'max_categories', 'allowed_habit_types', 'has_advanced_analytics', 
        'has_insights', 'has_predictive_insights', 'has_smart_reminders', 
        'has_xp_booster', 'xp_multiplier', 'price_monthly', 'price_yearly',
    ];

    protected $casts = [
        'slug' => PlanSlug::class,
        'duration_months' => 'integer',
        'max_active_habits' => 'integer',
        'max_groups' => 'integer',
        'max_freezes_per_week' => 'integer',
        'max_photos_per_log' => 'integer',
        'max_pdfs_per_month' => 'integer',
        'max_categories' => 'integer',
        'has_advanced_analytics' => 'boolean',
        'has_insights' => 'boolean',
        'has_predictive_insights' => 'boolean',
        'has_smart_reminders' => 'boolean',
        'has_xp_booster' => 'boolean',
        'xp_multiplier' => 'decimal:2',
        'price_monthly' => 'decimal:2',
        'price_yearly' => 'decimal:2',
    ];

    public function subscriptions()
    {
        return $this->hasMany(Subscription::class, 'plan', 'slug');
    }
}