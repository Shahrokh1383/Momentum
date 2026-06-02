<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sent_emails_log', function (Blueprint $table) {
            $table->id();
            $table->string('recipient_email');
            $table->string('subject');
            $table->text('body');
            $table->string('token');
            $table->string('type');
            $table->timestamp('created_at')->nullable();

            $table->index('recipient_email');
            $table->index('token');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sent_emails_log');
    }
};