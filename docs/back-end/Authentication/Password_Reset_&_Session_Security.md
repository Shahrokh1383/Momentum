# Module 3: Password Reset & Session Security

## 1. Overview
The Password Reset & Session Security module provides a secure, anti-enumeration password recovery flow while guaranteeing absolute session hygiene across all devices. It integrates deeply with Laravel's `Password` broker and extends its functionality to automatically revoke all existing Sanctum API tokens and regenerate the `remember_token`. Crucially, it pairs with the `AuthenticateSession` middleware to actively kill hijacked SPA sessions by detecting `password_hash` mismatches on subsequent requests, ensuring that a compromised password cannot maintain persistent access after a reset.

## 2. Business Rules
*   **Anti-Enumeration:** Password reset requests always return a generic success message regardless of whether the email exists in the system. This prevents attackers from using the endpoint to enumerate valid user accounts.
*   **Token Validation:** Valid reset tokens allow the user to update their password. Tokens are single-use and time-limited.
*   **Global Token Revocation:** Upon a successful password reset, all existing Sanctum API tokens for the user are automatically revoked. This locks out any mobile clients or external integrations until they re-authenticate with the new credentials.
*   **Remember Token Regeneration:** The user's `remember_token` is regenerated to invalidate long-lived session cookies.
*   **Forced Session Invalidation:** The `password_hash` is updated in the database. The `AuthenticateSession` middleware checks this hash on every subsequent SPA request, forcing a logout for any active SPA sessions (including hijacked ones) that were established with the old password.

## 3. Backend

### Controllers
*   **PasswordResetController:** Manages the forgot/reset password flow, delegating token generation and password updates to the service layer.

### Services
*   **PasswordResetService:** Interfaces with Laravel's `Password` broker to generate tokens and reset passwords. Automatically revokes all Sanctum tokens and regenerates the `remember_token` upon password reset.

### Middleware & Requests
*   **Form Requests:** 
    *   `ForgotPasswordRequest`: Enforces strict email validation while preventing enumeration via response handling.
*   `\Illuminate\Session\Middleware\AuthenticateSession::class`: **Crucial for SPA security.** Validates the `password_hash` on every request, effectively killing hijacked sessions when a password is reset.

## 4. API Contract

### Endpoints

*   **`POST /api/auth/forgot-password`**
    *   *Body:* `{ email }`
    *   *Response:* `200` `{ message: "If an account with that email exists..." }` (Generic message to prevent enumeration).
*   **`POST /api/auth/reset-password`**
    *   *Body:* `{ token, email, password, password_confirmation }`
    *   *Response:* `200` `{ message: "Password reset successfully..." }` *(Side-effect: Revokes all API tokens, triggers AuthenticateSession logout on next SPA request)*

## 5. Flow

### Password Reset Flow
1.  User requests `POST /forgot-password`.
2.  `PasswordResetService` generates a token and sends an email containing the reset link.
3.  User sets a new password via `POST /reset-password`.
4.  Service updates the password in the database (changing `password_hash`), deletes all `$user->tokens()`, and regenerates `remember_token`.
5.  On the next SPA request, the `AuthenticateSession` middleware detects the `password_hash` mismatch and forcefully logs the user out, invalidating the session.

## 6. Edge Cases & Security Vulnerabilities (Resolved)

*   **True Session Invalidation (Resolved):** Added `\Illuminate\Session\Middleware\AuthenticateSession::class` to protected routes. This ensures that changing the `password_hash` during a reset actively kills hijacked SPA sessions on the very next request.
*   **Email Enumeration (Resolved):** Generic responses on forgot-password endpoint. The API never confirms whether an email is registered, forcing attackers to use brute-force methods rather than targeted enumeration.

## 7. Tests

*   **Password Reset:** 
    *   Verify that existing Sanctum tokens are deleted upon reset.
    *   Verify that `AuthenticateSession` middleware blocks access after a password reset.
    *   Verify the generic response message is returned regardless of email existence.

## 8. Notes

*   **Architectural Decision - Session Hygiene:** The combination of `PasswordResetService` (revoking tokens) and `AuthenticateSession` (checking `password_hash`) creates a defense-in-depth model. Even if an attacker has hijacked a SPA session, the password reset operation guarantees their access is severed within one request cycle.

---