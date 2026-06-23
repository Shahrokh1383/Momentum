<?php

namespace App\Services\User\Habit;

use App\Mail\Habit\HabitReminderMail;
use App\Models\Habit\Habit;
use App\Services\User\Billing\PlanQuotaService;;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class HabitReminderService
{
    public function __construct(
        private PlanQuotaService $quotaService
    ) {}

    /**
     * Processes all active habits and dispatches reminder emails if due.
     * Only processes users who have reminders enabled on their plan.
     */
    public function processDueReminders(): int
    {
        $dispatchedCount = 0;

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

                    // Single gate: has_smart_reminders controls all reminder functionality
                    if (!$this->quotaService->isFeatureEnabled($habit->user, 'has_smart_reminders')) {
                        continue;
                    }

                    $tz = $habit->timezone 
                        ?? $habit->user->settings?->timezone 
                        ?? 'UTC';
                    $nowInTz = now($tz);

                    if (!$habit->isDueToday($nowInTz)) {
                        continue;
                    }

                    $times = [];
                    if ($habit->reminder_time) {
                        $times[] = substr($habit->reminder_time, 0, 5);
                    }
                    
                    if (isset($habit->schedule['reminders']) && is_array($habit->schedule['reminders'])) {
                        $times = array_merge($times, $habit->schedule['reminders']);
                    }

                    $times = array_unique($times);
                    $currentMinute = $nowInTz->format('H:i');
                    $todayDate = $nowInTz->toDateString();

                    foreach ($times as $time) {
                        if ($currentMinute === $time) {
                            
                            $exists = DB::table('habit_reminder_logs')
                                ->where('habit_id', $habit->id)
                                ->where('scheduled_time', $time)
                                ->where('reminder_date', $todayDate)
                                ->exists();

                            if (!$exists) {
                                Mail::to($habit->user->email)->queue(new HabitReminderMail($habit, $time));
                                
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