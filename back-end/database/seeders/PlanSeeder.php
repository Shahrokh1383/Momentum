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
                'max_active_habits' => 5,
                'max_groups' => 1,
                'max_freezes_per_week' => 1,
                'max_photos_per_log' => 1,
                'max_pdfs_per_month' => 1,
                'has_advanced_analytics' => false,
                'has_insights' => false,
                'has_xp_booster' => false,
                'has_unlimited_photos' => false,
                'price_monthly' => null,
                'price_lifetime' => null,
            ],
            [
                'name' => 'Premium Monthly',
                'slug' => PlanSlug::PREMIUM->value,
                'max_active_habits' => -1,
                'max_groups' => -1,
                'max_freezes_per_week' => 3,
                'max_photos_per_log' => -1,
                'max_pdfs_per_month' => -1,
                'has_advanced_analytics' => true,
                'has_insights' => true,
                'has_xp_booster' => true,
                'has_unlimited_photos' => true,
                'price_monthly' => 9.99,
                'price_lifetime' => null,
            ],
            [
                'name' => 'Lifetime',
                'slug' => PlanSlug::LIFETIME->value,
                'max_active_habits' => -1,
                'max_groups' => -1,
                'max_freezes_per_week' => 3,
                'max_photos_per_log' => -1,
                'max_pdfs_per_month' => -1,
                'has_advanced_analytics' => true,
                'has_insights' => true,
                'has_xp_booster' => true,
                'has_unlimited_photos' => true,
                'price_monthly' => null,
                'price_lifetime' => 149.99,
            ],
        ];

        DB::table('plans')->upsert($plans, ['slug'], array_keys($plans[0]));
    }
}