# Module 2: Email Verification

## 1. Overview
The Email Verification module is responsible for validating user email ownership via cryptographic signed URLs. It operates in a decoupled SPA environment and is specifically engineered to bypass enterprise WAF/Load Balancer query-string stripping by shifting signature validation parameters into the JSON request body. The module strictly adheres to SRP and the Momentum Constitution by centralizing all cryptographic operations in the `EmailVerificationService`, leveraging Laravel's native URL generator for HMAC regeneration, and utilizing a dedicated `VerifyEmailRequest` for strict payload validation. It seamlessly integrates with the `PendingRegistration` model to promote temporary accounts to verified users, utilizing the `HandlesAuthResponses` trait for stateful/stateless session management.

## 2. Business Rules
*   **Mandatory Verification:** Email verification is mandatory for accessing protected routes. Users cannot access core application features until their email is verified.
*   **Signed URL Expiry:** Verification links are cryptographic signed URLs valid for exactly 60 minutes.
*   **WAF-Safe Payload Delivery:** To bypass enterprise WAF/Load Balancer query-string stripping on POST requests, the frontend sends signature parameters (`id`, `hash`, `expires`, `signature`) in the JSON body rather than the query string.
*   **Native Cryptographic Validation:** The backend validates incoming parameters by cryptographically regenerating the expected signature using Laravel's native URL generator (`URL::temporarySignedRoute`), ensuring 100% HMAC accuracy in decoupled environments without relying on fragile synthetic request reconstruction.
*   **Account Promotion & Auto-Auth:** If the verification is successful and the user exists in the `PendingRegistration` table, the account is atomically promoted to the primary `User` table. The controller then leverages the `HandlesAuthResponses` trait to automatically authenticate the user (establishing an SPA session or issuing an API token) and return a standardized user payload.
*   **Resend Policy:** Resend requests return generic success messages to prevent email enumeration and are rate-limited.

## 3. Backend

### Controllers
*   **EmailVerificationController:** Acts as a strict transport layer. Type-hints the `VerifyEmailRequest` for validation. Delegates entirely to `EmailVerificationService::verify()`. If the promoted user is newly created, it delegates authentication to the `HandlesAuthResponses` trait to handle the SPA vs API divergence seamlessly.

### Services
*   **EmailVerificationService:** The single source of truth for verification logic. Centralizes URL generation (`generateVerificationUrl`) and signature validation. The `verify` method orchestrates the flow: validates the HMAC signature, checks for existing users, and falls back to `PendingRegistrationService` for promotions. Throws domain-specific exceptions (`InvalidVerificationSignatureException`) instead of returning boolean flags.
*   **PendingRegistrationService:** Manages the `PendingRegistration` lifecycle. Promotes pending records to `User` models upon successful hash validation by the `EmailVerificationService`.

### Exceptions
*   **InvalidVerificationSignatureException:** A domain exception that implements a self-rendering `render()` method to return a standardized `422` JSON response. This prevents controllers from catching exceptions and keeps them clean.

### Models
*   **User:** Overrides `sendEmailVerificationNotification` to delegate URL generation to the `EmailVerificationService`.
*   **PendingRegistration:** Temporarily stores unverified credentials. Consumed and deleted upon successful promotion.

### Middleware & Requests
*   **VerifyEmailRequest:** A dedicated FormRequest that strictly enforces the validation rules (`id` as integer, `hash`, `expires` as integer, `signature` as string) for the JSON body payload.
*   **ResendVerificationRequest:** Enforces strict validation on the resend flow to prevent abuse.

## 4. API Contract

### Endpoints

*   **`POST /api/auth/verify-email`**
    *   *Body:* `{ id, hash, expires, signature }` *(Moved to JSON body for WAF safety)*
    *   *Response (Pending Promotion):* `200` `{ user }` (If SPA) | `{ user, token }` (If API) - *Handled dynamically by `HandlesAuthResponses`.*
    *   *Response (Existing User):* `200` `{ message: "Email verified successfully..." }`
    *   *Error:* `422` `{ message: "The verification link is invalid or has expired..." }` *(Thrown by `InvalidVerificationSignatureException` or `VerifyEmailRequest`)*
*   **`POST /api/auth/verify-email/resend`**
    *   *Body:* `{ email }`
    *   *Response:* `200` `{ message: "If an account with that email exists and is unverified..." }` (Generic message to prevent enumeration).

## 5. Flow

### Email Verification Flow
1.  Backend generates a temporary signed route via `EmailVerificationService::generateVerificationUrl()`.
2.  User clicks link -> SPA loads `VerifyEmailPage`.
3.  SPA reads parameters (`id`, `hash`, `expires`, `signature`) from the URL.
4.  SPA sends a `POST /verify-email` with these parameters in the **JSON Body** (not query string).
5.  `VerifyEmailRequest` validates the payload structure and types.
6.  Controller delegates to `EmailVerificationService::verify()`.
7.  Service regenerates the expected signature using `URL::temporarySignedRoute` and performs a constant-time `hash_equals` comparison. Throws `InvalidVerificationSignatureException` on failure.
8.  If valid, Service checks for existing `User` or promotes `PendingRegistration` via `PendingRegistrationService`.
9.  Controller receives the `User` model. If it was a promotion (`$user->wasRecentlyCreated`), Controller calls `authenticateAndRespond()` to log the user in and return the proper stateful/stateless payload. Otherwise, returns a simple success message.

## 6. Edge Cases & Security Vulnerabilities (Resolved)

*   **WAF Query String Stripping & Cryptographic Mismatch (Resolved):** Email verification parameters are sent in the JSON body to bypass WAFs. The backend validates the signature by regenerating the expected HMAC using Laravel's native URL generator (`URL::temporarySignedRoute`).
*   **Frontend Infinite Loading State (Resolved):** Implemented explicit success state handling in the frontend verification component. 
*   **Controller Bloat & Missing FormRequests (Resolved):** Replaced inline `$request->validate()` with a dedicated `VerifyEmailRequest` FormRequest. Replaced boolean return types and manual JSON error mapping in the Controller with a self-rendering `InvalidVerificationSignatureException`, strictly adhering to SRP and the Momentum Constitution.
*   **Post-Verification Auth Duplication (Resolved):** Replaced manual `Auth::login()` and `session()->regenerate()` calls in the controller with the centralized `HandlesAuthResponses` trait, ensuring DRY compliance and preventing SPA/API logic divergence.

## 7. Tests

*   **Email Verification:** 
    *   Test JSON body payload validation via `VerifyEmailRequest`.
    *   Test that `InvalidVerificationSignatureException` is thrown and renders as a 422 JSON response.
    *   Test strict type casting rejection (e.g., sending a string for `id`).
    *   Test expired/tampered signature rejection.
    *   Verify promotion of `PendingRegistration` to `User` and subsequent authentication response (Session vs Token).

## 8. Notes

*   **Frontend Constraints (Strict):** 
    1. The frontend **must** send email verification parameters in the JSON body, not the query string.
    2. The frontend **must** handle the explicit success state of the verification mutation to prevent infinite loading UIs.
    3. The frontend **must** be prepared to receive a fully authenticated `{ user }` or `{ user, token }` payload immediately upon successful verification of a pending registration, allowing direct routing to the dashboard without a secondary login step.
*   **Architectural Decision - Centralized URL Generation:** Signed URL generation is strictly isolated in `EmailVerificationService::generateVerificationUrl()`.
*   **Architectural Decision - Native Cryptographic Regeneration:** Replaced synthetic request validation with native signature regeneration in the `EmailVerificationService`.