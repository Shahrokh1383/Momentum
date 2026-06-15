# Frontend Authentication Module Documentation

## 1. Overview
The Frontend Authentication module provides a secure, responsive, and state-aware authentication experience for Single Page Applications (SPAs). Built with React, TypeScript, and Zustand, and powered by React Query for server-state management, the module seamlessly supports dual-authentication patterns (Session-based for SPAs, Token-based for mobile/APIs) via Laravel Sanctum.

It handles credential authentication, OAuth2 flows (via Popup with fallback), email verification (preserving cryptographic signatures), and password recovery, all while maintaining strict client-side validation, robust protection against common web vulnerabilities, and intelligent state persistence for pre-verification flows.

## 2. Business Rules
*   **Session Hydration:** On initial app load or hard refresh, the application must probe the backend (`GET /me`) to determine if an active session exists, regardless of the current route. This prevents flashing the login page to authenticated users.
*   **CSRF Initialization:** Any state-mutating request (`POST`) in a stateful SPA context requires a valid CSRF token. The frontend must fetch `/sanctum/csrf-cookie` before making authentication requests, including email verification and OAuth callbacks.
*   **Email Verification Enforcement:** Users who register with credentials are placed in a pending state. They must be restricted from accessing the main application dashboard until `email_verified_at` is populated.
*   **State Persistence for Pre-Verification Flows:** During the registration flow, the user's `pendingEmail` must be persisted across page refreshes or direct navigations to the `/verify-email` route. This is achieved using Zustand's `persist` middleware with `sessionStorage` and strict `partialize` configuration to ensure only the email is cached, preventing stale authentication states.
*   **OAuth Fallback & URL-Based State:** If the browser blocks the OAuth popup window, the system must gracefully fall back to a full-page redirect. **Critical:** The system must **never** use `sessionStorage` to pass the OAuth `state` parameter. Instead, the `state` must be read directly from the callback URL query parameters to prevent Safari ITP and cross-origin storage bugs.
*   **WAF-Safe Email Verification:** Email verification parameters (`id`, `hash`, `expires`, `signature`) must be sent in the **JSON body** of the POST request, not as query string parameters. This bypasses enterprise WAFs and Load Balancers that strip query strings from POST requests.
*   **Password Complexity:** Client-side validation must enforce the same complexity rules as the backend: minimum 8 characters, at least one uppercase letter, one lowercase letter, one number, and one symbol.
*   **Anti-Enumeration:** The "Forgot Password" flow always displays a generic success message, preventing attackers from determining if an email exists in the system.
*   **Network Error Resilience:** Temporary backend outages (500 errors or network timeouts) during session hydration must not forcefully log the user out. Only explicit 401 Unauthenticated responses should clear the session.

## 3. Frontend Architecture

### State Management
*   **Server State (React Query):** Manages the `currentUser` query and all authentication mutations (login, register, logout, etc.). Handles loading states, caching (`staleTime: 5m`), and error states.
*   **Client State (Zustand - `authStore`):** Synchronized from React Query. Holds the `User` object, derived plan states (`activePlan`, `isExpert`, `isPremium`), and the `hasInitiallyLoaded` flag. Crucially, it utilizes Zustand's `persist` middleware with `sessionStorage` and the `partialize` option to strictly persist *only* the `pendingEmail` during the pre-verification phase. This prevents state-loss errors on page refreshes while keeping the core `User` object strictly server-sourced to avoid stale auth states.

### Routing & Guards
*   **`ProtectedRoute`:** Wraps authenticated routes. Validates `isAuthenticated` and strictly checks `user.email_verified_at`. Unauthenticated users are redirected to `/login`; unverified users are redirected to `/verify-email`.
*   **Public Routes (`LoginPage`, `RegisterPage`):** If a user is already authenticated and verified, they are automatically redirected to `/dashboard`.

### Core Hooks
*   **`useAuth`:** The central facade for authentication logic. It syncs React Query results into Zustand and exposes mutation functions and their respective loading/error states to the UI components. Implements surgical cache invalidation on logout to prevent data leaks.

### Key Components
*   **`OAuthButtons`:** Manages the Popup flow, listens for `postMessage` events from the popup, and implements the full-page redirect fallback if `window.open` is blocked. **Does not store state in sessionStorage.**
*   **`PasswordStrengthMeter`:** Provides real-time visual feedback on password complexity against backend rules.
*   **`VerifyEmailPage`:** A dual-state component. State 1: Displays a "Check your inbox" UI with a resend button post-registration (relying on the persisted `pendingEmail`). State 2: Automatically extracts signed URL parameters and sends them as a **JSON body** when navigated to via email link.

