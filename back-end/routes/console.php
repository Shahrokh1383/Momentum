<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Console\Commands\CheckSubscriptionStatus;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Run every minute, but strictly prevent overlapping executions
Schedule::command(CheckSubscriptionStatus::class)
    ->everyMinute()
    ->withoutOverlapping();