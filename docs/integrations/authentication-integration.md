# Authentication Module: Integration Contract

## 1. Dual-Auth & Session Lifecycle
*   **Session Hydration:** App mount triggers `GET /api/user/me`. 401 clears auth state; 500/Network errors preserve state to prevent forced logouts during transient outages.
*   **CSRF Enforcement:** Frontend must fetch `/sanctum/csrf-cookie` before any state-mutating POST request (including new-tab OAuth callbacks and email verification).
*   **Deterministic Routing:** Backend dual-auth is resolved via `HandlesAuthResponses`—SPA (Session) vs API (Token) is determined by the absence of a Bearer token and a matching `sanctum.stateful` Origin header.

## 2. Registration & Verification (WAF-Safe)
*   **Pending State:** Backend registers to `PendingRegistration` (201). Frontend persists `pendingEmail` to Zustand/sessionStorage (strictly `partialize`d) with a fallback UI input for state-loss resilience.
*   **WAF Bypass:** Frontend extracts `id, hash, expires, signature` from the email deep-link URL and sends them in the **JSON body** of `POST /verify-email`. Backend reconstructs a synthetic GET request to validate the HMAC signature, circumventing enterprise WAF query-string stripping on POSTs.

## 3. OAuth 2.0 (Zero Client-Side State)
*   **State Management:** Backend caches `state` (10m TTL, requires Redis/Memcached infra). Frontend fetches redirect URL, opens a Popup (falls back to `window.location.href` if blocked).
*   **Zero Storage:** Frontend strictly avoids `sessionStorage` for `state` (Safari ITP safe). Upon callback, Frontend reads `code` and `state` directly from the URL query params and POSTs them to Backend.
*   **Provider Quirks:** Backend `OAuthService` handles provider-specific verification (e.g., GitHub `emails` array vs. Google payload) before linking to existing accounts.

## 4. Error Contract & Invalidation
*   **Validation Mapping:** Frontend intercepts 422 `AxiosError` responses (e.g., duplicate email constraint) and maps `errors.field` directly to React Hook Form's `setError` for immediate UI feedback.
*   **Session Nuke:** Backend password reset regenerates `password_hash` and revokes Sanctum tokens. The `AuthenticateSession` middleware enforces this on the next SPA request, triggering a 401 and Frontend state purge.
*   **Secure Logout:** Frontend surgically removes `currentUser` from React Query cache (`cancelQueries` + `removeQueries`) without clearing public app data.