## 4. API Contract

| Method | Endpoint | Frontend Service Method | CSRF Required? | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/sanctum/csrf-cookie` | *Implicit* | No | Initializes the XSRF-TOKEN cookie. |
| `GET` | `/api/user/me` | `authService.getMe` | No | Probes for active session. Returns `null` on 401. |
| `POST` | `/api/auth/login` | `authService.login` | Yes | Authenticates user via credentials. |
| `POST` | `/api/auth/register` | `authService.register` | Yes | Creates pending registration and returns email. |
| `POST` | `/api/user/logout` | `authService.logout` | Yes | Invalidates session/tokens. |
| `POST` | `/api/auth/forgot-password` | `authService.forgotPassword` | Yes | Sends reset link. Always returns generic success. |
| `POST` | `/api/auth/reset-password` | `authService.resetPassword` | Yes | Resets password using valid token. |
| `POST` | `/api/auth/verify-email` | `authService.verifyEmail` | **Yes** | Verifies email using JSON body parameters (WAF-safe). |
| `POST` | `/api/auth/verify-email/resend` | `authService.resendVerification` | Yes | Resends verification email. |
| `GET` | `/api/auth/oauth/{provider}` | `authService.getOAuthRedirect` | No | Returns `{ url, state }`. |
| `POST` | `/api/auth/oauth/{provider}/callback` | `authService.handleOAuthCallback` | **Yes** | Exchanges OAuth code and state (read from URL) for user session. |

## 5. Flow

### SPA Session Hydration Flow
1.  App mounts. `useAuth` triggers `useQuery(['currentUser'])`.
2.  React Query fetches `GET /api/user/me`.
3.  **If 200:** User data populates Zustand. `hasInitiallyLoaded = true`, `isAuthenticated = true`. Route guards allow access.
4.  **If 401:** Service returns `null`. Zustand clears user. `hasInitiallyLoaded = true`, `isAuthenticated = false`. Route guards redirect to `/login`.
5.  **If 500/Network Error:** Service throws error. Zustand state remains unchanged to prevent forced logout during temporary outages.

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

### Email Verification Flow (WAF-Safe)
1.  User clicks link in email (`https://frontend.com/verify-email?expires=...&hash=...&id=...&signature=...`).
2.  `VerifyEmailPage` detects all 4 required URL parameters via `useSearchParams`.
3.  Extracts `id`, `hash`, `expires`, and `signature` individually from the URL.
4.  Fetches CSRF cookie (Mandatory for new tabs).
5.  Fires `POST /api/auth/verify-email` with `{ id, hash, expires, signature }` in the **JSON Body**.
6.  Backend reconstructs a synthetic GET request to validate the HMAC signature, bypassing WAF query-string stripping.
7.  On success: Invalidates `currentUser` (to refresh `email_verified_at`) and navigates to `/dashboard`.

### Secure Logout Flow
1.  Logout mutation fires.
2.  On settlement (success or error), frontend clears Zustand store.
3.  Calls `queryClient.cancelQueries()` to abort any in-flight user requests (preventing post-logout data leaks).
4.  Surgically removes sensitive queries from cache via `queryClient.removeQueries({ queryKey: ['currentUser'] })`, preserving public data.
5.  Navigates to `/login`.

## 6. Edge Cases & Vulnerabilities (Resolved)

