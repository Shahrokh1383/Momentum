<?php

use App\Http\Middleware\EnsurePremium;
use App\Http\Middleware\RoleMiddleware;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        apiPrefix: 'api/auth',
        then: fn () => [
            Route::middleware('api')
                ->prefix('api/user')
                ->group(base_path('routes/api/user.php')),
            Route::middleware('api')
                ->prefix('api/admin')
                ->group(base_path('routes/api/admin.php')),
        ],
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi(); // Configures Sanctum stateful middleware for SPA

        $middleware->alias([
            'role' => RoleMiddleware::class,
            'premium' => EnsurePremium::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
