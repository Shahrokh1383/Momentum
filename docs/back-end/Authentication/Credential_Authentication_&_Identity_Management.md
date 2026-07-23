# Module 1: Credential Authentication & Identity Management

## 1. Overview
The Credential Authentication & Identity Management module handles traditional email/password-based authentication while supporting a dual-authentication paradigm (stateful SPA sessions and stateless API tokens). It enforces strict identity hygiene by segregating unverified accounts into a `PendingRegistration` model, ensuring the primary `User` table contains only verified, active identities. The module strictly adheres to the Single Responsibility Principle (SRP) by offloading business logic to dedicated services and centralizes dual-auth response orchestration via the `HandlesAuthResponses` trait. Security is enforced through deterministic request classification, strict credential validation, composite-key rate limiting, and strict integration with the `AuthenticateSession` middleware.

## 2. Business Rules
*   **Registration:** Users must provide a unique name, a strictly unique email (across the `users` table), and a strong password. Upon registration, credentials are temporarily stored in a `PendingRegistration` model rather than the primary `User` table. The user is only promoted to the main table after email verification is complete.
*   **Login:** Users authenticate via credentials with an optional "remember me" toggle. The system deterministically determines the response format (Session vs. Token) based on Bearer token presence and `Origin`/`Referer` headers matching `config('sanctum.stateful')`. For API clients, the "remember me" toggle dynamically adjusts the Bearer token expiration (1 year if true, 24 hours if false).
*   **Logout:** Users can invalidate their current session (SPA) or revoke their current Bearer token (API). A global logout option (`logout-all`) revokes all API tokens across all devices and invalidates the current SPA session.
*   **Throttling:** Strict rate limiting is applied to authentication endpoints using composite keys (`IP + Email/Endpoint`) to prevent distributed brute-force attacks and targeted harassment.

## 3. Backend

### Traits
*   **HandlesAuthResponses:** Centralizes the dual-authentication response logic. Replaces the flawed `$request->hasSession()` with a deterministic `isStatefulRequest()` method that checks for Bearer tokens and validates headers against `sanctum.stateful` domains. Handles dynamic API token expiration based on the `remember` flag.

### Controllers
*   **AuthController:** Handles `register`, `login`, `logout`, `logoutAll`, and `me` endpoints. Uses the `HandlesAuthResponses` trait to unify response logic across credential and OAuth flows.

### Services
*   **PendingRegistrationService:** Manages the lifecycle of unverified users. Creates temporary records, handles the dispatching of verification emails, and promotes the pending record to a verified `User` upon successful email signature validation.

### Models
*   **User:** Implements `MustVerifyEmail`. Represents the verified, active user identity.
*   **PendingRegistration:** Temporarily stores unverified user credentials (name, email, hashed password) with an expiration timestamp. Ensures the main `User` table remains clean of unverified accounts.

### Middleware & Requests
*   `auth:sanctum`: Ensures the user is authenticated (via Session or Bearer Token).
*   `verified`: Ensures the user's email is verified before accessing protected resources.
*   `\Illuminate\Session\Middleware\AuthenticateSession::class`: **Crucial for SPA security.** Validates the `password_hash` on every request, effectively killing hijacked sessions when a password is reset.
*   `RoleMiddleware`: Validates user roles against the `UserRole` Enum.
*   **Form Requests:** 
    *   `LoginRequest`: Enforces strict validation and prevents email enumeration.
    *   `RegisterRequest`: Enforces strict `unique:users` validation on the email field to prevent duplicate records at the validation layer.

## 4. API Contract

### Headers Required (Postman/Client)
*   `Content-Type: application/json`
*   `Accept: application/json`

### Endpoints

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

### Protected Routes (Requires `auth:sanctum` + `verified` + `AuthenticateSession`)
*   **`GET /api/user/me`**
    *   *Response:* `200` `{ user }`

## 5. Flow

### SPA Dual-Auth Flow
1.  SPA requests `GET /sanctum/csrf-cookie` to establish the session.
2.  User submits credentials to `POST /login` (or registers).
3.  Controller delegates to `HandlesAuthResponses::authenticateAndRespond()`.
4.  Trait executes `isStatefulRequest()`: checks if Bearer token is absent AND `Referer`/`Origin` matches `config('sanctum.stateful')`.
5.  If SPA: `Auth::login()` is called, session is regenerated. If API: `createToken()` is called with dynamic expiration based on the `remember` boolean.

## 6. Edge Cases & Security Vulnerabilities (Resolved)

*   **Flawed Dual-Auth Detection (Resolved):** Replaced `$request->hasSession()` with a deterministic `isStatefulRequest()` method that checks Bearer tokens and validates headers against `sanctum.stateful` domains. Prevents mobile apps from accidentally triggering SPA logic.
*   **"Remember Me" Token Expiration (Resolved):** API tokens now respect the `remember` flag. Unchecked = 24-hour expiry. Checked = 1-year expiry.
*   **Email Enumeration (Resolved):** Generic responses on forgot-password and resend-verification flows (managed by sibling modules).
*   **Duplicate Email Registration (Resolved):** Enforced `unique:users` validation rule in `RegisterRequest`. This strictly rejects duplicate emails at the validation level before reaching service logic, ensuring data integrity and providing clear 422 feedback to the frontend.
*   **Rate Limiter Key Granularity (Resolved):** Composite keys (`IP|Email`) prevent distributed spam and targeted harassment.

## 7. Tests

*   **Registration/Login:** 
    *   Verify dynamic token expiration (24h vs 1y) based on `remember`.
    *   Verify `isStatefulRequest()` correctly routes SPA vs API clients.
    *   Test that registering with an existing email returns a 422 validation error.
*   **Logout:** Verify `logoutAll` deletes all records in `personal_access_tokens`.

## 8. Notes

*   **Frontend Constraints (Strict):** The frontend **must** map backend 422 validation errors (specifically for duplicate emails) directly to the form UI.
*   **Architectural Decision - DRY Trait:** The `HandlesAuthResponses` trait centralizes auth logic, ensuring `AuthController` and `OAuthController` follow exact standards without duplication.

---