*   **State Loss on Page Refresh during Registration (Resolved):** When a user registers and lands on `/verify-email`, refreshing the page wiped the in-memory Zustand state, causing the "Resend" button to fail with "Unable to determine your email address." **Fix:** Implemented Zustand's `persist` middleware using `sessionStorage` and the `partialize` option to selectively persist only `pendingEmail`, ensuring the email context survives tab refreshes without caching the actual `User` object.
*   **CSRF Mismatch on New Tabs (Resolved):** Opening the email verification link or OAuth callback in a new tab initializes a clean SPA state without an XSRF-TOKEN. **Fix:** Added mandatory `await api.get('/sanctum/csrf-cookie')` inside `authService.verifyEmail` and `authService.handleOAuthCallback` before the POST request.
*   **Popup Blocker Trapping User (Resolved):** If `window.open` fails, the user was permanently stuck on the login screen. **Fix:** Check if `popup` is `null` or `closed` immediately after invocation; if so, fall back to `window.location.href = url`.
*   **Unverified User Accessing Dashboard (Resolved):** `ProtectedRoute` previously only checked `isAuthenticated`, leading to a broken UI when unverified users hit 403s on API calls. **Fix:** Added `if (user && !user.email_verified_at) return <Navigate to="/verify-email" replace />;` inside `ProtectedRoute`.
*   **Safari ITP & Cross-Origin Storage Bugs (Resolved):** Using `sessionStorage` to pass OAuth state between popup and main window caused failures in Safari due to Intelligent Tracking Prevention. **Fix:** Removed all `sessionStorage` logic for OAuth. The OAuth `state` is now read directly from the callback URL query parameters.
*   **Enterprise WAF Query String Stripping (Resolved):** Some enterprise WAFs and Load Balancers strip query strings from POST requests, breaking email verification. **Fix:** Changed `verifyEmail` to send parameters in the **JSON body**. The backend reconstructs a synthetic GET request to validate the signature.
*   **Post-Logout Data Leaks (Resolved):** Using `queryClient.clear()` destroyed public caches, while doing nothing risked in-flight requests resolving after logout. **Fix:** Implemented `queryClient.cancelQueries()` to abort network calls, followed by surgical `removeQueries` for user-specific data.
*   **Network Error Forced Logout (Resolved):** Temporary backend outages during session hydration caused `isError` to trigger, forcefully clearing the store. **Fix:** Modified `useAuth` sync logic to only clear the store when `fetchedUser === null` (explicit 401), ignoring transient network errors.

## 7. Tests

*   **Unit (Zod Schemas):** Validate password complexity rules, email format, and password confirmation matching.
*   **Unit (Zustand Store):** Verify that the `persist` middleware correctly saves `pendingEmail` to `sessionStorage` upon registration and that `partialize` prevents the `user` object from being cached locally.
*   **Component (`OAuthButtons`):** Mock `window.open` to return `null` and assert that `window.location.href` is set (fallback). Mock `postMessage` listener to assert `currentUser` invalidation. **Verify that no `sessionStorage.setItem` calls are made for OAuth state.**
*   **Component (`ProtectedRoute`):** Assert redirect to `/login` for unauthenticated users, redirect to `/verify-email` for unverified users, and rendering children for verified users.
*   **Hook (`useAuth`):** Test Zustand sync logic. Verify that a 401 error from `getMe` triggers `clearStore()` and sets `hasInitiallyLoaded` to true. Verify that a 500 error does NOT clear the store. Verify logout calls `cancelQueries` and `removeQueries`.
*   **Integration (`VerifyEmailPage`):** Simulate a hard refresh on `/verify-email` immediately after registration and assert that the "Resend" button successfully uses the persisted `pendingEmail` from `sessionStorage`. Simulate navigation via email link and assert `authService.verifyEmail` is called with the structured JSON body.
*   **Integration (`OAuthCallbackPage`):** Simulate navigation to `/oauth/google/callback?code=abc&state=xyz` and assert that `authService.handleOAuthCallback` is called with `{ provider: 'google', code: 'abc', state: 'xyz' }` (state read from URL, not sessionStorage).

## 8. Notes

*   **Architecture Decision (Unconditional GET /me):** Firing `getMe` on public pages is strictly intentional. It is the only reliable way to hydrate an existing session on a hard refresh. React Query's `staleTime` ensures this does not result in redundant network requests during standard SPA navigation.
*   **Architecture Decision (Zustand + React Query):** React Query manages the asynchronous server state (loading/error), while Zustand manages synchronous client state derived from it (e.g., `isExpert`, `isPremium`). The `useAuth` hook bridges the two via a `useEffect` sync mechanism.
*   **Architecture Decision (Selective State Persistence):** By using Zustand's `partialize` feature, we achieve the perfect balance between UX and Security. We persist `pendingEmail` to survive page refreshes during the vulnerable pre-verification window, but we strictly forbid persisting the `User` object to ensure the application always defers to the backend for the absolute source of truth regarding authentication status.
*   **OAuth State Management (Zero Client-Side State):** Because the backend uses a Cache-based state mechanism for CSRF protection and the OAuth provider automatically returns the `state` in the callback URL, the frontend maintains **zero client-side state** for OAuth. This eliminates Safari ITP bugs, cross-origin storage restrictions, and simplifies the codebase.
*   **Infrastructure Constraint (Cache):** The OAuth flow strictly requires a centralized Cache driver (`redis` or `memcached`) on the backend. Using `file` or `array` in a load-balanced environment will cause random 401 CSRF errors. The frontend handles these gracefully by clearing the session on 401 responses.