<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->integer('max_active_habits')->default(5);
            $table->integer('max_groups')->default(1);
            $table->integer('max_freezes_per_week')->default(1);
            $table->integer('max_photos_per_log')->default(1);
            $table->integer('max_pdfs_per_month')->default(1);
            $table->boolean('has_advanced_analytics')->default(false);
            $table->boolean('has_insights')->default(false);
            $table->boolean('has_xp_booster')->default(false);
            $table->boolean('has_unlimited_photos')->default(false);
            $table->decimal('price_monthly', 10, 2)->nullable();
            $table->decimal('price_lifetime', 10, 2)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plans');
    }
};