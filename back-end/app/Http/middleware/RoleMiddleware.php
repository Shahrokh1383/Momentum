<?php

namespace App\Http\Middleware;

use App\Enums\Identity\UserRole;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, string $role): Response
    {
        // Validate that the passed role is a valid UserRole enum value
        $requiredRole = UserRole::tryFrom($role);
        if ($requiredRole === null) {
            // Route misconfiguration – the developer passed an invalid role
            abort(500, 'Invalid role parameter in route definition.');
        }
        
        // Compare the authenticated user's role (already cast to enum) with the required role
        if (! $request->user() || $request->user()->role !== $requiredRole) {
            abort(403, 'Unauthorized action.');
        }

        return $next($request);
    }
}