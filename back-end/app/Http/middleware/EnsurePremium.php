<?php

namespace App\Http\Middleware;

use App\Enums\PlanSlug;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePremium
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->subscription?->isActive() || $user->subscription->plan === PlanSlug::FREE) {
            return response()->json([
                'error' => 'subscription_required',
                'message' => 'Premium subscription required.',
            ], 403);
        }

        return $next($request);
    }
}