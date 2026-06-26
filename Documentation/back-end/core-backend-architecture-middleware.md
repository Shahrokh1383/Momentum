
---

# Core Backend Architecture & Middleware – Backend Documentation

## Overview
This module establishes the backbone of the Momentum API: consistent JSON responses, authentication guardrails (Sanctum, email verification, role‑based access), rate limiting, and a clean route separation for auth, user, and admin contexts. It follows Laravel 12 conventions, leveraging stateful Sanctum for SPA cookie authentication and custom middleware for premium feature gating. The routing configuration is centralized in `bootstrap/app.php` with individual route files for each domain.

## Business Rules
1. **Email Verification Mandatory**  
   All user and admin routes require the `verified` middleware. A user must have `email_verified_at` not null to access any protected endpoint. The frontend must handle the unverified state (e.g., redirect to a verification flow).

2. **Role‑Based Access Control**  
   - `user` role: access to `/api/user/*` routes.  
   - `admin` role: access to `/api/admin/*` routes (requires both `auth:sanctum`, `verified`, and `role:admin` middleware).  
   - The `role` middleware validates the required role against the authenticated user’s `role` enum field. Invalid route configurations (non‑existent role) are treated as server errors during development but should be masked in production.

3. **Premium Feature Gate**  
   The `premium` middleware ensures the user has an active subscription with a non‑free plan. If not, a 403 JSON response with error code `subscription_required` is returned.

4. **Rate Limiting**  
   - **auth‑limiter**: 5 requests per minute per IP for login/register.  
   - **password‑limiter**: 1 request per 5 minutes per IP for password reset flows.  
   - **api‑limiter**: 60 requests per minute per authenticated user (or IP for guests).  
   - **upload‑limiter**: 10 requests per minute per authenticated user for file upload endpoints.

5. **API Response Envelope**  
   All endpoints must return a consistent JSON structure:
   - Success: `{ success: true, message, data }`
   - Error: `{ success: false, error, message, details? }`  
   (Currently, Laravel’s default validation and throttle responses do **not** follow this envelope; see Edge Cases.)

## Backend

### Directory Structure
- **Traits** – `HasApiResponse` (success/error JSON helpers)
- **Controllers** – `Controller` (base, uses the trait)
- **Middleware** – `RoleMiddleware`, `EnsurePremium`
- **Service Provider** – `AppServiceProvider` (rate limiter definitions)
- **Bootstrap** – `bootstrap/app.php` (middleware aliases, routing, stateful API)
- **Routes** – `routes/api/auth.php`, `routes/api/user.php`, `routes/api/admin.php`

### Core Components

#### `HasApiResponse` Trait
Provides two methods:
- `successResponse(mixed $data, string $message, int $status)`  
- `errorResponse(string $error, string $message, int $status, mixed $details)`  

The `errorResponse` does **not** include a field‑level `errors` array; validation exceptions currently fall back to Laravel’s default format (see Edge Cases).

#### Base Controller
`App\Http\Controllers\Controller` is abstract and uses `HasApiResponse`. All application controllers should extend it to inherit the standardized response methods.

#### Middleware

**`RoleMiddleware`**  
- Accepts a single parameter: the required role string (e.g., `admin`).  
- Converts the parameter to a `UserRole` enum using `tryFrom`.  
- If the parameter is invalid (not a defined role), it calls `abort(500)` with a developer message. (In production, this should be replaced by a logged error and a 403 response to avoid information leakage.)  
- Otherwise, checks that the authenticated user exists and that `$request->user()->role` matches the required enum. Returns 403 on mismatch.

**`EnsurePremium`**  
- Checks `$request->user()->subscription?->isActive()` and that the plan is not `PlanSlug::FREE`.  
- If the check fails, returns a 403 JSON response with error code `subscription_required`.

