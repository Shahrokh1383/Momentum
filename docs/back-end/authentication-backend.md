
---

# Backend Authentication Module Documentation

## 1. Overview
The Authentication module provides a secure, flexible, and stateless/stateful dual-authentication system for the application. It supports traditional credential-based authentication (Email/Password), OAuth2 integration (Google/GitHub), email verification, and password reset functionalities. 

The architecture serves both Single Page Applications (SPAs) using session-based authentication (via Laravel Sanctum's SPA authentication) and mobile/external clients using token-based authentication (via Sanctum API tokens). The module strictly adheres to the Single Responsibility Principle (SRP) and DRY (Don't Repeat Yourself) principles by delegating business logic to dedicated Services, leveraging Form Requests for validation, and centralizing dual-auth response logic in the `HandlesAuthResponses` trait. Security is hardened with Cache-based OAuth state validation, composite rate limiting, and cryptographically sound signature verification.

## 2. Business Rules
*   **Registration:** Users must provide a unique name, email, and a strong password (min 8 chars, mixed case, numbers, symbols). Upon registration, a verification email is dispatched, and the user is automatically logged in but remains in a "restricted" state until email verification is complete.
*   **Login:** Users can log in via credentials. Authentication supports a "remember me" toggle. The system determines the response format (Session vs. Token) based on the presence of an active session, centralizing this logic in the `HandlesAuthResponses` trait.
*   **Email Verification:** Email verification is mandatory for accessing protected routes. Verification links are cryptographic signed URLs valid for 60 minutes. The backend validates the signature natively on the POST request since the frontend preserves the raw query string parameters.
*   **Password Reset:** Password reset requests always return a generic success message to prevent email enumeration. Valid tokens allow the user to update their password, which automatically revokes all existing API tokens, invalidates sessions, and regenerates the `remember_token` for security.
*   **OAuth:** Users can authenticate via Google or GitHub. The system matches users by email. If an account exists, the OAuth provider is linked to it **only if** the OAuth provider has explicitly verified the email (preventing account takeover). If no account exists, a new one is created with `email_verified_at` set to the current timestamp. OAuth state validation is enforced strictly via a Cache-based mechanism to prevent CSRF attacks, bypassing Socialite's session dependency.
*   **Throttling:** Strict rate limiting is applied to authentication endpoints using composite keys (`IP + Email/Endpoint`). This prevents distributed spam (protecting email server reputation) and targeted harassment simultaneously.

## 3. Backend

### Traits
*   **HandlesAuthResponses:** Centralizes the dual-authentication response logic. It detects `$request->hasSession()` to determine if a session should be regenerated (SPA) or if a Sanctum Bearer token should be generated and returned (API/Mobile). Used by `AuthController` and `OAuthController`.

### Controllers
*   **AuthController:** Handles register, login, logout, and `me` endpoints. Uses the `HandlesAuthResponses` trait.
*   **EmailVerificationController:** Verifies signed URLs natively on the POST request by leveraging Laravel's `hasValidSignature` against the query string. Handles resend requests with generic responses to prevent email enumeration.
*   **PasswordResetController:** Manages the forgot/reset password flow.
*   **OAuthController:** Generates OAuth redirect URLs and handles provider callbacks. Enforces strict truthy email verification checks on existing accounts before linking and wraps DB operations in transactions. Uses the `HandlesAuthResponses` trait.

### Services
*   **EmailVerificationService:** Delegates verification notification sending to the `User` model and handles hash validation during verification.
*   **PasswordResetService:** Interfaces with Laravel's `Password` broker to generate tokens and reset passwords. Automatically revokes all Sanctum tokens and regenerates the `remember_token` upon password reset.
*   **OAuthService:** Interfaces with Laravel Socialite to validate providers. Generates and stores a cryptographically secure `state` parameter in the Cache (10 min TTL) during redirect, and strictly verifies this state against the Cache during the callback before retrieving the `SocialiteUser` statelessly.

### Models
*   **User:** Implements `MustVerifyEmail`. Overrides `sendEmailVerificationNotification` and `sendPasswordResetNotification` to generate deep-links pointing to the SPA frontend, appending Laravel's signed URL parameters.

