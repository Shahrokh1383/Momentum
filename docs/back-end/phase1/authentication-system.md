# Authentication System (Backend) – Documentation

## Overview
This module implements the complete authentication layer for the Momentum SPA. It covers credential registration/login, logout, email verification (simulated), password reset (simulated), OAuth2 login for Google and GitHub, and a CSRF cookie endpoint. All endpoints return a consistent JSON structure using the `HasApiResponse` trait and the `UserResource`. The system uses Laravel Sanctum for cookie‑based SPA authentication, enforces strict password rules, and leverages role‑based middleware for later admin features.

## Business Rules
1. **Registration**
   - Name, email, and password are required.
   - Password must be at least 8 characters, with mixed case, numbers, and symbols.
   - Email must be unique.
   - A verification token is generated and stored in `sent_emails_log`; no actual email is sent.
   - The user is automatically logged in and a new session is issued.
   - **No subscription row is created** on registration (a free subscription will be added later).

2. **Login**
   - Credentials (email + password) are validated.
   - On success, a Sanctum session cookie is set and the user’s session is regenerated (prevents session fixation).
   - A `remember` boolean can be passed; if true, the session is remembered.

3. **Logout**
   - Requires authentication but **not email verification** (to avoid locking out unverified users).
   - The Sanctum session is invalidated, the token revoked, and the session cookie cleared.

4. **Email Verification (Simulated)**
   - A random 60‑character token is generated and stored in `sent_emails_log` with type `email_verification`.
   - Verification: `GET /api/auth/verify-email/{token}`. The token is looked up; if valid, the corresponding user’s `email_verified_at` is set, and the token is deleted.
   - Tokens have **no expiry** (indefinitely valid until used).
   - **Resending**: a new token is created only if the user exists and is not yet verified. The response is always successful to prevent user enumeration.

4. **Password Reset (Simulated)**
   - **Forgot password**: accepts an email, always returns a success message. Internally, a token is generated and stored (type `password_reset`). No existence check is performed to avoid user enumeration.
   - **Resetting**: requires token, email, and new password (same strict rules). The token must match the email and type; if valid, the password is updated and the token is deleted.
   - **Token cleanup**: When a new reset token is requested, all existing password reset tokens for that email are deleted. Only the latest token is valid.

5. **OAuth2 (Google, GitHub)**
   - **Apple is intentionally excluded** because it requires a paid developer account and empty configs would cause runtime errors.
   - `GET /api/auth/oauth/{provider}` returns the OAuth redirect URL (frontend opens popup).
   - `POST /api/auth/oauth/{provider}/callback` exchanges the authorization code for user data. If the user already exists by provider & provider_id, they are logged in. Otherwise, a new user is created with `email_verified_at` set to `now()` (provider‑verified). A Sanctum session is issued.
   - All OAuth calls are **stateless** (no server‑side session) because the code exchange happens in a POST request from the frontend.

6. **Rate Limiting**
   - `auth-limiter` (5 req/min per IP) on login and register.
   - `password-limiter` (1 req/5 min per IP) on forgot‑password, reset‑password, and resend‑verification.
   - `api-limiter` (60 req/min per authenticated user/IP) on all user routes.

7. **Session & Security**
   - Session driver is `cookie`.
   - `SANCTUM_STATEFUL_DOMAINS` must include the frontend origin.
   - `Auth::login()` followed by `$request->session()->regenerate()` prevents session fixation.

8. **User Representation**
   - All auth responses include a `UserResource` with a computed `is_premium` attribute (derived from subscription). A newly registered user without a subscription row will have `is_premium: false` and `subscription: null`.

## Backend

### Directory Structure
- **Models** – `User` (includes `getIsPremiumAttribute()`)
- **Http/Resources/User** – `UserResource`
- **Http/Requests/Auth** – `RegisterRequest`, `LoginRequest`, `ForgotPasswordRequest`, `ResetPasswordRequest`, `OAuthCallbackRequest`
- **Http/Controllers/Auth** – `AuthController`, `OAuthController`, `EmailVerificationController`, `PasswordResetController`
- **Services/Auth** – `OAuthService`
- **Routes** – `routes/api/auth.php`, `routes/api/user.php`
- **Config** – `services.php` (OAuth credentials)

### Key Components

#### User Model (`app/Models/User.php`)
Added accessor:
```php
public function getIsPremiumAttribute(): bool
{
    return $this->subscription?->isActive() && $this->subscription->plan !== PlanSlug::FREE;
}
```
This relies on the `subscription` relationship (loaded via `->load('subscription')` in controllers).

