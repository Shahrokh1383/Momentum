## 1. Overview

### 1.1 Purpose

The frontend Authentication module is the user-facing implementation of Momentum’s identity system. It provides registration, login, email verification, password reset, and OAuth flows entirely within a React SPA, communicating with the backend via Axios and managing state through Zustand and React Query.

### 1.2 Key Features (Frontend)

| Feature | Description |
|---------|-------------|
| **Form-based Auth** | Registration and login forms with real-time validation (React Hook Form + Zod). |
| **Email Verification UI** | Dual-state page: auto-verify from email link, or “check inbox” prompt with resend. |
| **Password Reset UI** | Forgot password form and reset form that consumes the token from the URL. |
| **OAuth Popup** | Google/GitHub login via a centred popup window; cross-window messaging for callback. |
| **Session Management** | Zustand store for user state; automatic cache clearing and redirects on logout. |
| **Theme Toggle** | Dark/light mode switch persisted in local storage. |
| **Password Strength** | Visual strength meter on registration and reset forms. |

### 1.3 Technology Stack (Frontend)

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript |
| State Management (Client) | Zustand (`authStore`) |
| State Management (Server) | TanStack React Query v5 |
| Form Handling | React Hook Form + Zod validation |
| HTTP Client | Axios (with automatic XSRF cookie handling) |
| Routing | React Router v6 |
| OAuth | Browser popup + `postMessage` API |
| Styling | Tailwind CSS (utility-first) |

---

## 2. Business Rules — Frontend Perspective

These rules describe the frontend behaviour that must be implemented for a consistent user experience. They complement the backend’s business rules.

### 2.1 Registration
- After successful registration (201), the user is automatically authenticated and redirected to `/verify-email`.
- The verification email is sent automatically; the frontend does **not** trigger it separately.

### 2.2 Email Verification
- The verification link in the email points to `FRONTEND_URL/verify-email?id=xxx&hash=xxx&expires=xxx&signature=xxx`.
- On load of `VerifyEmailPage`:
  - If all four query parameters are present → **auto-verify mode**: extract params and POST them to `/api/auth/verify-email` with the same query string.
  - If any parameter is missing → **awaiting-email mode**: show UI instructing the user to check their inbox.
- If auto-verification succeeds (200), redirect to `/dashboard`; if it fails (422), display an error and offer a “Send New Verification Email” button.
- The “Resend Verification Email” button calls `POST /api/auth/verify-email/resend` with the user’s email.

### 2.3 Login
- Successful login (200) updates the Zustand store with the user object; React Router navigates to the intended destination (or `/dashboard`).
- “Remember me” checkbox is sent as `remember: boolean` in the request body.
- A generic error message is shown on failure (401).

### 2.4 Password Reset
- **Forgot Password** page: user submits email → always shows a success message (regardless of whether the email exists).
- The reset link in the email points to `FRONTEND_URL/reset-password?token=xxx&email=xxx`.
- **Reset Password** page:
  - Must extract `token` and `email` from the URL.
  - If either is missing, display an “Invalid Link” message.
  - On submit, send `token`, `email`, `password`, and `password_confirmation` to `POST /api/auth/reset-password`.
  - Success → redirect to `/login` with a success message; failure → show error.

### 2.5 OAuth
- OAuth login opens a popup window (600×700px, centred) pointing to the backend’s OAuth redirect URL.
- After the provider callback, the popup posts an `oauth-success` message to the opener window.
- The main window listens for this message, then invalidates the React Query cache and redirects to `/dashboard`.
- If the popup is blocked, a fallback message is shown.

### 2.6 Logout
- The frontend first requests a fresh CSRF cookie (to prevent 419 errors), then calls `POST /api/user/logout`.
- **Regardless of the API response** (success or failure), the Zustand store is cleared, React Query cache is invalidated, and the user is redirected to `/login`.

---

## 3. Frontend Architecture

### 3.1 File Structure

```
src/
├── components/user/auth/
│   ├── AuthLayout.tsx              # Shared layout: logo, title, card wrapper
│   ├── OAuthButtons.tsx            # OAuth provider buttons + popup logic
│   ├── PasswordInput.tsx           # Password field with visibility toggle
│   ├── PasswordStrengthMeter.tsx   # Visual password strength indicator
│   └── ThemeToggle.tsx             # Dark/light theme switch
├── context/user/
│   └── authStore.ts                # Zustand store
├── hooks/user/
│   └── useAuth.ts                  # React Query hooks and mutations
├── routes/user/
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── ForgotPasswordPage.tsx
│   ├── ResetPasswordPage.tsx
│   ├── VerifyEmailPage.tsx
│   └── OAuthCallbackPage.tsx       # Popup handler (oauth callback)
├── services/user/
│   └── authService.ts              # Axios functions for all auth endpoints
└── types/
    └── user.ts                     # TypeScript interfaces
```

