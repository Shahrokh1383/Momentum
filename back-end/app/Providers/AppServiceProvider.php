<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\ServiceProvider;
use App\Models\HabitLog;
use App\Observers\HabitLogObserver;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Bind as singleton to optimize quota/plan lookups per request
        $this->app->singleton(\App\Services\User\Subscription\PlanQuotaService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('auth-limiter', fn (Request $request) => Limit::perMinute(5)->by($request->ip()));
        RateLimiter::for('password-limiter', fn (Request $request) => Limit::perMinutes(5, 2)->by($request->ip() . '|' . $request->input('email')));
        RateLimiter::for('reset-limiter', fn (Request $request) => Limit::perMinute(5)->by($request->ip()));
        RateLimiter::for('api-limiter', fn (Request $request) => Limit::perMinute(60)->by($request->user()?->id ?: $request->ip()));
        RateLimiter::for('upload-limiter', fn (Request $request) => Limit::perMinute(10)->by($request->user()?->id ?: $request->ip()));
        HabitLog::observe(HabitLogObserver::class);
    }
}