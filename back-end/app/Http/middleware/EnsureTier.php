<?php

namespace App\Http\Middleware;

use App\Enums\Billing\PlanSlug;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTier
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string $tier): Response
    {
        $user = $request->user();
        $requiredTier = PlanSlug::tryFrom($tier);

        // Fallback fail-safe in case an invalid tier name is typed in the route definition
        if (! $requiredTier) {
            return $this->forbiddenResponse(ucfirst($tier));
        }

        // Check if user exists and has an active subscription
        if (! $user || ! $user->subscription?->isActive()) {
            return $this->forbiddenResponse(ucfirst($tier));
        }

        // Compare the integer levels from the Enum
        if ($user->subscription->plan->level() < $requiredTier->level()) {
            return $this->forbiddenResponse(ucfirst($tier));
        }

        return $next($request);
    }

    /**
     * Generate the standardized 403 response.
     */
    private function forbiddenResponse(string $tierName): Response
    {
        return response()->json([
            'error'   => 'subscription_required',
            'message' => "{$tierName} plan or higher is required for this action.",
        ], 403);
    }
}