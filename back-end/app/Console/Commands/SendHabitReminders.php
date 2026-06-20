<?php

namespace App\Console\Commands;

use App\Services\User\Habit\HabitReminderService;
use Illuminate\Console\Command;

class SendHabitReminders extends Command
{
    protected $signature = 'habits:send-reminders';
    protected $description = 'Dispatches queued emails for habits due for a reminder';

    public function handle(HabitReminderService $reminderService): int
    {
        $this->info('Scanning for due habit reminders...');
        
        $dispatched = $reminderService->processDueReminders();

        $this->info("Successfully dispatched {$dispatched} reminder emails to the queue.");
        
        return Command::SUCCESS;
    }
}