### 3.2 State Management

| Layer | Tool | Responsibility |
|-------|------|---------------|
| **Server State** | TanStack React Query | Fetching user (`/api/user/me`), triggering mutations (login, register, etc.), cache invalidation on success. |
| **Client State** | Zustand (`authStore`) | Holds `user`, `isAuthenticated`, `isPremium`, and `hasInitiallyLoaded` (prevents infinite fetch loops). Persisted across page reloads via session storage. |
| **Form State** | React Hook Form | Manages form values, validation errors, submission status. |
| **Validation** | Zod | Schema definitions for form validation (client-side) before API calls. |

**Zustand store interface:**
```ts
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isPremium: boolean;
  hasInitiallyLoaded: boolean;
  setUser: (user: User | null) => void;
  clearUser: () => void;
  setInitiallyLoaded: (loaded: boolean) => void;
}
```

### 3.3 Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| `AuthLayout` | Renders the shared visual structure for auth pages (logo, title, card) |
| `OAuthButtons` | Displays Google/GitHub buttons; opens popup on click; handles `postMessage` listener |
| `PasswordInput` | Password field with a toggle to show/hide password |
| `PasswordStrengthMeter` | Calculates and displays password strength (length, complexity) |
| `ThemeToggle` | Persists and switches theme (light/dark) |
| `ProtectedRoute` | Route guard that checks `isAuthenticated` + `hasInitiallyLoaded`; redirects to `/login` if not authenticated |

### 3.4 VerifyEmailPage — Dual State Machine

```
URL has all Signed URL params (id, hash, expires, signature)?
├── YES → STATE 1: Auto-Verification
│   ├── Pending  → Spinner + "Verifying your email..."
│   ├── Success  → Redirect to /dashboard
│   └── Error    → Show error + "Send New Verification Email" button
│
└── NO → STATE 2: Awaiting Email
    ├── Show email (from store or local state)
    ├── "Check your inbox" instructions
    └── "Resend Verification Email" button (with rate limit awareness)
```

Additional protections:
- A `hasProcessed` ref prevents duplicate API calls caused by React Strict Mode’s double-mount.
- The resend button is disabled while a request is in flight.

---

## 4. API Integration Summary

All API calls are defined in `authService.ts` and called via custom hooks in `useAuth.ts`. Endpoints are relative to the base URL configured in Axios.

| Action | Endpoint | Method | Key Request Body / Params |
|--------|----------|--------|---------------------------|
| Register | `/api/auth/register` | POST | name, email, password, password_confirmation |
| Login | `/api/auth/login` | POST | email, password, remember |
| Forgot Password | `/api/auth/forgot-password` | POST | email |
| Reset Password | `/api/auth/reset-password` | POST | token, email, password, password_confirmation |
| Verify Email | `/api/auth/verify-email` | POST | Query params: id, hash, expires, signature (from email link) |
| Resend Verification | `/api/auth/verify-email/resend` | POST | email |
| OAuth Redirect | `/api/auth/oauth/{provider}` | GET | — (returns redirect URL) |
| OAuth Callback | `/api/auth/oauth/{provider}/callback` | POST | code |
| Logout | `/api/user/logout` | POST | — |
| Get Current User | `/api/user/me` | GET | — |

> **CSRF Protection**: Axios is configured to read the `XSRF-TOKEN` cookie and send the `X-XSRF-TOKEN` header automatically. Before logout, a GET request to `/sanctum/csrf-cookie` is made to refresh the token.

---

## 5. User Flows & State Machines

### 5.1 Registration → Email Verification Flow

```
RegisterPage (form)
    │
    ▼
useAuth.register() → POST /api/auth/register
    │
    ├─ 201 → setUser(response.data) → navigate('/verify-email')
    │
    ▼
VerifyEmailPage
    │
    ├─ (has query params?) → Auto-verify: POST /api/auth/verify-email?... 
    │       ├─ 200 → invalidate user query → navigate('/dashboard')
    │       └─ 422 → show error UI + "Send New Email" button
    │
    └─ (no params) → Show "Check your inbox" + "Resend" button
```

