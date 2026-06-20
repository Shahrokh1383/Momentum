<?php

namespace App\Services\User\Habit;

use App\Mail\HabitReminderMail;
use App\Models\Habit;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class HabitReminderService
{
    /**
     * Processes all active habits and dispatches reminder emails if due.
     * Includes strict idempotency guards and timezone awareness.
     */
    public function processDueReminders(): int
    {
        $dispatchedCount = 0;

        // Fetch only habits that actually have reminders configured to save memory
        Habit::where(function ($query) {
                $query->whereNotNull('reminder_time')
                      ->orWhereNotNull('schedule');
            })
            ->with(['user.settings']) 
            ->chunkById(100, function ($habits) use (&$dispatchedCount) {
                foreach ($habits as $habit) {
                    if (!$habit->user || !$habit->user->email) {
                        continue;
                    }

                    // Timezone resolution: habit-level > user settings > UTC fallback
                    $tz = $habit->timezone 
                        ?? $habit->user->settings?->timezone 
                        ?? 'UTC';
                    $nowInTz = now($tz);

                    // 1. Is the habit scheduled for today in the user's timezone?
                    if (!$habit->isDueToday($nowInTz)) {
                        continue;
                    }

                    // 2. Gather all configured reminder times
                    $times = [];
                    if ($habit->reminder_time) {
                        $times[] = substr($habit->reminder_time, 0, 5);
                    }
                    
                    // Handle Smart Reminders from JSON schedule
                    if (isset($habit->schedule['reminders']) && is_array($habit->schedule['reminders'])) {
                        $times = array_merge($times, $habit->schedule['reminders']);
                    }

                    $times = array_unique($times);
                    $currentMinute = $nowInTz->format('H:i');
                    $todayDate = $nowInTz->toDateString();

                    // 3. Check if any reminder time matches the current minute
                    foreach ($times as $time) {
                        if ($currentMinute === $time) {
                            
                            // IDEMPOTENCY CHECK: Have we already sent this exact reminder today?
                            $exists = DB::table('habit_reminder_logs')
                                ->where('habit_id', $habit->id)
                                ->where('scheduled_time', $time)
                                ->where('reminder_date', $todayDate)
                                ->exists();

                            if (!$exists) {
                                // Dispatch to Queue to prevent blocking the Artisan command
                                Mail::to($habit->user->email)->queue(new HabitReminderMail($habit, $time));
                                
                                // Record the log
                                DB::table('habit_reminder_logs')->insert([
                                    'user_id' => $habit->user_id,
                                    'habit_id' => $habit->id,
                                    'scheduled_time' => $time,
                                    'reminder_date' => $todayDate,
                                    'created_at' => now(),
                                    'updated_at' => now(),
                                ]);
                                
                                $dispatchedCount++;
                            }
                        }
                    }
                }
            });

        return $dispatchedCount;
    }
}