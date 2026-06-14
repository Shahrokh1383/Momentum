
---

# Frontend Authentication Module Documentation

## 1. Overview
The Frontend Authentication module provides a secure, responsive, and state-aware authentication experience for Single Page Applications (SPAs). Built with React, TypeScript, and Zustand, and powered by React Query for server-state management, the module seamlessly supports dual-authentication patterns (Session-based for SPAs, Token-based for mobile/APIs) via Laravel Sanctum.

It handles credential authentication, OAuth2 flows (via Popup with fallback), email verification (preserving cryptographic signatures), and password recovery, all while maintaining strict client-side validation and robust protection against common web vulnerabilities.

## 2. Business Rules
*   **Session Hydration:** On initial app load or hard refresh, the application must probe the backend (`GET /me`) to determine if an active session exists, regardless of the current route. This prevents flashing the login page to authenticated users.
*   **CSRF Initialization:** Any state-mutating request (`POST`) in a stateful SPA context requires a valid CSRF token. The frontend must fetch `/sanctum/csrf-cookie` before making authentication requests.
*   **Email Verification Enforcement:** Users who register with credentials are automatically logged in but remain unverified. They must be restricted from accessing the main application dashboard until `email_verified_at` is populated.
*   **OAuth Fallback:** If the browser blocks the OAuth popup window, the system must gracefully fall back to a full-page redirect to ensure the user is not trapped on the login screen.
*   **Password Complexity:** Client-side validation must enforce the same complexity rules as the backend: minimum 8 characters, at least one uppercase letter, one lowercase letter, one number, and one symbol.
*   **Anti-Enumeration:** The "Forgot Password" flow always displays a generic success message, preventing attackers from determining if an email exists in the system.

## 3. Frontend Architecture

### State Management
*   **Server State (React Query):** Manages the `currentUser` query and all authentication mutations (login, register, logout, etc.). Handles loading states, caching (`staleTime: 5m`), and error states.
*   **Client State (Zustand - `authStore`):** Synchronized from React Query. Holds the `User` object, derived plan states (`activePlan`, `isExpert`, `isPremium`), and the critical `hasInitiallyLoaded` flag, which ensures the app waits for the initial session probe before rendering route guards.

### Routing & Guards
*   **`ProtectedRoute`:** Wraps authenticated routes. Validates `isAuthenticated` and checks `user.email_verified_at`. Unauthenticated users are redirected to `/login`; unverified users are redirected to `/verify-email`.
*   **Public Routes (`LoginPage`, `RegisterPage`):** If a user is already authenticated and verified, they are automatically redirected to `/dashboard`.

### Core Hooks
*   **`useAuth`:** The central facade for authentication logic. It syncs React Query results into Zustand and exposes mutation functions and their respective loading/error states to the UI components.

### Key Components
*   **`OAuthButtons`:** Manages the Popup flow, listens for `postMessage` events from the popup, and implements the full-page redirect fallback if `window.open` is blocked.
*   **`PasswordStrengthMeter`:** Provides real-time visual feedback on password complexity against backend rules.
*   **`VerifyEmailPage`:** A dual-state component. State 1: Displays a "Check your inbox" UI with a resend button post-registration. State 2: Automatically processes the signed URL parameters when navigated to via email link.

## 4. API Contract

| Method | Endpoint | Frontend Service Method | CSRF Required? | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/sanctum/csrf-cookie` | *Implicit* | No | Initializes the XSRF-TOKEN cookie. |
| `GET` | `/api/user/me` | `authService.getMe` | No | Probes for active session. Returns `null` on 401. |
| `POST` | `/api/auth/login` | `authService.login` | Yes | Authenticates user via credentials. |
| `POST` | `/api/auth/register` | `authService.register` | Yes | Creates new user and auto-logs them in. |
| `POST` | `/api/user/logout` | `authService.logout` | Yes | Invalidates session/tokens. |
| `POST` | `/api/auth/forgot-password` | `authService.forgotPassword` | Yes | Sends reset link. Always returns generic success. |
| `POST` | `/api/auth/reset-password` | `authService.resetPassword` | Yes | Resets password using valid token. |
| `POST` | `/api/auth/verify-email` | `authService.verifyEmail` | **Yes** | Verifies email using raw signed query string. |
| `POST` | `/api/auth/verify-email/resend` | `authService.resendVerification` | Yes | Resends verification email. |
| `POST` | `/api/auth/oauth/{provider}/callback` | `authService.handleOAuthCallback` | **Yes** | Exchanges OAuth code for user session. |

## 5. Flow

### SPA Session Hydration Flow
1.  App mounts. `useAuth` triggers `useQuery(['currentUser'])`.
2.  React Query fetches `GET /api/user/me`.
3.  **If 200:** User data populates Zustand. `hasInitiallyLoaded = true`, `isAuthenticated = true`. Route guards allow access.
4.  **If 401:** Service returns `null`. Zustand clears user. `hasInitiallyLoaded = true`, `isAuthenticated = false`. Route guards redirect to `/login`.

### OAuth Popup Flow (with Fallback)
1.  User clicks "Google" / "GitHub". `isLoading` is set to the provider name.
2.  Frontend fetches `GET /api/auth/oauth/{provider}` to get the redirect URL.
3.  Frontend calls `window.open(url)`.
4.  **If `window.open` returns `null` (Blocked):** Frontend immediately falls back to `window.location.href = url` (Full Page Redirect).
5.  **If Popup Opens:** User authenticates. Provider redirects to frontend `OAuthCallbackPage` with `?code=xxx`.
6.  `OAuthCallbackPage` sends `postMessage('oauth-success')` to `window.opener` and closes itself.
7.  Main window hears event, invalidates `currentUser` query, and navigates to `/dashboard`.

### Email Verification Flow
1.  User clicks link in email (`https://frontend.com/verify-email?expires=...&hash=...&id=...&signature=...`).
2.  `VerifyEmailPage` detects all 4 required URL parameters.
3.  Extracts `window.location.search.slice(1)` as `rawQueryString` to preserve exact byte order for HMAC.
4.  Fetches CSRF cookie (Mandatory).
5.  Fires `POST /api/auth/verify-email?{rawQueryString}`.
6.  On success: Invalidates `currentUser` (to refresh `email_verified_at`) and navigates to `/dashboard`.