### Middleware & Requests
*   `auth:sanctum`: Ensures the user is authenticated (via Session or Bearer Token).
*   `verified`: Ensures the user's email is verified.
*   `RoleMiddleware`: Validates user roles against the `UserRole` Enum.
*   **OAuthCallbackRequest:** Form Request requiring both `code` and `state` from the OAuth provider callback.
*   **ResendVerificationRequest:** Form Request requiring a valid `email` format for resending verification links.

## 4. API Contract

### Credential Auth
*   **`POST /api/auth/register`**
    *   *Body:* `{ name, email, password, password_confirmation }`
    *   *Response:* `201` `{ user, message }` (If API, includes `token`)
*   **`POST /api/auth/login`**
    *   *Body:* `{ email, password, remember }`
    *   *Response:* `200` `{ user }` (If SPA) | `{ user, token }` (If API)
*   **`POST /api/auth/logout`** *(Auth Required)*
    *   *Response:* `200` `{ message }` (Invalidates Session or deletes Bearer Token)

### Password Reset
*   **`POST /api/auth/forgot-password`**
    *   *Body:* `{ email }`
    *   *Response:* `200` `{ message: "If an account with that email exists..." }`
*   **`POST /api/auth/reset-password`**
    *   *Body:* `{ token, email, password, password_confirmation }`
    *   *Response:* `200` `{ message: "Password reset successfully..." }` *(Side-effect: Revokes all API tokens)*

### Email Verification
*   **`POST /api/auth/verify-email?{raw_query_string}`**
    *   *Body:* Empty (Parameters are in the query string)
    *   *Response:* `200` `{ message: "Email verified successfully..." }`
*   **`POST /api/auth/verify-email/resend`**
    *   *Body:* `{ email }`
    *   *Response:* `200` `{ message: "If an account with that email exists and is unverified..." }`

### OAuth
*   **`GET /api/auth/oauth/{provider}`**
    *   *Response:* `200` `{ url, state }`
*   **`POST /api/auth/oauth/{provider}/callback`**
    *   *Body:* `{ code, state }`
    *   *Response:* `200` `{ user, message }` (If API, includes `token`)

### Protected Routes (Requires `auth:sanctum` + `verified`)
*   **`GET /api/auth/me`**
    *   *Response:* `200` `{ user }`

## 5. Flow

### SPA Dual-Auth Flow
1.  SPA requests `GET /sanctum/csrf-cookie` to establish the session.
2.  User submits credentials to `POST /login` (or registers, or uses OAuth).
3.  Controller delegates to `HandlesAuthResponses::authenticateAndRespond()`.
4.  Trait detects `$request->hasSession() === true`.
5.  `Auth::login()` is called, session is regenerated, and `UserResource` is returned (No token exposed).
6.  For Mobile/API clients, step 1 is skipped; `hasSession() === false`, triggering `createToken()` and returning the Bearer token.

### Email Verification Flow
1.  Backend generates a temporary signed route using `url()->temporarySignedRoute`.
2.  The relative path + query params are appended to the `frontend_url`.
3.  User clicks link in email -> SPA loads `VerifyEmailPage`.
4.  SPA reads `window.location.search.slice(1)` and sends a `POST /verify-email?{rawQueryString}` request.
5.  Laravel's native `$request->hasValidSignature()` validates the HMAC directly on the POST request's query string.
6.  If valid, `EmailVerificationService` marks email verified.

### Password Reset Flow
1.  User requests `POST /forgot-password`.
2.  `PasswordResetService` generates a token via Laravel's broker and sends `PasswordResetMail` with a frontend deep-link.
3.  User sets new password via `POST /reset-password`.
4.  `PasswordResetService` updates password, revokes all `personal_access_tokens` (`$user->tokens()->delete()`), and invalidates the `remember_token`.

### OAuth Flow (Cache-based State)
1.  Frontend requests `GET /oauth/{provider}`.
2.  `OAuthService` generates a random 40-char `state`, stores it in Cache (`oauth_state_{state}` => `provider`) for 10 mins, and returns the Socialite redirect URL + `state` to the frontend.
3.  Frontend stores `state` in `sessionStorage` and redirects user to the URL.
4.  Provider redirects back to frontend `OAuthCallbackPage` with `?code=xxx`.
5.  Frontend retrieves `state` from `sessionStorage` and sends `POST /oauth/{provider}/callback` with `{ code, state }`.
6.  `OAuthService` pulls the state from Cache and validates that it exists and matches the provider.
7.  If valid, Socialite's `stateless()->user()` is called to fetch the user data.
8.  If an existing user is found by email, the system strictly checks if the OAuth provider has explicitly verified the email (defaults to `false` if omitted). If not, the link is rejected (403). If yes, the provider is linked inside a `DB::transaction`.
9.  If no user exists, a new user is created with `email_verified_at = now()`.
10. `HandlesAuthResponses` logs the user in and returns the appropriate response.