#### UserResource (`app/Http/Resources/User/UserResource.php`)
Standardized response shape:
```json
{
  "id": 1,
  "name": "John",
  "email": "john@example.com",
  "avatar": null,
  "role": "user",
  "email_verified_at": null,
  "profile_visibility": "public",
  "is_premium": false,
  "subscription": {
    "plan": "free",
    "status": "active",
    "expires_at": null
  },
  "created_at": "2026-06-01T12:00:00Z"
}
```
Subscription fields are included only when the relation is loaded (`whenLoaded`).

#### Form Requests
All requests handle format validation only; no existence checks that would leak user data.

| Request | Rules |
|---------|-------|
| `RegisterRequest` | `name` (required, string, max:255), `email` (required, email, unique:users), `password` (required, confirmed, Password::min(8)->mixedCase()->numbers()->symbols()) |
| `LoginRequest` | `email` (required, email), `password` (required, string), `remember` (boolean) |
| `ForgotPasswordRequest` | `email` (required, string, email) – **no `exists`** |
| `ResetPasswordRequest` | `token` (required, string), `email` (required, email, exists:users,email), `password` (required, confirmed, Password::min(8)->mixedCase()->numbers()->symbols()) |
| `OAuthCallbackRequest` | `code` (required, string) |

*Note:* `ResetPasswordRequest` still uses `exists:users,email` because the token lookup already requires a valid email; this prevents unnecessary token searches. The email must belong to a real user.

#### Controllers

**AuthController** (`register`, `login`, `logout`, `me`)
- `register`: Creates user, logs them in, generates a verification token, returns 201 with user.
- `login`: Attemps auth, regenerates session, returns user.
- `logout`: Uses `Auth::guard('web')->logout()`, invalidates session, returns success.
- `me`: Returns authenticated user.

**OAuthController**
- `redirect($provider)`: Returns OAuth URL via `OAuthService`.
- `callback($provider)`: Exchanges code, finds or creates user, logs in, returns user.
- Both use `stateless()` in the service.

**EmailVerificationController**
- `verify($token)`: Finds log entry, marks email verified, deletes log.
- `resend`: Accepts email (no `exists` rule), finds user, if not verified creates a new token and returns success (silent if user doesn't exist).

**PasswordResetController**
- `forgot`: Accepts email, deletes existing reset tokens for that email, creates a new one, returns success.
- `reset`: Validates token + email, updates password, deletes token.

#### OAuthService (`app/Services/Auth/OAuthService.php`)
- Defines allowed providers: `['google', 'github']`.
- `getRedirectUrl()`: uses `Socialite::driver()->stateless()->redirect()->getTargetUrl()`.
- `handleCallback()`: uses `Socialite::driver()->stateless()->user()`.
- Throws `InvalidArgumentException` for unsupported providers.

#### Routes

**`routes/api/auth.php`** (final design)
```php
// CSRF Cookie
Route::get('/sanctum/csrf-cookie', fn() => response()->noContent());

// Credential Auth (rate limited)
Route::middleware('throttle:auth-limiter')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);
});

// Logout (auth required, but NOT verified)
Route::middleware('auth:sanctum')->post('/logout', [AuthController::class, 'logout']);

// Password Reset (rate limited)
Route::middleware('throttle:password-limiter')->group(function () {
    Route::post('forgot-password', [PasswordResetController::class, 'forgot']);
    Route::post('reset-password', [PasswordResetController::class, 'reset']);
});

// Email Verification
Route::get('verify-email/{token}', [EmailVerificationController::class, 'verify']);
Route::middleware('throttle:password-limiter')->post('verify-email/resend', [EmailVerificationController::class, 'resend']);

// OAuth
Route::get('oauth/{provider}', [OAuthController::class, 'redirect']);
Route::post('oauth/{provider}/callback', [OAuthController::class, 'callback']);
```

**`routes/api/user.php`**
```php
Route::middleware(['auth:sanctum', 'verified', 'throttle:api-limiter'])->group(function () {
    Route::get('me', [AuthController::class, 'me']);
    // ... other user routes (habits, etc.)
});
```
*Note:* `logout` is intentionally not inside this group; it resides in `api/auth.php` behind only `auth:sanctum`.

#### Configuration
- **`.env`**: `SESSION_DRIVER=cookie`, `SESSION_DOMAIN=localhost`, `SANCTUM_STATEFUL_DOMAINS=localhost:3000,127.0.0.1:3000`.
- **`config/services.php`**: `github` and `google` credentials; Apple entries are present but empty (not used).

## API Contract

All endpoints share the standard JSON envelope defined in `HasApiResponse`.

### Authentication & Session

#### `GET /api/auth/sanctum/csrf-cookie`
- **Auth**: None
- **Rate limit**: Global
- **Success**: `204 No Content` (sets XSRF-TOKEN cookie)

#### `POST /api/auth/register`
- **Auth**: None
- **Rate limit**: `auth-limiter` (5/min)
- **Request** (JSON):
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Str0ng!Pass",
  "password_confirmation": "Str0ng!Pass"
}
```
- **Success (201)**:
```json
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "data": { /* UserResource */ }
}
```
- **Errors**:
  - `422` validation errors (format: Laravel default unless custom handler added).
  - `429` too many requests.

#### `POST /api/auth/login`
- **Auth**: None
- **Rate limit**: `auth-limiter` (5/min)
- **Request**:
```json
{
  "email": "john@example.com",
  "password": "Str0ng!Pass",
  "remember": true
}
```
- **Success (200)**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": { /* UserResource */ }
}
```
- **Errors**:
  - `401` `{ "success": false, "error": "authentication_failed", "message": "Invalid credentials" }`

