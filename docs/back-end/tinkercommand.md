**This is manual testing commands for expired subscription**

run :  php artisan tinker

enter below commands


```
// 1. Get the subscription
 $sub = App\Models\Subscription::where('user_id', Our_User_ID)->first();

// 2. Set expiration to the past, BUT KEEP STATUS ACTIVE
 $sub->expires_at = now()->subDay();
 $sub->status = App\Enums\SubscriptionStatus::ACTIVE;
 $sub->save();

 ```

**This is manual testing commands for habit reminder**

run : php artisan tinker

enter below commands

$user = App\Models\User::first();

// 1. Fetch the app's actual timezone (e.g., 'Asia/Tehran' or 'UTC')
$appTz = config('app.timezone'); 

// 2. Calculate exactly 1 minute from NOW in that specific timezone
$nextMinute = now($appTz)->addMinute()->format('H:i');

// 3. Create the habit with the correct timezone context
$habit = $user->habits()->create([
    'title' => 'Ultimate Tinker Test',
    'type' => 'boolean',
    'frequency' => 'daily',
    'timezone' => $appTz, // CRITICAL: Matches your system clock context
    'reminder_time' => $nextMinute,
]);

echo "✅ SUCCESS! Timezone: {$appTz} | Reminder strictly set for: {$nextMinute}\n";