## 6. Edge Cases & Security Vulnerabilities (Resolved)

*   **Email Enumeration (Resolved):** The `exists:users,email` rule is removed from `ForgotPasswordRequest` and `ResendVerificationRequest`. Validation only checks format. Controller/Service logic ensures a generic success message is always returned regardless of email existence.
*   **Token Revocation on Reset (Resolved):** Password reset securely invalidates hijacked sessions by explicitly calling `$user->tokens()->delete()` and regenerating the `remember_token` inside the reset closure.
*   **OAuth Pre-Account Takeover (Resolved):** Auto-linking accounts solely by email is restricted. The system now strictly checks the OAuth provider's email verification status (`$socialUser->user['email_verified'] ?? false`). If the provider has not verified the email (or omits the field, like GitHub), the OAuth attempt is rejected with a `403`.
*   **Native Signature Validation (Resolved):** Since the frontend preserves the exact byte order of the signed URL by sending it as a query string on a POST request, the backend leverages Laravel's native `$request->hasValidSignature()` directly. This eliminates the need for error-prone synthetic request reconstruction.
*   **OAuth CSRF Vulnerability via `stateless()` (Resolved):** Instead of relying on sessions (which breaks API clients) or completely ignoring state (which enables CSRF), the system implements Cache-based state management. The state is generated server-side, stored in Cache with a 10-minute TTL, and strictly verified via `Cache::pull()` during the callback before calling Socialite's `stateless()->user()`.
*   **Rate Limiter Key Granularity (Resolved):** Custom Rate Limiters use composite keys (e.g., `IP|Email` or `IP|Endpoint`). This prevents distributed proxy spam (protecting email server reputation/avoiding blacklists) while simultaneously preventing targeted harassment/lockouts for specific users.

## 7. Tests

*   **Registration:** Validate successful registration, check validation errors (weak password, duplicate email), verify email dispatch. Verify API clients receive a token on registration.
*   **Login:** Verify token generation for API, session initiation for SPA, and correct response for invalid credentials. Verify `HandlesAuthResponses` trait logic.
*   **Email Verification:** 
    *   Test valid signature verification via POST query string.
    *   Test expired/tampered signature rejection (422).
    *   Test resending verification to already verified users returns generic success.
    *   Test resending to non-existent emails returns generic success (prevents enumeration).
*   **Password Reset:** 
    *   Verify generic response for existing and non-existing emails.
    *   Verify successful password reset.
    *   Verify that existing Sanctum tokens are deleted after password reset.
*   **OAuth:** 
    *   Test invalid provider rejection.
    *   Test missing/invalid `state` parameter in callback (CSRF check).
    *   Test new user creation via OAuth.
    *   Test existing user linking via OAuth when provider email is verified.
    *   Test rejection of existing user linking when provider email is unverified or omitted (403).
*   **Middleware:** Verify `verified` middleware blocks unauthenticated/unverified access to `/me`.

## 8. Notes

*   **Architectural Decision - DRY Trait:** The `HandlesAuthResponses` trait was introduced to centralize `Auth::login`, session regeneration, and token generation. This ensures that `AuthController` and `OAuthController` follow the exact same authentication and response standards without code duplication.
*   **Architectural Decision - SRP:** Session management is intentionally kept outside the `DB::transaction` in the `register` method because session persistence is not a database concern.
*   **Socialite Stateless + Cache State:** OAuth is handled using `stateless()->user()` *after* manual state validation via Cache. This perfectly decouples the OAuth flow from Laravel's session middleware, making it fully compatible with both SPA (Cookie) and API (Token) architectures without sacrificing CSRF protection.
*   **Native Query String Validation:** Creating a synthetic `Request::create()` instance for signature validation is unnecessary because the frontend correctly forwards the raw query string. Laravel's native HMAC validation works perfectly on POST requests as long as the parameters reside in the query string.

---