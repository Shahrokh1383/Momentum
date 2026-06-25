# Module 1: Frontend Credential Authentication & Session Management

## 1. Overview
The Frontend Credential Authentication & Session Management module provides the foundation for secure, state-aware authentication in Single Page Applications (SPAs). Built with React, TypeScript, Zustand, and React Query, this module handles traditional email/password authentication while implementing robust session hydration, CSRF token management, and intelligent state persistence. It serves as the central orchestrator for authentication flows, synchronizing server state (via React Query) with client state (via Zustand) through the `useAuth` facade hook. The module enforces strict route guards, handles network resilience to prevent forced logouts during temporary outages, and implements surgical cache invalidation on logout to prevent data leaks.

## 2. Business Rules
*   **Session Hydration:** On initial app load or hard refresh, the application must probe the backend (`GET /me`) to determine if an active session exists, regardless of the current route. This prevents flashing the login page to authenticated users.
*   **CSRF Initialization:** Any state-mutating request (`POST`) in a stateful SPA context requires a valid CSRF token. The frontend must fetch `/sanctum/csrf-cookie` before making authentication requests.
*   **Duplicate Email Handling:** Client-side registration must gracefully intercept backend 422 validation errors (e.g., duplicate email) and map them directly to the corresponding React Hook Form fields, providing immediate and contextual user feedback.
*   **Network Error Resilience:** Temporary backend outages (500 errors or network timeouts) during session hydration must not forcefully log the user out. Only explicit 401 Unauthenticated responses should clear the session.
*   **Secure Logout:** The logout flow must cancel all in-flight queries, surgically remove sensitive user-specific queries from the cache, and clear the Zustand store to prevent post-logout data leaks.
*   **Password Complexity:** Client-side validation must enforce the same complexity rules as the backend: minimum 8 characters, at least one uppercase letter, one lowercase letter, one number, and one symbol.

## 3. Frontend Architecture

### State Management
*   **Server State (React Query):** Manages the `currentUser` query and all authentication mutations (login, register, logout, etc.). Handles loading states, caching (`staleTime: 5m`), and error states.
*   **Client State (Zustand - `authStore`):** Synchronized from React Query. Holds the `User` object, derived plan states (`activePlan`, `isExpert`, `isPremium`), and the `hasInitiallyLoaded` flag.

### Routing & Guards
*   **`ProtectedRoute`:** Wraps authenticated routes. Validates `isAuthenticated` and strictly checks `user.email_verified_at`. Unauthenticated users are redirected to `/login`; unverified users are redirected to `/verify-email`.
*   **Public Routes (`LoginPage`, `RegisterPage`):** If a user is already authenticated and verified, they are automatically redirected to `/dashboard`.

### Core Hooks
*   **`useAuth`:** The central facade for authentication logic. It syncs React Query results into Zustand and exposes mutation functions and their respective loading/error states to the UI components. Implements surgical cache invalidation on logout to prevent data leaks.

### Key Components
*   **`PasswordStrengthMeter`:** Provides real-time visual feedback on password complexity against backend rules.
*   **`RegisterPage`:** Utilizes React Hook Form with Zod resolver. Implements a `try/catch` block on submission to intercept `AxiosError` 422 responses and map backend field validation errors (like duplicate emails) to the form using `setError`.

## 4. API Contract

