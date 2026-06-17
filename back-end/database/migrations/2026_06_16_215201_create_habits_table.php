<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('habits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->enum('type', ['boolean', 'numeric', 'timer', 'checklist'])->default('boolean');
            $table->json('schedule')->nullable();
            
            $table->string('due_days_of_week', 10)->nullable()->index(); // ISO days e.g., "1,2,3"
            $table->enum('frequency', ['daily', 'weekly', 'custom'])->default('daily');
            
            $table->time('reminder_time')->nullable();
            $table->string('timezone')->default('UTC');
            
            $table->decimal('target_value', 10, 2)->nullable();
            $table->string('unit')->nullable();
            
            $table->boolean('is_active')->default(true);
            $table->timestamp('archived_at')->nullable(); // Archive instead of soft delete
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('habits');
    }
};