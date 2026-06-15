# Backend Authentication Module Documentation

## 1. Overview
The Authentication module provides a secure, flexible, and stateless/stateful dual-authentication system for the application. It supports traditional credential-based authentication (Email/Password), OAuth2 integration (Google/GitHub), email verification, and password reset functionalities. 

The architecture serves both Single Page Applications (SPAs) using session-based authentication (via Laravel Sanctum's SPA authentication) and mobile/external clients using token-based authentication (via Sanctum API tokens). The module strictly adheres to the Single Responsibility Principle (SRP) and DRY (Don't Repeat Yourself) principles by delegating business logic to dedicated Services, leveraging Form Requests for validation, and centralizing dual-auth response logic in the `HandlesAuthResponses` trait. Security is hardened with deterministic dual-auth detection, Cache-based OAuth state validation, WAF-safe synthetic request validation for signed URLs, strict provider-specific email verification, and a `PendingRegistration` model to keep the primary `User` table free of unverified accounts.

## 2. Business Rules
*   **Registration:** Users must provide a unique name, a strictly unique email (across the `users` table), and a strong password. Upon registration, credentials are temporarily stored in a `PendingRegistration` model. A verification email is dispatched using a centralized `EmailVerificationService` to generate cryptographic signed URLs. The user is only moved to the main `User` table and logged in once email verification is complete.
*   **Login:** Users can log in via credentials. Authentication supports a "remember me" toggle. The system deterministically determines the response format (Session vs. Token) based on Bearer token presence and `Origin`/`Referer` headers matching `config('sanctum.stateful')`. For API clients, the "remember me" toggle dynamically adjusts the Bearer token expiration (1 year if true, 24 hours if false).
*   **Email Verification:** Email verification is mandatory for accessing protected routes. Verification links are cryptographic signed URLs valid for 60 minutes. To bypass enterprise WAF/Load Balancer query-string stripping on POST requests, the frontend sends signature parameters in the JSON body, and the backend validates them using a synthetic GET request.
*   **Password Reset:** Password reset requests always return a generic success message to prevent email enumeration. Valid tokens allow the user to update their password, which automatically revokes all existing API tokens, invalidates the `remember_token`, and forces SPA session invalidation via the `AuthenticateSession` middleware checking the `password_hash`.
*   **OAuth:** Users can authenticate via Google or GitHub. The system matches users by email. If an account exists, the OAuth provider is linked **only if** the provider has explicitly verified the email (handling GitHub's specific `emails` array payload vs Google's base payload). Users can unlink providers, provided they have a password set as a fallback. OAuth state validation is enforced strictly via a Cache-based mechanism to prevent CSRF attacks.
*   **Throttling:** Strict rate limiting is applied to authentication endpoints using composite keys (`IP + Email/Endpoint`).

## 3. Backend

### Traits
*   **HandlesAuthResponses:** Centralizes the dual-authentication response logic. Replaces the flawed `$request->hasSession()` with a deterministic `isStatefulRequest()` method that checks for Bearer tokens and validates headers against `sanctum.stateful` domains. Handles dynamic API token expiration based on the `remember` flag.

### Controllers
*   **AuthController:** Handles register, login, logout, `logoutAll`, and `me` endpoints. Uses the `HandlesAuthResponses` trait.
*   **EmailVerificationController:** Verifies signed URLs natively by reconstructing a synthetic GET request from JSON body parameters, ensuring compatibility with strict WAFs. Handles resend requests with generic responses.
*   **PasswordResetController:** Manages the forgot/reset password flow.
*   **OAuthController:** Generates OAuth redirect URLs, handles provider callbacks, and manages provider unlinking. Delegates provider-specific email verification logic to the `OAuthService`.