#### `POST /api/auth/logout`
- **Auth**: `auth:sanctum` (no verified)
- **Rate limit**: None specific
- **Success (200)**:
```json
{
  "success": true,
  "message": "Logged out successfully",
  "data": null
}
```

#### `GET /api/user/me`
- **Auth**: `auth:sanctum` + `verified`
- **Rate limit**: `api-limiter` (60/min)
- **Success (200)**: `{ "success": true, "message": "Success", "data": { /* UserResource */ } }`

### Email Verification

#### `GET /api/auth/verify-email/{token}`
- **Auth**: None
- **Success**: `{ "success": true, "message": "Email verified successfully.", "data": null }`
- **Already verified**: `{ "success": true, "message": "Email already verified.", "data": null }`
- **Invalid token**: `{ "success": false, "error": "invalid_token", "message": "Invalid or expired verification token", "details": null }` (404)
- Token is deleted after successful verification or if already verified.

#### `POST /api/auth/verify-email/resend`
- **Auth**: None (rate limited: `password-limiter`)
- **Request**: `{ "email": "john@example.com" }`
- **Success (always)**: `{ "success": true, "message": "Verification email resent.", "data": null }`
- Even if the email doesn’t exist or is already verified, the response is the same (anti‑enumeration). A new token is only created when the user exists and is unverified.

### Password Reset

#### `POST /api/auth/forgot-password`
- **Auth**: None, rate limited `password-limiter`
- **Request**: `{ "email": "john@example.com" }`
- **Success (always)**: `{ "success": true, "message": "If the email exists, reset instructions have been sent.", "data": null }`
- Internally, all previous reset tokens for that email are deleted before a new one is inserted (if the email exists; if not, nothing is stored). No indication of existence is given.

#### `POST /api/auth/reset-password`
- **Auth**: None, rate limited `password-limiter`
- **Request**:
```json
{
  "token": "abc123...",
  "email": "john@example.com",
  "password": "NewStr0ng!Pass",
  "password_confirmation": "NewStr0ng!Pass"
}
```
- **Success**: `{ "success": true, "message": "Password reset successfully.", "data": null }`
- **Invalid/expired token**: `{ "success": false, "error": "invalid_token", "message": "Invalid or expired reset token", "details": null }` (400)
- Token is deleted on success.

### OAuth2

#### `GET /api/auth/oauth/{provider}`
- **Provider**: `google` or `github`
- **Auth**: None
- **Success (200)**:
```json
{
  "success": true,
  "message": "OAuth URL generated",
  "data": { "url": "https://accounts.google.com/o/oauth2/auth?..." }
}
```
- **Invalid provider**: `400 { "error": "invalid_provider", "message": "Unsupported OAuth provider: ..." }`

#### `POST /api/auth/oauth/{provider}/callback`
- **Auth**: None
- **Request**: `{ "code": "authorization_code_from_frontend" }`
- **Success (200)**: `{ "success": true, "message": "OAuth login successful", "data": { /* UserResource */ } }`
- **Invalid provider**: 400
- **OAuth exchange failure**: `401 { "error": "oauth_failed", "message": "Could not authenticate with {provider}" }`