#### Rate Limiting
Defined in `AppServiceProvider::boot()`:
```php
RateLimiter::for('auth-limiter', fn (Request $request) => Limit::perMinute(5)->by($request->ip()));
RateLimiter::for('password-limiter', fn (Request $request) => Limit::perMinutes(5, 1)->by($request->ip()));
RateLimiter::for('api-limiter', fn (Request $request) => Limit::perMinute(60)->by($request->user()?->id ?: $request->ip()));
RateLimiter::for('upload-limiter', fn (Request $request) => Limit::perMinute(10)->by($request->user()?->id ?: $request->ip()));
```
Throttle middleware is applied in route groups. Custom 429 responses are not yet formatted using the API envelope (see Edge Cases).

#### Routing Architecture
In `bootstrap/app.php`:
- The default `api` routing entry maps to `routes/api/auth.php` with the prefix `api/auth`.
- Two additional route groups are defined using `then`:
  - `api/user` → `routes/api/user.php` (with `auth:sanctum`, `verified`, `throttle:api-limiter`)
  - `api/admin` → `routes/api/admin.php` (with `auth:sanctum`, `verified`, `role:admin`, `throttle:api-limiter`)
- `$middleware->statefulApi()` ensures Sanctum’s `EnsureFrontendRequestsAreStateful` is active on API routes for SPA cookie authentication.
- Middleware aliases: `role` → `RoleMiddleware`, `premium` → `EnsurePremium`.

#### Sanctum SPA Configuration
Required `.env` settings:
```
SESSION_DRIVER=cookie
SESSION_DOMAIN=localhost
SANCTUM_STATEFUL_DOMAINS=localhost:3000,127.0.0.1:3000
```
The frontend must be served from one of these domains. Before any stateful request, the SPA must call `GET /api/auth/sanctum/csrf-cookie` to initialize the XSRF‑TOKEN cookie.

## API Contract (Planned Endpoints)
No controllers are implemented yet. The following endpoints are scaffolded via route files and comments.

### Authentication (`/api/auth/*`)
| Method | Endpoint | Rate Limiter | Description |
|--------|----------|--------------|-------------|
| `GET` | `/sanctum/csrf-cookie` | global | Initialize CSRF protection |
| `POST` | `/login` (planned) | `auth-limiter` | Login user |
| `POST` | `/register` (planned) | `auth-limiter` | Register user |
| `POST` | `/forgot-password` (planned) | `password-limiter` | Request password reset |
| `POST` | `/reset-password` (planned) | `password-limiter` | Reset password |

### User Routes (`/api/user/*`)
All require `auth:sanctum` + `verified` + `api-limiter`.  
Premium‑only routes additionally require the `premium` middleware.  
Upload routes use `upload-limiter` (10/min).

**Examples** (from comments):  
- `GET /profile` – user profile  
- `GET /advanced-analytics` – premium feature  
- `POST /habits/{id}/photo` – upload habit photo

### Admin Routes (`/api/admin/*`)
All require `auth:sanctum` + `verified` + `role:admin` + `api-limiter`.  
**Example**: `GET /dashboard-stats`

## Flow

### SPA Authentication Flow
1. **Frontend initialisation**  
   - The SPA calls `GET /api/auth/sanctum/csrf-cookie`.  
   - The backend sets the `XSRF-TOKEN` cookie and returns 204 No Content.
2. **Login**  
   - The SPA sends a `POST /api/auth/login` with credentials.  
   - On success, Sanctum issues a session cookie; the user is authenticated.
3. **Subsequent Requests**  
   - All calls to `/api/user/*` or `/api/admin/*` automatically include the session cookie.  
   - The `auth:sanctum` middleware authenticates the user.  
   - The `verified` middleware ensures the user’s email is verified (otherwise a 403 or redirect).  
   - Rate limiters count requests per authenticated user (or IP).
4. **Role/Feature Checks**  
   - Admin routes are guarded by `role:admin`.  
   - Premium routes are guarded by `premium`.

