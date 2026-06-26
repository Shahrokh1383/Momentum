# Module 2: Email Verification

## 1. Overview
The Email Verification module is responsible for validating user email ownership via cryptographic signed URLs. It operates in a decoupled SPA environment and is specifically engineered to bypass enterprise WAF/Load Balancer query-string stripping by shifting signature validation parameters into the JSON request body. The module strictly adheres to SRP by centralizing all cryptographic operations in the `EmailVerificationService`, leveraging Laravel's native URL generator for HMAC regeneration rather than fragile synthetic request reconstruction. It seamlessly integrates with the `PendingRegistration` model to promote temporary accounts to verified users.

## 2. Business Rules
*   **Mandatory Verification:** Email verification is mandatory for accessing protected routes. Users cannot access core application features until their email is verified.
*   **Signed URL Expiry:** Verification links are cryptographic signed URLs valid for exactly 60 minutes.
*   **WAF-Safe Payload Delivery:** To bypass enterprise WAF/Load Balancer query-string stripping on POST requests, the frontend sends signature parameters (`id`, `hash`, `expires`, `signature`) in the JSON body rather than the query string.
*   **Native Cryptographic Validation:** The backend validates incoming parameters by cryptographically regenerating the expected signature using Laravel's native URL generator (`URL::temporarySignedRoute`), ensuring 100% HMAC accuracy in decoupled environments without relying on fragile synthetic request reconstruction.
*   **Account Promotion:** If the verification is successful and the user exists in the `PendingRegistration` table, the account is atomically promoted to the primary `User` table.
*   **Resend Policy:** Resend requests return generic success messages to prevent email enumeration and are rate-limited.

## 3. Backend

### Controllers
*   **EmailVerificationController:** Verifies signed URLs by applying strict type casting to JSON body parameters and delegating cryptographic validation to the service layer, ensuring compatibility with strict WAFs and preventing PHP type-juggling issues. Handles resend requests with generic responses.

### Services
*   **EmailVerificationService:** Centralizes the generation of frontend-compatible temporary signed URLs (`generateVerificationUrl`) to strictly enforce DRY across the `User` model and `PendingRegistrationService`. Validates incoming signed URL parameters by regenerating the expected HMAC signature using `URL::temporarySignedRoute` to bypass framework-level request reconstruction quirks. Delegates notification sending and handles hash validation during verification.

### Models
*   **User:** Overrides `sendEmailVerificationNotification` to delegate URL generation to the `EmailVerificationService`, appending Laravel's signed URL parameters to the SPA frontend deep-link.
*   **PendingRegistration:** Receives the verification email; upon successful verification, its data is consumed and promoted to a `User` record.

### Middleware & Requests
*   `ResendVerificationRequest`: Enforces strict validation on the resend flow to prevent abuse.

## 4. API Contract

### Endpoints

*   **`POST /api/auth/verify-email`**
    *   *Body:* `{ id, hash, expires, signature }` *(Moved to JSON body for WAF safety)*
    *   *Response:* `200` `{ message: "Email verified successfully..." }`
    *   *Error:* `422` / `403` `{ message: "Invalid or expired verification link." }`
*   **`POST /api/auth/verify-email/resend`**
    *   *Body:* `{ email }`
    *   *Response:* `200` `{ message: "If an account with that email exists and is unverified..." }` (Generic message to prevent enumeration).

## 5. Flow

### Email Verification Flow
1.  Backend generates a temporary signed route via `EmailVerificationService::generateVerificationUrl()`.
2.  User clicks link -> SPA loads `VerifyEmailPage`.
3.  SPA reads parameters (`id`, `hash`, `expires`, `signature`) from the URL.
4.  SPA sends a `POST /verify-email` with these parameters in the **JSON Body** (not query string).
5.  Backend applies strict type casting to the JSON payload and delegates validation to `EmailVerificationService`.
6.  Service regenerates the expected signature using `URL::temporarySignedRoute` and performs a constant-time `hash_equals` comparison.
7.  If valid, `EmailVerificationService` marks the email as verified and promotes `PendingRegistration` to `User` if applicable. The frontend captures the successful mutation state and renders a success UI.

## 6. Edge Cases & Security Vulnerabilities (Resolved)

*   **WAF Query String Stripping & Cryptographic Mismatch (Resolved):** Email verification parameters are sent in the JSON body to bypass WAFs. The backend validates the signature by regenerating the expected HMAC using Laravel's native URL generator (`URL::temporarySignedRoute`). This eliminates microscopic query-string formatting and routing prefix mismatches inherent in synthetic request reconstruction (`Request::create`), permanently resolving 422 errors in decoupled SPAs.
*   **Frontend Infinite Loading State (Resolved):** Implemented explicit success state handling in the frontend verification component (`VerifyEmailPage.tsx`). The UI now properly `await`s the verification mutation and transitions to a success state, preventing infinite loading spinners and providing a seamless UX transition to the dashboard.

## 7. Tests

*   **Email Verification:** 
    *   Test JSON body payload validation via native signature regeneration.
    *   Test strict type casting in the controller.
    *   Test expired/tampered signature rejection.
    *   Verify promotion of `PendingRegistration` to `User`.

## 8. Notes

*   **Frontend Constraints (Strict):** 
    1. The frontend **must** send email verification parameters in the JSON body, not the query string.
    2. The frontend **must** handle the explicit success state of the verification mutation to prevent infinite loading UIs and allow proper dashboard redirection.
*   **Architectural Decision - Centralized URL Generation:** Signed URL generation is strictly isolated in `EmailVerificationService::generateVerificationUrl()`. This prevents logic duplication between the `User` model and `PendingRegistrationService`, ensuring any future changes to URL formatting or expiration times only need to be made in one place.
*   **Architectural Decision - Native Cryptographic Regeneration:** Replaced synthetic request validation (`Request::create`) with native signature regeneration (`URL::temporarySignedRoute`) in the `EmailVerificationService`. This ensures 100% HMAC accuracy by letting Laravel's own engine compute the expected hash, strictly adhering to SRP by keeping cryptographic logic out of the Controller and guaranteeing compatibility with strict enterprise network infrastructure (WAFs/ALBs).

---