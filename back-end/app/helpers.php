<?php

use App\Models\User;
use Illuminate\Support\Carbon;

if (!function_exists('user_now')) {
    /**
     * Get the current Carbon instance in the user's timezone.
     * Falls back to the application's default timezone if no user is provided
     * or if the user's timezone setting is missing/invalid.
     *
     * @param User|null $user
     * @return Carbon
     */
    function user_now(?User $user = null): Carbon
    {
        $user ??= auth()->user();
        $appTimezone = config('app.timezone', 'UTC');
        
        $timezone = $appTimezone;
        
        if ($user?->settings?->timezone) {
            $userTimezone = $user->settings->timezone;
            // Validate timezone string to prevent Carbon exceptions
            if (@timezone_open($userTimezone)) {
                $timezone = $userTimezone;
            }
        }
        
        return Carbon::now($timezone);
    }
}