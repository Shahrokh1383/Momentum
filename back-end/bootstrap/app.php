<?php

use App\Http\Middleware\EnsureTier;
use App\Http\Middleware\RoleMiddleware;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use App\Exceptions\QuotaExceededException;
use App\Exceptions\FeatureLockedException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi(); 

        $middleware->alias([
            'role' => RoleMiddleware::class,
            'tier' => EnsureTier::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'message' => $e->getMessage() ?: 'Unauthenticated.',
                ], 401);
            }
        });

        // Automatically render Quota Exceeded exceptions globally
        $exceptions->render(function (QuotaExceededException $e, Request $request) {
            return $e->render();
        });

        // Automatically render Feature Locked exceptions globally
        $exceptions->render(function (FeatureLockedException $e, Request $request) {
            return $e->render();
        });
    })->create();