### Secure Logout Flow
1.  Logout mutation fires.
2.  On settlement (success or error), frontend clears Zustand store.
3.  Calls `queryClient.cancelQueries()` to abort any in-flight user requests (preventing post-logout data leaks).
4.  Surgically removes sensitive queries from cache via `queryClient.removeQueries()`, preserving public data.
5.  Navigates to `/login`.

## 6. Edge Cases & Vulnerabilities (Resolved)

*   **CSRF Mismatch on New Tabs (Resolved):** Opening the email verification link in a new tab initializes a clean SPA state without an XSRF-TOKEN. **Fix:** Added mandatory `await api.get('/sanctum/csrf-cookie')` inside `authService.verifyEmail` and `authService.handleOAuthCallback` before the POST request.
*   **Popup Blocker Trapping User (Resolved):** If `window.open` fails, the user was permanently stuck on the login screen. **Fix:** Check if `popup` is `null` or `closed` immediately after invocation; if so, fall back to `window.location.href = url`.
*   **Unverified User Accessing Dashboard (Resolved):** `ProtectedRoute` previously only checked `isAuthenticated`, leading to a broken UI when unverified users hit 403s on API calls. **Fix:** Added `if (user && !user.email_verified_at) return <Navigate to="/verify-email" replace />;` inside `ProtectedRoute`.
*   **HMAC Signature Corruption (Handled):** Reconstructing URL parameters via JS objects scrambles key order, invalidating the signature. **Fix:** Passing `rawQueryString` directly from `window.location.search`.
*   **Post-Logout Data Leaks (Resolved):** Using `queryClient.clear()` destroyed public caches, while doing nothing risked in-flight requests resolving after logout. **Fix:** Implemented `queryClient.cancelQueries()` to abort network calls, followed by surgical `removeQueries` for user-specific data.

## 7. Tests

*   **Unit (Zod Schemas):** Validate password complexity rules, email format, and password confirmation matching.
*   **Component (`OAuthButtons`):** Mock `window.open` to return `null` and assert that `window.location.href` is set (fallback). Mock `postMessage` listener to assert `currentUser` invalidation.
*   **Component (`ProtectedRoute`):** Assert redirect to `/login` for unauthenticated users, redirect to `/verify-email` for unverified users, and rendering children for verified users.
*   **Hook (`useAuth`):** Test Zustand sync logic. Verify that a 401 error from `getMe` triggers `clearStore()` and sets `hasInitiallyLoaded` to true.
*   **Integration (`VerifyEmailPage`):** Simulate navigation to `/verify-email?id=1&hash=abc...` and assert that `authService.verifyEmail` is called with `rawQueryString: "id=1&hash=abc..."`.

## 8. Notes

*   **Architecture Decision (Unconditional GET /me):** Firing `getMe` on public pages is strictly intentional. It is the only reliable way to hydrate an existing session on a hard refresh. React Query's `staleTime` ensures this does not result in redundant network requests during standard SPA navigation.
*   **Architecture Decision (Zustand + React Query):** React Query manages the asynchronous server state (loading/error), while Zustand manages synchronous client state derived from it (e.g., `isExpert`, `isPremium`). The `useAuth` hook bridges the two via a `useEffect` sync mechanism.
*   **Action Items for Developer:** 
    1. Update `authService.ts` to include CSRF fetches for `verifyEmail` and `handleOAuthCallback`.
    2. Update `OAuthButtons.tsx` to implement the full-page redirect fallback.
    3. Update `ProtectedRoute.tsx` to enforce `email_verified_at`.
    4. Update `useAuth.ts` logout mutation to use `cancelQueries()` and surgical `removeQueries()` instead of `clear()`.