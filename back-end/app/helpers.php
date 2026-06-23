<?php

use App\Models\Identity\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;

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
        // FIXED: Deterministic resolution with strict type checking
        if ($user === null) {
            $authUser = Auth::user();
            
            // Ensures we are strictly dealing with the Identity\User model, 
            // satisfying the static analyzer and preventing Guard mismatch errors.
            if ($authUser instanceof User) {
                $user = $authUser;
            }
        }
        
        $appTimezone = config('app.timezone', 'UTC');
        $timezone = $appTimezone;
        
        if ($user !== null && $user->settings?->timezone) {
            $userTimezone = $user->settings->timezone;
            // Validate timezone string to prevent Carbon exceptions
            if (@timezone_open($userTimezone)) {
                $timezone = $userTimezone;
            }
        }
        
        return Carbon::now($timezone);
    }
}