### Services
*   **EmailVerificationService:** Centralizes the generation of frontend-compatible temporary signed URLs (`generateVerificationUrl`) to strictly enforce DRY across the `User` model and `PendingRegistrationService`. Delegates notification sending and handles hash validation during verification.
*   **PasswordResetService:** Interfaces with Laravel's `Password` broker to generate tokens and reset passwords. Automatically revokes all Sanctum tokens and regenerates the `remember_token` upon password reset.
*   **OAuthService:** Interfaces with Laravel Socialite. Generates and stores a cryptographically secure `state` parameter in the Cache (10 min TTL). Contains the `isEmailVerified()` method to abstract provider-specific payload quirks (e.g., parsing GitHub's `emails` array).
*   **PendingRegistrationService:** Manages the lifecycle of unverified users. Creates temporary records, handles the dispatching of verification emails, and promotes the pending record to a verified `User` upon successful signature validation.

### Models
*   **User:** Implements `MustVerifyEmail`. Overrides `sendEmailVerificationNotification` to delegate URL generation to the `EmailVerificationService`, appending Laravel's signed URL parameters to the SPA frontend deep-link.
*   **PendingRegistration:** Temporarily stores unverified user credentials (name, email, hashed password) with an expiration timestamp. Ensures the main `User` table remains clean of unverified accounts.

### Middleware & Requests
*   `auth:sanctum`: Ensures the user is authenticated (via Session or Bearer Token).
*   `verified`: Ensures the user's email is verified.
*   `\Illuminate\Session\Middleware\AuthenticateSession::class`: **Crucial for SPA security.** Validates the `password_hash` on every request, effectively killing hijacked sessions when a password is reset.
*   `RoleMiddleware`: Validates user roles against the `UserRole` Enum.
*   **Form Requests:** `LoginRequest`, `OAuthCallbackRequest`, `ForgotPasswordRequest`, `ResendVerificationRequest` enforce strict validation and prevent email enumeration. `RegisterRequest` enforces strict `unique:users` validation on the email field to prevent duplicate records.

## 4. API Contract

### Credential Auth
*   **`POST /api/auth/register`**
    *   *Body:* `{ name, email, password, password_confirmation }`
    *   *Response:* `201` `{ email, message }` (Returns the registered email for frontend state persistence).
    *   *Error:* `422` `{ message: "The email has already been taken.", errors: {...} }` (If email exists in `users` table).
*   **`POST /api/auth/login`**
    *   *Body:* `{ email, password, remember }`
    *   *Response:* `200` `{ user }` (If SPA) | `{ user, token }` (If API)
*   **`POST /api/user/logout`** *(Auth Required)*
    *   *Response:* `200` `{ message }` (Invalidates current Session or deletes current Bearer Token)
*   **`POST /api/user/logout-all`** *(Auth Required)*
    *   *Response:* `200` `{ message }` (Revokes ALL API tokens and invalidates current session)

### Password Reset
*   **`POST /api/auth/forgot-password`**
    *   *Body:* `{ email }`
    *   *Response:* `200` `{ message: "If an account with that email exists..." }`
*   **`POST /api/auth/reset-password`**
    *   *Body:* `{ token, email, password, password_confirmation }`
    *   *Response:* `200` `{ message: "Password reset successfully..." }` *(Side-effect: Revokes all API tokens, triggers AuthenticateSession logout)*

### Email Verification
*   **`POST /api/auth/verify-email`**
    *   *Body:* `{ id, hash, expires, signature }` *(Moved to JSON body for WAF safety)*
    *   *Response:* `200` `{ message: "Email verified successfully..." }`
*   **`POST /api/auth/verify-email/resend`**
    *   *Body:* `{ email }`
    *   *Response:* `200` `{ message: "If an account with that email exists and is unverified..." }`

### OAuth
*   **`GET /api/auth/oauth/{provider}`**
    *   *Response:* `200` `{ url, state }`
*   **`POST /api/auth/oauth/{provider}/callback`**
    *   *Body:* `{ code, state }` *(State must be read from URL query params by frontend, not sessionStorage)*
    *   *Response:* `200` `{ user, message }` (If API, includes `token`)
*   **`DELETE /api/auth/oauth/{provider}`** *(Auth Required)*
    *   *Response:* `200` `{ message }` (Unlinks provider. Fails with `422` if user has no password set).

### Protected Routes (Requires `auth:sanctum` + `verified` + `AuthenticateSession`)
*   **`GET /api/user/me`**
    *   *Response:* `200` `{ user }`

## 5. Flow

### SPA Dual-Auth Flow
1.  SPA requests `GET /sanctum/csrf-cookie` to establish the session.
2.  User submits credentials to `POST /login` (or registers, or uses OAuth).
3.  Controller delegates to `HandlesAuthResponses::authenticateAndRespond()`.
4.  Trait executes `isStatefulRequest()`: checks if Bearer token is absent AND `Referer`/`Origin` matches `config('sanctum.stateful')`.
5.  If SPA: `Auth::login()` is called, session is regenerated. If API: `createToken()` is called with dynamic expiration based on the `remember` boolean.

### Email Verification Flow
1.  Backend generates a temporary signed route via `EmailVerificationService::generateVerificationUrl()`.
2.  User clicks link -> SPA loads `VerifyEmailPage`.
3.  SPA reads parameters from the URL and sends a `POST /verify-email` with `{ id, hash, expires, signature }` in the **JSON Body**.
4.  Backend reconstructs a synthetic GET request using `Request::create()` and validates the HMAC via `$syntheticRequest->hasValidSignature()`.
5.  If valid, `EmailVerificationService` marks email verified and promotes `PendingRegistration` to `User` if applicable.

### Password Reset Flow
1.  User requests `POST /forgot-password`.
2.  `PasswordResetService` generates a token and sends email.
3.  User sets new password via `POST /reset-password`.
4.  Service updates password, deletes `$user->tokens()`, and regenerates `remember_token`.
5.  On the next SPA request, the `AuthenticateSession` middleware detects the `password_hash` mismatch and forcefully logs the user out.

### OAuth Flow (Cache-based State)
1.  Frontend requests `GET /oauth/{provider}`.
2.  `OAuthService` generates `state`, stores in Cache (10 min TTL), returns URL + `state`.
3.  Frontend redirects user. Provider redirects back to frontend with `?code=xxx&state=yyy`.
4.  **Crucial:** Frontend extracts `state` directly from the URL query parameters (avoiding Safari ITP / `sessionStorage` bugs) and sends `POST /callback`.
5.  `OAuthService` validates state via `Cache::pull()` and calls `stateless()->user()`.
6.  If existing user, `OAuthService->isEmailVerified()` strictly checks provider payload (handling GitHub's `emails` array). If verified, links in transaction.
7.  If no user, creates new user with `email_verified_at = now()`.

## 6. Edge Cases & Security Vulnerabilities (Resolved)

*   **Flawed Dual-Auth Detection (Resolved):** Replaced `$request->hasSession()` with a deterministic `isStatefulRequest()` method that checks Bearer tokens and validates headers against `sanctum.stateful` domains. Prevents mobile apps from accidentally triggering SPA logic.
*   **WAF Query String Stripping (Resolved):** Email verification parameters are now sent in the JSON body. The backend uses a synthetic `Request::create()` to validate the signature, bypassing enterprise WAFs that strip query strings from POST requests.
*   **True Session Invalidation (Resolved):** Added `\Illuminate\Session\Middleware\AuthenticateSession::class` to protected routes. This ensures that changing the `password_hash` during a reset actively kills hijacked SPA sessions on the very next request.
*   **GitHub `email_verified` Quirk (Resolved):** Extracted provider-specific logic into `OAuthService::isEmailVerified()`. It correctly parses GitHub's `emails` array for the primary verified email, preventing false 403 rejections.
*   **"Remember Me" Token Expiration (Resolved):** API tokens now respect the `remember` flag. Unchecked = 24-hour expiry. Checked = 1-year expiry.
*   **OAuth Provider Unlinking (Resolved):** Added `DELETE /api/auth/oauth/{provider}`. Includes a strict safeguard preventing unlinking if the user has no password set (preventing account lockouts).
*   **OAuth CSRF via `stateless()` (Resolved):** Cache-based state management with 10-min TTL.
*   **Email Enumeration (Resolved):** Generic responses on forgot-password and resend-verification.
*   **Duplicate Email Registration (Resolved):** Enforced `unique:users` validation rule in `RegisterRequest`. This strictly rejects duplicate emails at the validation level before reaching service logic, ensuring data integrity and providing clear 422 feedback to the frontend.
*   **Rate Limiter Key Granularity (Resolved):** Composite keys (`IP|Email`) prevent distributed spam and targeted harassment.

## 7. Tests

*   **Registration/Login:** Verify dynamic token expiration (24h vs 1y) based on `remember`. Verify `isStatefulRequest()` correctly routes SPA vs API clients. Test that registering with an existing email returns a 422 validation error.
*   **Email Verification:** Test synthetic request validation via JSON body. Test expired/tampered signature rejection. Verify promotion of `PendingRegistration` to `User`.
*   **Password Reset:** Verify that existing Sanctum tokens are deleted. Verify that `AuthenticateSession` middleware blocks access after a password reset.
*   **OAuth:** 
    *   Test GitHub email verification logic (mocking the `emails` array).
    *   Test `unlink()` success and `unlink()` block when no password is set.
    *   Test invalid `state` parameter rejection.
*   **Logout:** Verify `logoutAll` deletes all records in `personal_access_tokens`.

## 8. Notes

*   **Frontend Constraints (Strict):** 
    1. The frontend **must not** use `sessionStorage` for OAuth state. It must read it from the callback URL. 
    2. The frontend **must** send email verification parameters in the JSON body, not the query string.
    3. The frontend **must** map backend 422 validation errors (specifically for duplicate emails) directly to the form UI.
*   **Infrastructure Constraint (Cache):** The OAuth flow strictly requires a centralized Cache driver (`redis` or `memcached`). Using `file` or `array` in a load-balanced environment will cause random 401 CSRF errors.
*   **Architectural Decision - DRY Trait:** The `HandlesAuthResponses` trait centralizes auth logic, ensuring `AuthController` and `OAuthController` follow exact standards without duplication.
*   **Architectural Decision - SRP:** Provider-specific payload quirks (GitHub vs Google) are isolated in the `OAuthService`, keeping the Controller clean and focused on HTTP orchestration.
*   **Architectural Decision - Centralized URL Generation:** Signed URL generation is strictly isolated in `EmailVerificationService::generateVerificationUrl()`. This prevents logic duplication between the `User` model and `PendingRegistrationService`, ensuring any future changes to URL formatting or expiration times only need to be made in one place.
*   **Native Query String Validation:** Replaced with Synthetic Request validation to guarantee compatibility with strict enterprise network infrastructure (WAFs/ALBs).