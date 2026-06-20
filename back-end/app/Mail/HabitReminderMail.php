<?php

namespace App\Mail;

use App\Models\Habit;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class HabitReminderMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Habit $habit,
        public readonly string $scheduledTime
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "⏰ Time for: {$this->habit->title}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.habit-reminder',
        );
    }
}