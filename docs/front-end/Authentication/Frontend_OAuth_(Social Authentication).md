# Module 4: Frontend OAuth (Social Authentication)

## 1. Overview
The Frontend OAuth module facilitates secure third-party authentication via Google and GitHub using a popup-based flow with full-page redirect fallback. It implements a strict zero client-side state approach for OAuth state management, reading the `state` parameter directly from the callback URL query parameters to prevent Safari ITP and cross-origin storage bugs. The module handles popup blocker scenarios gracefully, implements cross-window communication via `postMessage`, and ensures proper session hydration after successful OAuth authentication.

## 2. Business Rules
*   **OAuth Fallback & URL-Based State:** If the browser blocks the OAuth popup window, the system must gracefully fall back to a full-page redirect. **Critical:** The system must **never** use `sessionStorage` to pass the OAuth `state` parameter. Instead, the `state` must be read directly from the callback URL query parameters to prevent Safari ITP and cross-origin storage bugs.
*   **CSRF Initialization:** OAuth callback requests require a valid CSRF token. The frontend must fetch `/sanctum/csrf-cookie` before making the OAuth callback POST request.
*   **Popup Blocker Handling:** If `window.open` returns `null` (indicating a popup blocker), the system must immediately fall back to a full-page redirect to ensure the user can still complete the OAuth flow.
*   **Cross-Window Communication:** After successful OAuth authentication in a popup, the popup window must communicate success to the main window via `postMessage` and then close itself. The main window then hydrates the session and navigates to the dashboard.
*   **Zero Client-Side State:** The frontend maintains **zero client-side state** for OAuth. The OAuth `state` parameter is never stored in `sessionStorage` or any other client-side storage mechanism. It is read directly from the callback URL query parameters.

## 3. Frontend Architecture

### Key Components
*   **`OAuthButtons`:** Manages the Popup flow, listens for `postMessage` events from the popup, and implements the full-page redirect fallback if `window.open` is blocked. **Does not store state in sessionStorage.**
*   **`OAuthCallbackPage`:** Handles the OAuth callback after the provider redirects back to the frontend. Extracts the `code` and `state` from the URL query parameters, sends the callback request to the backend, and communicates success to the main window via `postMessage` before closing itself.

## 4. API Contract

| Method | Endpoint | Frontend Service Method | CSRF Required? | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/auth/oauth/{provider}` | `authService.getOAuthRedirect` | No | Returns `{ url, state }`. |
| `POST` | `/api/auth/oauth/{provider}/callback` | `authService.handleOAuthCallback` | **Yes** | Exchanges OAuth code and state (read from URL) for user session. |

## 5. Flow

### OAuth Popup Flow (with Fallback & URL-Based State)
1.  User clicks "Google" / "GitHub". `isLoading` is set to the provider name.
2.  Frontend fetches `GET /api/auth/oauth/{provider}` to get the redirect URL and `state`.
3.  **Critical:** Frontend does **not** store `state` in `sessionStorage`. The OAuth provider will automatically return the `state` in the callback URL.
4.  Frontend calls `window.open(url)`.
5.  **If `window.open` returns `null` (Blocked):** Frontend immediately falls back to `window.location.href = url` (Full Page Redirect).
6.  **If Popup Opens:** User authenticates. Provider redirects to frontend `OAuthCallbackPage` with `?code=xxx&state=yyy`.
7.  `OAuthCallbackPage` extracts **both** `provider` from URL params and `code` + `state` from URL query parameters, then sends `POST /oauth/{provider}/callback` with `{ code, state }`.
8.  On success, `OAuthCallbackPage` sends `postMessage('oauth-success')` to `window.opener` and closes itself.
9.  Main window hears event, invalidates `currentUser` query, and navigates to `/dashboard`.

## 6. Edge Cases & Vulnerabilities (Resolved)

*   **Popup Blocker Trapping User (Resolved):** If `window.open` fails, the user was permanently stuck on the login screen. **Fix:** Check if `popup` is `null` or `closed` immediately after invocation; if so, fall back to `window.location.href = url`.
*   **Safari ITP & Cross-Origin Storage Bugs (Resolved):** Using `sessionStorage` to pass OAuth state between popup and main window caused failures in Safari due to Intelligent Tracking Prevention. **Fix:** Removed all `sessionStorage` logic for OAuth. The OAuth `state` is now read directly from the callback URL query parameters.
*   **CSRF Mismatch on New Tabs (Resolved):** Opening the OAuth callback in a new tab initializes a clean SPA state without an XSRF-TOKEN. **Fix:** Added mandatory `await api.get('/sanctum/csrf-cookie')` inside `authService.handleOAuthCallback` before the POST request.

## 7. Tests

*   **Component (`OAuthButtons`):** Mock `window.open` to return `null` and assert that `window.location.href` is set (fallback). Mock `postMessage` listener to assert `currentUser` invalidation. **Verify that no `sessionStorage.setItem` calls are made for OAuth state.**
*   **Integration (`OAuthCallbackPage`):** Simulate navigation to `/oauth/google/callback?code=abc&state=xyz` and assert that `authService.handleOAuthCallback` is called with `{ provider: 'google', code: 'abc', state: 'xyz' }` (state read from URL, not sessionStorage).

## 8. Notes

*   **Architecture Decision (OAuth State Management - Zero Client-Side State):** Because the backend uses a Cache-based state mechanism for CSRF protection and the OAuth provider automatically returns the `state` in the callback URL, the frontend maintains **zero client-side state** for OAuth. This eliminates Safari ITP bugs, cross-origin storage restrictions, and simplifies the codebase.
*   **Architecture Decision (Popup with Full-Page Redirect Fallback):** The popup-based OAuth flow provides a better UX by keeping the user on the login page. However, popup blockers can prevent this flow from working. The full-page redirect fallback ensures that users can still complete the OAuth flow even if popups are blocked.
*   **Infrastructure Constraint (Cache):** The OAuth flow strictly requires a centralized Cache driver (`redis` or `memcached`) on the backend. Using `file` or `array` in a load-balanced environment will cause random 401 CSRF errors. The frontend handles these gracefully by clearing the session on 401 responses.
*   **Architecture Decision (Cross-Window Communication via postMessage):** Using `postMessage` for cross-window communication is more reliable than relying on shared storage mechanisms like `sessionStorage` or `localStorage`, which can be affected by browser privacy features like Safari ITP. This ensures that the main window is notified of successful OAuth authentication even in privacy-focused browsers.