<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('habit_checklist_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('habit_log_id')->constrained()->cascadeOnDelete();
            $table->foreignId('checklist_item_id')->constrained('habit_checklist_items')->cascadeOnDelete();
            $table->boolean('is_checked')->default(false);

            // Prevent duplicate check state for the same log + item combo
            $table->unique(['habit_log_id', 'checklist_item_id'], 'unique_checklist_log_entry');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('habit_checklist_logs');
    }
};