## Flow

### Registration & Email Verification
1. Frontend POSTs name, email, password.
2. User created, auto‑logged in, session regenerated.
3. Verification token stored; response includes user data (with `is_premium: false`, `subscription: null`).
4. Developer retrieves token from `sent_emails_log`.
5. Frontend calls `GET /api/auth/verify-email/{token}`.
6. User’s `email_verified_at` set, token deleted.
7. User can now access `/api/user/*` routes.

### Login
1. POST credentials.
2. If valid, session regenerated, user returned.
3. All subsequent requests include session cookie; verified middleware is bypassed until the user tries to access protected user routes.

### Logout
1. Authenticated user (even if unverified) calls `POST /api/auth/logout`.
2. Session invalidated, cookie cleared.

### Password Reset
1. User requests reset → token stored (old ones deleted). Response always “If email exists…”.
2. Developer reads token from log.
3. User submits token + new password.
4. If token matches and email valid, password updated, token deleted.

### OAuth Login
1. Frontend requests redirect URL (`GET /api/auth/oauth/{provider}`).
2. Frontend opens popup, user authenticates, provider redirects with code.
3. Frontend sends code to `POST /api/auth/oauth/{provider}/callback`.
4. Backend exchanges code, gets user data.
5. User found or created, email verified automatically, session issued.

## Edge Cases

- **Unverified user accessing `/api/user/me`**: Blocked by `verified` middleware; returns a response (typically redirect/403). The exact format is not yet customised.
- **User registers but subscription row missing**: `is_premium` returns false, `subscription` fields are null. This is expected until subscription auto‑creation is implemented.
- **OAuth with unsupported provider (e.g., Apple)**: Returns 400.
- **OAuth callback code invalid**: Socialite throws an exception; caught and returns 401.
- **Password reset: multiple tokens**: Only the latest one works; old ones are cleaned.
- **Email verification resend to non‑existent email**: Returns success without doing anything.
- **Logout without email verification**: Works because logout is outside `verified` middleware.
- **Session fixation**: Prevented by `session()->regenerate()` after login/register.
- **Rate limiting on sensitive endpoints**: Configurable in `AppServiceProvider`.

## Tests (Recommended)
1. **Registration**
   - Valid data → 201, user created, token in log, logged in.
   - Duplicate email → 422.
   - Weak password → 422 (with appropriate message).

2. **Login**
   - Valid credentials → 200, session cookie set, user resource returned.
   - Wrong password → 401.
   - Remember me flag works.

3. **Logout**
   - Authenticated user can logout even if unverified → 200.
   - Subsequent API calls fail with 401.

4. **Email Verification**
   - Valid token → marks email verified, token deleted.
   - Invalid token → 404.
   - Already verified → success message, token deleted.
   - Resend: creates new token only for existing unverified user; always returns success.

5. **Password Reset**
   - Forgot: always success, token created.
   - Reset: valid token changes password, invalid token returns 400.
   - Token cleanup: new request deletes old tokens.

6. **OAuth**
   - Redirect returns valid URL for allowed providers.
   - Callback with valid code creates/finds user, logs in.
   - Invalid provider → 400.
   - Bad code → 401.

7. **Middleware & Rate Limiting**
   - `verified` middleware blocks unverified user from `/api/user/me`.
   - Rate limits enforced on respective endpoints.
   - Throttle response format (when customised) matches API envelope.

## Notes
- **Missing Subscription Auto‑creation**: When a user registers, no `Subscription` row is created. This will be added in a later module. Currently, `is_premium` is always false for new users.
- **Verification Token Expiry**: Tokens have no expiry. This is acceptable for development but should be revisited for production.
- **Logout Placement**: To avoid locking unverified users, `logout` is placed in `routes/api/auth.php` behind only `auth:sanctum`, not the `verified` group.
- **User Enumeration**: `ForgotPasswordRequest` and resend validation omit `exists` checks; the controllers always return the same success message. `ResetPasswordRequest` retains `exists` because it’s part of the token‑email validation.
- **OAuth Statelessness**: Required because the backend does not maintain OAuth session state. The flow is entirely code‑based.
- **Apple OAuth**: Not implemented to avoid runtime errors from missing credentials.
- **Security**: Session regeneration, password hashing, and strict password rules are enforced. CSRF cookie is obtained before any stateful request.
- **Route File Cleanup**: The original `routes/api.php` may still contain a placeholder; it is no longer used for auth or user routes.

--- 