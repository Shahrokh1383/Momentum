<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('habit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('habit_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            
            $table->date('logged_date')->index();
            $table->enum('status', ['pending', 'completed', 'missed', 'skipped'])->default('pending');
            $table->text('notes')->nullable();
            
            $table->timestamps();

            // High-performance composite indexes for analytics and lookups
            $table->index(['habit_id', 'logged_date'], 'idx_habit_logs_habit_date');
            $table->index(['habit_id', 'logged_date', 'status'], 'idx_habit_logs_status_date');
            
            // Critical unique constraint for Offline Sync Conflict Resolution
            $table->unique(['habit_id', 'logged_date', 'user_id'], 'unique_habit_log_per_day');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('habit_logs');
    }
};