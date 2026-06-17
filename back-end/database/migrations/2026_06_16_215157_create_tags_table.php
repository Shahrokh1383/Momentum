<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tags', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 255);
            $table->string('slug', 255)->index(); // Indexed for fast lookups
            $table->string('color', 7)->default('#6B7280');
            $table->timestamps();
            
            // Ensure slug is unique per user to prevent conflicts
            $table->unique(['user_id', 'slug']); 
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tags');
    }
};