### 5.2 Login Flow

```
LoginPage (form)
    │
    ▼
useAuth.login() → POST /api/auth/login
    │
    ├─ 200 → setUser(data) → navigate(redirectTo or '/dashboard')
    └─ 401 → show "Invalid credentials" error
```

### 5.3 OAuth Popup Flow

```
OAuthButtons (click)
    │
    ▼
Open popup to /api/auth/oauth/{provider} (which redirects to provider)
    │
    ▼
Popup completes OAuth → backend callback → returns HTML page that posts message:
    window.opener.postMessage({ type: 'oauth-success' }, FRONTEND_URL)
    │
    ▼
Main window listener:
    on message 'oauth-success' → invalidate user query → navigate('/dashboard')
```

### 5.4 Logout Flow

```
User clicks Logout
    │
    ▼
GET /sanctum/csrf-cookie (refresh CSRF token)
    │
    ▼
POST /api/user/logout
    │
    ▼
(onSettled) → clear Zustand store → clear React Query cache → navigate('/login')
(always executed, even if API fails)
```

---

## 6. Edge Cases — Frontend

| # | Scenario | Expected Behaviour |
|---|----------|-------------------|
| EC-VER-06 | User navigates to `/verify-email` without query parameters | STATE 2: display "Check your inbox" with the user’s email and resend button |
| EC-VER-09 | React Strict Mode double-mounts VerifyEmailPage | `useRef(hasProcessed)` prevents the auto-submit from firing twice |
| EC-FE-01 | OAuth popup is blocked by browser | Show a fallback message instructing the user to enable popups or try the standard link |
| EC-FE-02 | User opens the app with a stale session (cookie expired) | `GET /api/user/me` returns 401 → Zustand `isAuthenticated` set to `false`, redirected to `/login` |
| EC-FE-03 | Network error during logout | Zustand store and cache are still cleared (`onSettled`), user redirected to login – prevents UI lock |
| EC-FE-04 | User closes the OAuth popup before completing authentication | Popup closes with no message; main window does nothing; the user must click the button again |
| EC-FE-05 | Resend verification email while a request is already in flight | Button disabled via `isLoading` state |
| EC-FE-06 | Token or email missing from `/reset-password` URL | Show "Invalid Link" UI with a link to request a new reset email |
| EC-FE-07 | User has unverified email and tries to access a protected route | `ProtectedRoute` + backend `verified` middleware redirect to `/verify-email` |

---

## 7. Development Notes

### 7.1 Local Development Setup
- **Frontend Dev Server**: Vite on `http://localhost:5173`.
- **Proxy**: Vite’s dev server proxies API requests to `http://localhost:8000` (Laravel backend) to avoid CORS issues.
- **Cookies**: The backend must set `SESSION_DOMAIN=localhost` and the frontend must send credentials (`withCredentials: true` in Axios defaults).
- **CSRF**: The first GET to `/sanctum/csrf-cookie` must be called before any state-changing request (handled automatically by Axios interceptors or the `useAuth` hook).

### 7.2 Important Implementation Details
- **Logout robustness**: Use `onSettled` in the logout mutation to clear store/cache, not `onSuccess`. This ensures the user can always log out, even if the server fails.
- **Zustand initial load**: A `hasInitiallyLoaded` flag is set to `true` after the first successful `/api/user/me` fetch. Until then, `ProtectedRoute` shows a loading spinner to prevent flash-redirects.
- **VerifyEmailPage auto-submit**: The query params are read with `useSearchParams()` and, if all four exist, a `useEffect` with an empty dependency array triggers the POST. A `ref` (`hasProcessed`) prevents double execution in development mode.
- **Password strength meter**: The `PasswordStrengthMeter` component receives the password value and applies a heuristic (length + character variety) to colour a progress bar—no network call.

### 7.3 Production Deployment
- **Environment variables**: `VITE_API_BASE_URL` should point to the production backend.
- **Serving**: Build the React app with `vite build` and serve the static files from the same domain as the backend, or configure a reverse proxy.
- **SPA routing**: The web server must redirect all non-file requests to `index.html` (e.g., using Nginx `try_files`).
- **CORS & Sanctum**: Ensure `SANCTUM_STATEFUL_DOMAINS` includes the production frontend domain and that `FRONTEND_URL` is correctly set in the backend’s `.env`.