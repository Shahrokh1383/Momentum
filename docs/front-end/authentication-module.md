## **Frontend Documentation** — Authentication Module

```markdown
# Momentum Authentication — Frontend Documentation

> **Version**: 2.0.0  
> **Stack**: React 18, TypeScript, Vite, Zustand, TanStack Query v5, React Hook Form, Zod, Axios  
> **Status**: Production-Ready

## Table of Contents
1. [Overview](#overview)
2. [File Structure](#file-structure)
3. [State Management Architecture](#state-management-architecture)
4. [Core Hooks & Utilities](#core-hooks--utilities)
5. [Components & Pages](#components--pages)
6. [API Client Configuration](#api-client-configuration)
7. [Authentication Flows (Frontend)](#authentication-flows)
8. [OAuth Popup Mechanism](#oauth-popup-mechanism)
9. [Route Guards & Protected Routes](#route-guards--protected-routes)
10. [Form Validation (Zod Schemas)](#form-validation)
11. [Error Handling & Retry Logic](#error-handling--retry-logic)
12. [Edge Cases (Client-Side)](#edge-cases)
13. [Testing Strategy](#testing-strategy)
14. [Environment Variables](#environment-variables)

---

## Overview

The frontend authentication layer provides a seamless SPA experience for user registration, login, email verification, password reset, and OAuth login. It leverages server-state (React Query) for API interactions and a Zustand store for global auth state. The architecture enforces separation of concerns: forms manage their own state, the auth store reflects the current user, and protected routes guard against unauthorized access.

---

## File Structure

```
src/
├── components/user/auth/
│   ├── AuthLayout.tsx              # Shared wrapper (logo, title, card)
│   ├── OAuthButtons.tsx            # Google/GitHub buttons + popup logic
│   ├── PasswordInput.tsx           # Password field with show/hide
│   ├── PasswordStrengthMeter.tsx   # Visual strength indicator
│   └── ThemeToggle.tsx             # Dark/light mode switch
├── context/user/
│   └── authStore.ts                # Zustand store
├── hooks/user/
│   └── useAuth.ts                  # React Query mutations & queries
├── routes/user/
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── ForgotPasswordPage.tsx
│   ├── ResetPasswordPage.tsx
│   ├── VerifyEmailPage.tsx         # Dual-state machine
│   └── OAuthCallbackPage.tsx       # Popup handler
├── services/user/
│   └── authService.ts             # Axios calls
└── types/
    └── user.ts                    # TypeScript interfaces
```

---

## State Management Architecture

```
React Query (Server)   ──►   Zustand (Client)   ──►   UI Components
     - useCurrentUser()       - user
     - useLoginMutation()     - isAuthenticated
     - useRegisterMutation()  - isPremium
     - etc.                   - hasInitiallyLoaded
