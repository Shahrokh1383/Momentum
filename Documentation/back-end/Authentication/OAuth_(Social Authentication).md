# Module 4: OAuth (Social Authentication)

## 1. Overview
The OAuth module facilitates secure third-party authentication via Google and GitHub using Laravel Socialite. It implements a strict Cache-based state management system to prevent CSRF attacks in decoupled environments and handles the complex, provider-specific quirks of email verification payloads (particularly GitHub's `emails` array). The module supports both linking OAuth providers to existing verified accounts and creating new accounts via social login, with safeguards to prevent account lockouts when unlinking providers.

## 2. Business Rules
*   **Provider Matching:** Users are matched by email address. If an account with the OAuth email already exists, the provider is linked to that account.
*   **Strict Email Verification:** An OAuth provider is linked to an existing account **only if** the provider has explicitly verified the email. This requires handling provider-specific payloads (e.g., parsing GitHub's `emails` array vs Google's base payload).
*   **New Account Creation:** If no user exists with the OAuth email, a new account is created and automatically marked as verified (`email_verified_at = now()`), bypassing the `PendingRegistration` flow since the email is verified by the provider.
*   **Provider Unlinking:** Users can unlink OAuth providers, provided they have a password set as a fallback. This prevents accidental account lockouts.
*   **CSRF Prevention (State Validation):** OAuth state validation is enforced strictly via a Cache-based mechanism (10-minute TTL). The state is never stored in the session or `sessionStorage`, avoiding Safari ITP bugs and ensuring compatibility in load-balanced environments.

## 3. Backend

### Controllers
*   **OAuthController:** Generates OAuth redirect URLs, handles provider callbacks, and manages provider unlinking. Delegates provider-specific email verification logic to the `OAuthService`.

### Services
*   **OAuthService:** Interfaces with Laravel Socialite. Generates and stores a cryptographically secure `state` parameter in the Cache (10 min TTL). Contains the `isEmailVerified()` method to abstract provider-specific payload quirks (e.g., parsing GitHub's `emails` array).

### Middleware & Requests
*   **Form Requests:** 
    *   `OAuthCallbackRequest`: Enforces strict validation on the callback flow, ensuring `code` and `state` are present and correctly typed.

## 4. API Contract

### Endpoints

*   **`GET /api/auth/oauth/{provider}`**
    *   *Response:* `200` `{ url, state }`
*   **`POST /api/auth/oauth/{provider}/callback`**
    *   *Body:* `{ code, state }` *(State must be read from URL query params by frontend, not sessionStorage)*
    *   *Response:* `200` `{ user, message }` (If API, includes `token`)
    *   *Error:* `401` / `422` for invalid state or unverified email.
*   **`DELETE /api/auth/oauth/{provider}`** *(Auth Required)*
    *   *Response:* `200` `{ message }` (Unlinks provider).
    *   *Error:* `422` if user has no password set (preventing lockouts).

## 5. Flow

### OAuth Flow (Cache-based State)
1.  Frontend requests `GET /oauth/{provider}`.
2.  `OAuthService` generates `state`, stores it in Cache (10 min TTL), and returns URL + `state`.
3.  Frontend redirects user to the provider. Provider redirects back to the frontend with `?code=xxx&state=yyy`.
4.  **Crucial:** Frontend extracts `state` directly from the URL query parameters (avoiding Safari ITP / `sessionStorage` bugs) and sends `POST /callback` with `{ code, state }` in the JSON body.
5.  `OAuthService` validates state via `Cache::pull()` (atomic read-and-delete) and calls `stateless()->user()` on Socialite.
6.  If existing user found, `OAuthService->isEmailVerified()` strictly checks provider payload (handling GitHub's `emails` array). If verified, links in transaction.
7.  If no user, creates new user with `email_verified_at = now()`.

## 6. Edge Cases & Security Vulnerabilities (Resolved)

*   **GitHub `email_verified` Quirk (Resolved):** Extracted provider-specific logic into `OAuthService::isEmailVerified()`. It correctly parses GitHub's `emails` array for the primary verified email, preventing false 403 rejections that occurred when assuming the base payload format.
*   **OAuth Provider Unlinking (Resolved):** Added `DELETE /api/auth/oauth/{provider}`. Includes a strict safeguard preventing unlinking if the user has no password set (preventing account lockouts).
*   **OAuth CSRF via `stateless()` (Resolved):** Cache-based state management with 10-min TTL. Using `Cache::pull()` ensures the state is single-use and immune to replay attacks.
*   **Safari ITP / `sessionStorage` Bugs (Resolved):** Frontend is strictly instructed to read the state from the URL query parameters rather than `sessionStorage`, which is often cleared or isolated by Safari's Intelligent Tracking Prevention.

## 7. Tests

*   **OAuth:** 
    *   Test GitHub email verification logic (mocking the `emails` array).
    *   Test `unlink()` success and `unlink()` block when no password is set.
    *   Test invalid `state` parameter rejection.
    *   Verify new user creation automatically sets `email_verified_at`.

## 8. Notes

*   **Frontend Constraints (Strict):** The frontend **must not** use `sessionStorage` for OAuth state. It must read it from the callback URL query parameters to avoid Safari ITP issues.
*   **Infrastructure Constraint (Cache):** The OAuth flow strictly requires a centralized Cache driver (`redis` or `memcached`). Using `file` or `array` in a load-balanced environment will cause random 401 CSRF errors because the state will not be available across all application instances.
*   **Architectural Decision - SRP:** Provider-specific payload quirks (GitHub vs Google) are isolated in the `OAuthService`, keeping the Controller clean and focused on HTTP orchestration.