<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('habit_reminder_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('habit_id')->constrained()->cascadeOnDelete();
            $table->string('scheduled_time', 5); // Format: "HH:MM"
            $table->date('reminder_date');       // The date in the user's timezone
            $table->timestamps();

            // CRITICAL: Prevents duplicate emails for the same habit, same time, same day
            $table->unique(['habit_id', 'scheduled_time', 'reminder_date'], 'habit_reminder_unique_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('habit_reminder_logs');
    }
};