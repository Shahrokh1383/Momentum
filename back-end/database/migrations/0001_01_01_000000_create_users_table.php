<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password')->nullable(); // Nullable for OAuth users
            $table->string('role')->default(\App\Enums\Identity\UserRole::USER->value);
            $table->string('provider')->nullable();
            $table->string('provider_id')->nullable()->unique();
            $table->string('avatar')->nullable();
            $table->string('profile_visibility')->default(\App\Enums\Identity\ProfileVisibility::PUBLIC->value);
            $table->text('bio')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};