Thank you for the highly detailed and professional analysis. Your explanations are clear, and your resolutions to the identified security vulnerabilities (Email Enumeration, Token Revocation, and OAuth Account Takeover) are spot-on. I now have a comprehensive and profound understanding of your architecture, business logic, and security constraints.

As requested, here is the complete, structured documentation for the Authentication module in English, incorporating the intended design and the critical security fixes we discussed.

---

# Backend Authentication Module Documentation

## 1. Overview
The Authentication module provides a secure, flexible, and stateless/stateful dual-authentication system for the application. It supports traditional credential-based authentication (Email/Password), OAuth2 integration (Google/GitHub), email verification, and password reset functionalities. 

The architecture is designed to serve both Single Page Applications (SPAs) using session-based authentication (via Laravel Sanctum's SPA authentication) and mobile/external clients using token-based authentication (via Sanctum API tokens). The module strictly adheres to the Single Responsibility Principle (SRP) by delegating business logic to dedicated Services and leveraging Form Requests for validation.

## 2. Business Rules
*   **Registration:** Users must provide a unique name, email, and a strong password (min 8 chars, mixed case, numbers, symbols). Upon registration, a verification email is dispatched, and the user is automatically logged in but remains in a "restricted" state until email verification is complete.
*   **Login:** Users can log in via credentials. Authentication supports a "remember me" toggle. The system determines the response format (Session vs. Token) based on the presence of an active session.
*   **Email Verification:** Email verification is mandatory for accessing protected routes. Verification links are cryptographic signed URLs valid for 60 minutes. 
*   **Password Reset:** Password reset requests always return a generic success message to prevent email enumeration. Valid tokens allow the user to update their password, which automatically revokes all existing API tokens and sessions for security.
*   **OAuth:** Users can authenticate via Google or GitHub. The system matches users by email. If an account exists, the OAuth provider is linked to it (provided the OAuth provider has explicitly verified the email). If no account exists, a new one is created with `email_verified_at` set to the current timestamp.
*   **Throttling:** Strict rate limiting is applied to authentication endpoints (`auth-limiter`, `password-limiter`, `reset-limiter`) to prevent brute-force and spam attacks.

## 3. Backend
### Controllers
*   **AuthController:** Handles register, login, logout, and `me` endpoints. Contains the centralized `authenticateAndRespond` method that resolves Stateful vs. Stateless responses.
*   **EmailVerificationController:** Verifies signed URLs and handles resend requests.
*   **PasswordResetController:** Manages the forgot/reset password flow.
*   **OAuthController:** Generates OAuth redirect URLs and handles provider callbacks.

### Services
*   **EmailVerificationService:** Delegates verification notification sending to the `User` model and handles the cryptographic hash validation during verification.
*   **PasswordResetService:** Interfaces with Laravel's `Password` broker to generate tokens and reset passwords. Responsible for revoking tokens upon password reset.
*   **OAuthService:** Interfaces with Laravel Socialite to validate providers and retrieve `SocialiteUser` objects.

### Models
*   **User:** Implements `MustVerifyEmail`. Overrides `sendEmailVerificationNotification` and `sendPasswordResetNotification` to generate deep-links pointing to the SPA frontend, appending Laravel's signed URL parameters.

### Middleware
*   `auth:sanctum`: Ensures the user is authenticated (via Session or Bearer Token).
*   `verified`: Ensures the user's email is verified.
*   `RoleMiddleware`: Validates user roles against the `UserRole` Enum.

## 4. API Contract

### Credential Auth
*   **`POST /api/auth/register`**
    *   *Body:* `{ name, email, password, password_confirmation }`
    *   *Response:* `201` `{ user, message }`
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
    *   *Response:* `200` `{ message: "Password reset successfully..." }`

### Email Verification
*   **`POST /api/auth/verify-email`**
    *   *Body:* `{ id, hash, expires, signature }` (Extracted from query string by frontend)
    *   *Response:* `200` `{ message: "Email verified successfully..." }`
*   **`POST /api/auth/verify-email/resend`**
    *   *Body:* `{ email }`
    *   *Response:* `200` `{ message: "Verification email sent..." }`

### OAuth
*   **`GET /api/auth/oauth/{provider}`**
    *   *Response:* `200` `{ url }`
*   **`POST /api/auth/oauth/{provider}/callback`**
    *   *Body:* `{ code }`
    *   *Response:* `200` `{ user, message }`

### Protected Routes (Requires `auth:sanctum` + `verified`)
*   **`GET /api/auth/me`**
    *   *Response:* `200` `{ user }`

## 5. Flow

### SPA Dual-Auth Flow
1.  SPA requests `GET /sanctum/csrf-cookie` to establish the session.
2.  User submits credentials to `POST /login`.
3.  `AuthController` detects `$request->hasSession() === true`.
4.  `Auth::login()` is called, session is regenerated, and `UserResource` is returned (No token exposed).
5.  For Mobile/API clients, step 1 is skipped; `hasSession() === false`, triggering `createToken()` and returning the Bearer token.

### Email Verification Flow
1.  Backend generates a temporary signed route using `url()->temporarySignedRoute`.
2.  The relative path + query params are appended to the `frontend_url`.
3.  User clicks link in email -> SPA loads `VerifyEmailPage`.
4.  SPA reads `window.location.search.slice(1)` (preserving exact byte order for HMAC validation).
5.  SPA sends `POST /verify-email` with the raw query parameters.
6.  Backend validates signature, marks email verified.

### Password Reset Flow
1.  User requests `POST /forgot-password`.
2.  `PasswordResetService` generates a token via Laravel's broker and sends `PasswordResetMail` with a frontend deep-link.
3.  User sets new password via `POST /reset-password`.
4.  `PasswordResetService` updates password, revokes all `personal_access_tokens`, and invalidates the `remember_token`.

## 6. Edge Cases & Security Vulnerabilities (Resolved & Unresolved)

*   **Email Enumeration (Resolved):** The `exists:users,email` rule in `ForgotPasswordRequest` must be removed. Validation should only check format. The controller ensures a generic success message is always returned regardless of email existence.
*   **Token Revocation on Reset (Resolved):** Currently, password reset does not invalidate hijacked API tokens. **Fix Required:** Add `$user->tokens()->delete();` inside the closure in `PasswordResetService::resetPassword`.
*   **OAuth Pre-Account Takeover (Risk):** Auto-linking accounts solely by email is a security risk if the OAuth provider hasn't strictly verified the email. **Recommendation:** If an account exists, verify the OAuth provider's email verification status (e.g., `$socialUser->user['email_verified']`). If not verifiable, reject the OAuth attempt and prompt the user to log in via credentials to link accounts manually.
*   **Broken Signature due to Query Parsing (Handled):** Reconstructing URL parameters in JS (e.g., using `URLSearchParams`) can alter parameter order, breaking the HMAC signature. This is handled correctly by passing the raw query string from the frontend.
*   **Restricted Auto-Login Post-Registration (Handled):** User is auto-logged in but blocked by the `verified` middleware. The frontend must gracefully handle the `403`/`409` response to show a verification prompt, avoiding UX friction.

## 7. Tests

*   **Registration:** Validate successful registration, check validation errors (weak password, duplicate email), verify email dispatch.
*   **Login:** Verify token generation for API, session initiation for SPA, and correct response for invalid credentials.
*   **Email Verification:** 
    *   Test valid signature verification.
    *   Test expired/tampered signature rejection (422).
    *   Test resending verification to already verified users.
*   **Password Reset:** 
    *   Verify generic response for existing and non-existing emails.
    *   Verify successful password reset.
    *   **Verify that existing Sanctum tokens are deleted after password reset.**
*   **OAuth:** 
    *   Test invalid provider rejection.
    *   Test new user creation via OAuth.
    *   Test existing user linking via OAuth (ensure email verification timestamp is handled correctly).
*   **Middleware:** Verify `verified` middleware blocks unauthenticated/unverified access to `/me`.

## 8. Notes

*   **Architectural Decision - SRP:** Session management (`Auth::login`, `session()->regenerate()`) is intentionally kept outside the `DB::transaction` in the `register` method because session persistence is not a database concern.
*   **Socialite Stateless:** OAuth is handled `stateless()` to prevent session conflicts between the OAuth provider and the application.
*   **Action Items for Developer:** 
    1. Update `ForgotPasswordRequest` to remove the `exists` rule.
    2. Update `PasswordResetService` to delete tokens on reset.
    3. Evaluate the OAuth callback logic for strict email verification before auto-linking.