| Method | Endpoint | Frontend Service Method | CSRF Required? | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/sanctum/csrf-cookie` | *Implicit* | No | Initializes the XSRF-TOKEN cookie. |
| `GET` | `/api/user/me` | `authService.getMe` | No | Probes for active session. Returns `null` on 401. |
| `POST` | `/api/auth/login` | `authService.login` | Yes | Authenticates user via credentials. |
| `POST` | `/api/auth/register` | `authService.register` | Yes | Creates pending registration. Returns 422 if email is duplicate. |
| `POST` | `/api/user/logout` | `authService.logout` | Yes | Invalidates session/tokens. |

## 5. Flow

### SPA Session Hydration Flow
1.  App mounts. `useAuth` triggers `useQuery(['currentUser'])`.
2.  React Query fetches `GET /api/user/me`.
3.  **If 200:** User data populates Zustand. `hasInitiallyLoaded = true`, `isAuthenticated = true`. Route guards allow access.
4.  **If 401:** Service returns `null`. Zustand clears user. `hasInitiallyLoaded = true`, `isAuthenticated = false`. Route guards redirect to `/login`.
5.  **If 500/Network Error:** Service throws error. Zustand state remains unchanged to prevent forced logout during temporary outages.

### Registration & Duplicate Email Flow
1.  User fills out `RegisterPage` and submits.
2.  `registerUser` mutation fires `authService.register`.
3.  **If Success (201):** Frontend navigates to `/verify-email` (handled by Email Verification module).
4.  **If Error (422 - Duplicate Email):** `AxiosError` is caught in the `onSubmit` handler. The `errors.email` array from the backend is extracted and applied to the React Hook Form email field via `setError('email', { type: 'server', message: backendErrors.email[0] })`, instantly showing the constraint violation to the user.

### Secure Logout Flow
1.  Logout mutation fires.
2.  On settlement (success or error), frontend clears Zustand store.
3.  Calls `queryClient.cancelQueries()` to abort any in-flight user requests (preventing post-logout data leaks).
4.  Surgically removes sensitive queries from cache via `queryClient.removeQueries({ queryKey: ['currentUser'] })`, preserving public data.
5.  Navigates to `/login`.

## 6. Edge Cases & Vulnerabilities (Resolved)

*   **Duplicate Email Registration Error Handling (Resolved):** Registering with an existing email previously resulted in an unhandled promise rejection or generic error. **Fix:** Added `try/catch` to intercept `AxiosError` 422 responses in `RegisterPage` and map the backend `errors.email` directly to the React Hook Form email field using `setError`, providing immediate, contextual feedback.
*   **Unverified User Accessing Dashboard (Resolved):** `ProtectedRoute` previously only checked `isAuthenticated`, leading to a broken UI when unverified users hit 403s on API calls. **Fix:** Added `if (user && !user.email_verified_at) return <Navigate to="/verify-email" replace />;` inside `ProtectedRoute`.
*   **Post-Logout Data Leaks (Resolved):** Using `queryClient.clear()` destroyed public caches, while doing nothing risked in-flight requests resolving after logout. **Fix:** Implemented `queryClient.cancelQueries()` to abort network calls, followed by surgical `removeQueries` for user-specific data.
*   **Network Error Forced Logout (Resolved):** Temporary backend outages during session hydration caused `isError` to trigger, forcefully clearing the store. **Fix:** Modified `useAuth` sync logic to only clear the store when `fetchedUser === null` (explicit 401), ignoring transient network errors.

## 7. Tests

*   **Unit (Zod Schemas):** Validate password complexity rules, email format, and password confirmation matching.
*   **Component (`RegisterPage`):** Mock `registerUser` to reject with a 422 AxiosError containing `errors.email`. Assert that `setError` is called and the invalid feedback message renders under the email field.
*   **Component (`ProtectedRoute`):** Assert redirect to `/login` for unauthenticated users, redirect to `/verify-email` for unverified users, and rendering children for verified users.
*   **Hook (`useAuth`):** Test Zustand sync logic. Verify that a 401 error from `getMe` triggers `clearStore()` and sets `hasInitiallyLoaded` to true. Verify that a 500 error does NOT clear the store. Verify logout calls `cancelQueries` and `removeQueries`.

## 8. Notes

*   **Architecture Decision (Unconditional GET /me):** Firing `getMe` on public pages is strictly intentional. It is the only reliable way to hydrate an existing session on a hard refresh. React Query's `staleTime` ensures this does not result in redundant network requests during standard SPA navigation.
*   **Architecture Decision (Zustand + React Query):** React Query manages the asynchronous server state (loading/error), while Zustand manages synchronous client state derived from it (e.g., `isExpert`, `isPremium`). The `useAuth` hook bridges the two via a `useEffect` sync mechanism.
*   **Architecture Decision (Server-Side Validation Mapping):** While Zod provides robust client-side validation, backend rules (like `unique:users`) are the source of truth. Mapping 422 errors directly to React Hook Form ensures the UI stays perfectly in sync with backend constraints without duplicating complex DB checks on the frontend.

---