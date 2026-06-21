<?php

namespace Database\Seeders;

use App\Enums\PlanSlug;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PlanSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            [
                'name' => 'Free',
                'slug' => PlanSlug::FREE->value,
                'duration_months' => 1,
                'max_active_habits' => 5,
                'max_groups' => 1,
                'max_freezes_per_week' => 1,
                'max_photos_per_log' => 1,
                'max_pdfs_per_month' => 1,
                'max_categories' => 3,
                'allowed_habit_types' => 'boolean,numeric',
                'has_advanced_analytics' => false,
                'has_insights' => false,
                'has_predictive_insights' => false,
                'has_smart_reminders' => false,
                'has_xp_booster' => false,
                'xp_multiplier' => 1.00,
                'price_monthly' => null,
                'price_yearly' => null,
            ],
            [
                'name' => 'Expert',
                'slug' => PlanSlug::EXPERT->value,
                'duration_months' => 1,
                'max_active_habits' => 15,
                'max_groups' => 3,
                'max_freezes_per_week' => 2,
                'max_photos_per_log' => 5,
                'max_pdfs_per_month' => 5,
                'max_categories' => 10,
                'allowed_habit_types' => 'boolean,numeric,timer,counter,checklist',
                'has_advanced_analytics' => true,
                'has_insights' => true,
                'has_predictive_insights' => false,
                'has_smart_reminders' => true,
                'has_xp_booster' => true,
                'xp_multiplier' => 1.50,
                'price_monthly' => 4.99,
                'price_yearly' => 49.99,
            ],
            [
                'name' => 'Premium',
                'slug' => PlanSlug::PREMIUM->value,
                'duration_months' => 1,
                'max_active_habits' => -1,
                'max_groups' => -1,
                'max_freezes_per_week' => 5,
                'max_photos_per_log' => -1,
                'max_pdfs_per_month' => -1,
                'max_categories' => -1,
                'allowed_habit_types' => 'boolean,numeric,timer,counter,checklist,location',
                'has_advanced_analytics' => true,
                'has_insights' => true,
                'has_predictive_insights' => true,
                'has_smart_reminders' => true,
                'has_xp_booster' => true,
                'xp_multiplier' => 2.00,
                'price_monthly' => 9.99,
                'price_yearly' => 99.99,
            ],
        ];

        DB::table('plans')->upsert($plans, ['slug'], array_keys($plans[0]));
    }
}