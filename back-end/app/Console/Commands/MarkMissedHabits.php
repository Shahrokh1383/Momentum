<?php

namespace App\Console\Commands;

use App\Models\Habit;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class MarkMissedHabits extends Command
{
    protected $signature = 'habits:mark-missed';
    protected $description = 'Mark pending habit logs as missed for habits due yesterday';

    public function handle(): int
    {
        $yesterday = now()->subDay();

        $dueHabitIds = Habit::where('is_active', true)
            ->whereNull('archived_at')
            ->get()
            ->filter(fn (Habit $habit) => $habit->isDueToday($yesterday))
            ->pluck('id');

        if ($dueHabitIds->isEmpty()) {
            $this->info('No habits were due yesterday.');
            return Command::SUCCESS;
        }

        $affected = DB::table('habit_logs')
            ->whereIn('habit_id', $dueHabitIds)
            ->where('logged_date', $yesterday->toDateString())
            ->where('status', 'pending')
            ->update([
                'status' => 'missed',
                'updated_at' => now(),
            ]);

        $this->info("Marked {$affected} habit log(s) as missed.");

        return Command::SUCCESS;
    }
}