<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('streak_freezes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('habit_id')->nullable()->constrained()->nullOnDelete();

            $table->date('frozen_date')->index();
            $table->timestamp('used_at');
            $table->string('reason')->nullable();

            // Prevent duplicate freeze for the same habit on the same day
            $table->unique(['user_id', 'habit_id', 'frozen_date'], 'unique_freeze_per_day');

            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('streak_freezes');
    }
};