```

- **Zustand `authStore`**: Holds user object, authentication flag, premium status, and `hasInitiallyLoaded` (prevents infinite fetch loops on 401).
- **React Query `useCurrentUser`**: Fetches `/api/user/me` on mount (if authenticated) and populates the store.
- **Mutations** (login, register, logout, forgot/reset password, verify, OAuth callback) handle cache invalidation.

When the user logs in, React Query invalidates the `['currentUser']` query, which refetches and updates the store. On logout, the store is cleared and query cache is cleared.

---

## Core Hooks & Utilities

### `useAuth` hook

Provides all auth-related operations:

- `currentUser`: query result of `GET /me`
- `loginMutation`, `registerMutation`, `logoutMutation`, `forgotPasswordMutation`, `resetPasswordMutation`, `verifyEmailMutation`, `resendVerificationMutation`, `oauthCallbackMutation`.
- Convenience functions: `login()`, `register()`, `logout()` etc., each calling the corresponding mutation.

### Logout resilience

```ts
const logoutMutation = useMutation({
  mutationFn: authService.logout,
  onSettled: () => {
    // Clear state even if API fails
    authStore.getState().clear();
    queryClient.clear();
  }
});
```

---

## Components & Pages

### AuthLayout
- Displays logo, title, optional subtitle.
- Wraps children in a card container.

### OAuthButtons
- Renders Google/GitHub buttons.
- Opens popup with dimensions 600×700 centered.
- Listens for `oauth-success` message via `window.addEventListener('message')`.
- Handles popup close/timeout fallback.

### PasswordInput
- Controlled input with eye icon to toggle visibility.
- Props: value, onChange, error.

### PasswordStrengthMeter
- Calculates strength based on length, uppercase, lowercase, numbers, symbols.
- Displays a colored bar and label (Weak, Fair, Strong, etc.).

### LoginPage
- Form with email, password, "Remember me" checkbox.
- Links to forgot password and register.
- On success: invalidates queries and redirects to `/dashboard`.
- Already authenticated users are redirected away (via Navigate).

### RegisterPage
- Name, email, password, confirm password.
- Shows PasswordStrengthMeter.
- On success: auto-login, navigate to `/verify-email` (awaiting email state).

### ForgotPasswordPage
- Email input, on submit shows generic success message.

### ResetPasswordPage
- Extracts `token` and `email` from URL params.
- If missing, shows "Invalid Link".
- Form with new password and confirmation, calls reset mutation.

### VerifyEmailPage (Dual State)
- If URL has `?token=xxx&email=xxx` → auto-submit verification on mount (using a `hasProcessed` ref to prevent double-fire from React Strict Mode).
- Shows spinner → success (redirect to dashboard) or error (with resend button).
- If no query params → "Check your inbox" UI with user's email and resend button.

### OAuthCallbackPage
- Designed to be loaded in the popup window.
- Reads `code` and `provider` from URL, calls `oauthCallbackMutation`.
- On success: posts `{ type: 'oauth-success' }` to `window.opener`, closes popup.
- On error: displays error in popup (user can close).

---

## API Client Configuration

- Axios instance with `baseURL: import.meta.env.VITE_API_BASE_URL`.
- `withCredentials: true` to send cookies (XSRF token).
- Interceptor to fetch `/sanctum/csrf-cookie` before POST/PUT/DELETE if not already present.
- Handles 401 responses globally? (Not detailed; typically handled by query retry/ redirect logic).

---

## Authentication Flows (Frontend)

### Registration Flow
1. User fills form (React Hook Form + Zod).
2. `registerMutation.mutate(data)`.
3. On success: auth store updated with returned user, `isAuthenticated = true`.
4. Navigate to `/verify-email` (no token) showing "Check your inbox".
5. User clicks link in email → `/verify-email?token=...&email=...` → auto-verify → success → dashboard.

### Login Flow
1. Form submit → `loginMutation`.
2. On success: store updated, redirect to `/dashboard` or intended route.
3. On error: display generic error message.

### Logout Flow
1. `logoutMutation.mutate()` (first refreshes CSRF cookie to avoid 419).
2. On settled: clear store, clear query cache, navigate to `/login`.

### Password Reset Flow
1. Forgot password → `forgotPasswordMutation` → show confirmation.
2. Email link → `/reset-password?token=...&email=...`.
3. Form with new password → `resetPasswordMutation` → success → navigate to login.

---

## OAuth Popup Mechanism

1. User clicks "Continue with Google/GitHub".
2. `OAuthButtons` calls `authService.getOAuthUrl(provider)` which does `GET /api/auth/oauth/{provider}`.
3. Opens `window.open(url, 'oauth', 'width=600,height=700')`.
4. Backend redirects to Google/GitHub consent screen; after consent, redirects to frontend `/auth/callback/google?code=xxx`.
5. `OAuthCallbackPage` extracts code, calls `POST /api/auth/oauth/{provider}/callback` with `{ code }`.
6. On success: posts `window.opener.postMessage('oauth-success', '*')`, closes popup.
7. Main window listener detects message, invalidates `currentUser` query, navigates to `/dashboard`.
8. If popup closed manually → clears loading spinner (timer).

---

## Route Guards & Protected Routes

- `ProtectedRoute` component: checks `authStore.isAuthenticated` (or `hasInitiallyLoaded` to prevent flash of login page). If not authenticated, redirect to `/login`.
- Login and Register pages: if already authenticated, redirect to `/dashboard`.
- `RootRedirect`: checks auth and redirects accordingly.

The Zustand store's `hasInitiallyLoaded` flag is critical: on app boot, `useCurrentUser` tries to fetch `/me`. If it returns 401, the query sets error and `hasInitiallyLoaded` becomes `true`, allowing the guard to know the true auth state and avoid endless redirect loops.

---

## Form Validation (Zod Schemas)

Shared validation schemas mirror server rules, providing instant feedback.

- **Login**: email (valid email), password (min 1 for non-empty).
- **Register**: name (min 1), email, password (min 8, regex for complexity), password_confirmation (refine: matches password).
- **Forgot password**: email.
- **Reset password**: token, email, password, password_confirmation.

Zod schemas used by React Hook Form via `zodResolver`.

---

## Error Handling & Retry Logic

- Form validation errors displayed inline.
- API errors handled in mutations: error toasts (if global toast system) or inline error state.
- Network errors: retry with exponential backoff? (Not specified, but React Query's `retry` can be set).
- 401 after session expiry: React Query's `useQuery` can retry once, but `hasInitiallyLoaded` ensures graceful fallback.
- Logout clears cache even on failure (using `onSettled`), preventing stuck auth state.

---

## Edge Cases (Client-Side)

1. **Verification link after expiry** → auto-verify returns error → page shows error with resend button.
2. **Double-click on resend** → disabled state on button while mutation pending, rate limit error handled gracefully.
3. **User navigates to `/verify-email` without params** → shows awaiting email UI.
4. **React Strict Mode double-firing useEffect** → `hasProcessed` ref prevents duplicate verification API call.
5. **OAuth popup blocked by browser** → fallback: show error with instructions to allow popups.
6. **OAuth callback without `window.opener`** (direct navigation) → OAuthCallbackPage detects missing opener and redirects to dashboard directly after success.
7. **CSRF token expired before logout** → `logout` function first fetches fresh CSRF cookie before POST.
8. **GET /me returns 401 on initial load** → `hasInitiallyLoaded` set to true, auth state remains false, no infinite loop.

---

## Testing Strategy

- Unit tests for Zustand store actions.
- Component tests with React Testing Library (form interactions, conditional rendering).
- Integration tests for complete flow: login, redirect, verify email page states.
- Mock axios calls with `msw` or similar.
- OAuth popup simulation using `window.open` mock.

---

## Environment Variables

```
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_NAME=Momentum