### Request Lifecycle (Middleware Order)
For a typical `/api/user/premium-feature`:
1. `auth:sanctum` – authenticates user  
2. `verified` – checks email verification  
3. `throttle:api-limiter` – rate limit  
4. `premium` – checks active non‑free subscription  
5. Controller logic

## Edge Cases

- **Invalid Role Parameter in Middleware**  
  If a developer misconfigures a route (e.g., `role:superadmin`), `RoleMiddleware` currently throws a 500 error with a descriptive message. This leaks internals and should be replaced with a 403 in production while logging the error.

- **Unverified User Access**  
  A user who has not verified their email will receive a 403 or a redirect response from the `verified` middleware (depending on Laravel’s default handler). The exact format is not yet customised to the API envelope.

- **Throttle Response Format**  
  When a rate limit is exceeded, Laravel returns a plain JSON structure:
  ```json
  { "message": "Too Many Attempts." }
  ```
  This breaks the API contract. A custom exception handler should map `ThrottleRequestsException` to the standard `{ success: false, error: 'too_many_requests', message, details: { retry_after } }` envelope.

- **Validation Error Inconsistency**  
  Currently, validation exceptions produce Laravel’s default 422 with an `errors` object, not the `HasApiResponse` shape. The frontend must handle two different error bodies unless a custom handler is added.

- **Stateful Domain Mismatch**  
  If the SPA is served from a domain not listed in `SANCTUM_STATEFUL_DOMAINS`, the session cookie will not be sent, and all `auth:sanctum` requests will return 401.

- **Missing CSRF Cookie**  
  If the SPA fails to call `/sanctum/csrf-cookie` before a POST request, a 419 CSRF token mismatch will occur.

## Tests (Recommended)
No test files were provided. The following critical scenarios should be covered:

1. **`RoleMiddleware`**
   - Valid role parameter with matching user role → passes.
   - Valid role but user role mismatch → 403.
   - Invalid role parameter (non‑enum) → during testing with `APP_DEBUG=true` returns 500; test that it logs and returns 403 in production configuration.
   - Unauthenticated user → 403 (or 401 depending on ordering; ensure `auth` middleware is applied).

2. **`EnsurePremium`**
   - Authenticated user with active premium subscription → passes.
   - Free plan active → 403 with `subscription_required`.
   - No subscription or inactive subscription → 403.
   - Unauthenticated user → 403 (should fail early via auth middleware).

3. **Rate Limiting**
   - Requests beyond limit return 429 (test the throttle middleware).
   - Verify that custom 429 handler (when added) returns the correct JSON envelope.
   - Rate limit identifiers: auth‑limiter by IP, api‑limiter by authenticated user ID, etc.

4. **API Response Trait**
   - `successResponse` returns expected shape.
   - `errorResponse` returns expected shape with/without details.

5. **Routing**
   - Auth routes are accessible under `/api/auth` with correct middleware groups.
   - User routes are protected by `auth:sanctum` and `verified`.
   - Admin routes are protected by `role:admin`.

6. **Sanctum CSRF**
   - `GET /api/auth/sanctum/csrf-cookie` returns 204 and sets cookies.

## Notes
- **Future Improvements**: Custom exception handlers for validation and throttle exceptions should be added in `bootstrap/app.php` to unify the API error envelope. The `RoleMiddleware` 500 response should be hardened for production (403 with internal logging).
- **Environment**: The project relies on Sanctum’s SPA authentication; the `.env` settings are mandatory for local development. Ensure `SANCTUM_STATEFUL_DOMAINS` matches your frontend URL.
- **Route Cleanup**: The current `routes/api.php` file might still contain old definitions. Consider removing it and relying solely on the new `auth.php`, `user.php`, `admin.php` files to avoid confusion.
- **Middleware Order**: `verified` middleware is applied after `auth:sanctum`, so an unauthenticated user will get a 401 before a 403 for unverified status.
- **Extensibility**: The `premium` middleware can be replaced or extended with a more granular plan‑check service once `PlanQuotaService` is implemented.

--- 