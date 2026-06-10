
# Authentication Module — Technical Documentation

> **Module**: Authentication & Identity Management
> **Version**: 3.0.0
> **Status**: Production-Ready (Real Email Integration)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Business Rules](#2-business-rules)
3. [Backend Architecture](#3-backend-architecture)
4. [Frontend Architecture](#4-frontend-architecture)
5. [API Contract](#5-api-contract)
6. [Flow Diagrams](#6-flow-diagrams)
7. [Edge Cases](#7-edge-cases)
8. [Notes](#8-notes)

---

## 1. Overview

### 1.1 Purpose

The Authentication module provides secure user identity management for the Momentum Habit Tracker application. It handles user registration, login, logout, email verification, password reset, and third-party OAuth authentication.

---

### 1.2 Key Features

| Feature | Description |
|---------|-------------|
| **Email/Password Auth** | Traditional credential-based registration and login |
| **Email Verification** | Real SMTP-based email verification using Laravel's native Cryptographic Signed URLs |
| **Password Reset** | Real SMTP-based password reset flow using Laravel's native Password Broker |
| **OAuth 2.0** | Google and GitHub social login via popup window |
| **Hybrid Auth** | Laravel Sanctum dynamically supports both Stateful (SPA cookie-based) and Stateless (API/Mobile Bearer token) authentication |
| **Rate Limiting** | Per-IP and per-email throttling on sensitive endpoints |

### 1.3 Technology Stack

| Layer | Technology |
|-------|-----------|
| Backend Framework | Laravel 11 (PHP 8.2+) |
| Authentication | Laravel Sanctum (Stateful SPA mode + Stateless API Tokens) |
| Email Transport | SMTP (Mailpit for development, any SMTP for production) |
| Token Management | Laravel Native Signed URLs & Password Broker |
| OAuth Provider | Laravel Socialite |
| Frontend Framework | React 18 + TypeScript |
| State Management | Zustand (authStore) |
| Server State | TanStack React Query v5 |
| Form Handling | React Hook Form + Zod validation |
| HTTP Client | Axios with XSRF cookie support |
| Routing | React Router v6 |

### 1.4 Architecture Principles

- **SOLID**: Each service has a single, well-defined responsibility
- **SRP**: Controllers delegate to services; services orchestrate native Laravel features
- **DRY**: Shared `HasApiResponse` trait for consistent JSON responses; leverages Laravel's built-in token/verification mechanisms instead of reinventing the wheel
- **KISS**: Utilizing Laravel's native Signed URLs and Password Broker removes the need for custom token CRUD, DB tables, and manual expiration logic
- **Separation of Concerns**: Backend validates & processes; Frontend handles UX state

---

## 2. Business Rules

### 2.1 Registration

| Rule | Details |
|------|---------|
| BR-REG-01 | Name is required, max 255 characters |
| BR-REG-02 | Email must be unique across all users |
| BR-REG-03 | Password minimum 8 characters with mixed case, numbers, and symbols |
| BR-REG-04 | Password confirmation must match |
| BR-REG-05 | User is auto-logged-in immediately after registration |
| BR-REG-06 | A verification email is sent automatically upon registration |
| BR-REG-07 | User is redirected to `/verify-email` page after registration |
| BR-REG-08 | Unverified users cannot access protected routes (enforced by `verified` middleware) |

### 2.2 Email Verification

| Rule | Details |
|------|---------|
| BR-VER-01 | Verification uses Laravel's Cryptographic Signed URLs (no DB token storage required) |
| BR-VER-02 | Signed URLs expire after **60 minutes** from creation |
| BR-VER-03 | Signatures are validated natively by Laravel; tampering with parameters invalidates the signature |
| BR-VER-04 | Attempting to use an expired or invalid signature returns a 422 error |
| BR-VER-05 | Already-verified users who request resend receive a success message without a new email |
| BR-VER-06 | Verification link redirects to frontend route: `/verify-email?id=xxx&hash=xxx&expires=xxx&signature=xxx` |
| BR-VER-07 | Frontend automatically extracts query parameters and POSTs them to the backend API upon page load |

### 2.3 Login

| Rule | Details |
|------|---------|
| BR-LOG-01 | Login requires valid email and password |
| BR-LOG-02 | "Remember me" extends session duration (Stateful SPA only) |
| BR-LOG-03 | Session is regenerated on successful login for stateful requests (session fixation prevention) |
| BR-LOG-04 | Failed login returns generic "Invalid credentials" message (no email enumeration) |
| BR-LOG-05 | Login is rate-limited to 5 attempts per minute per IP |
| BR-LOG-06 | Stateless requests (Postman/Mobile) receive a Bearer `auth-token` upon successful login instead of a session cookie |

### 2.4 Password Reset

| Rule | Details |
|------|---------|
| BR-RST-01 | Reset tokens are generated and managed by Laravel's native `Password` broker |
| BR-RST-02 | Tokens expire after **60 minutes** from creation (configurable in `auth.php`) |
| BR-RST-03 | Tokens are stored securely in the `password_reset_tokens` database table |
| BR-RST-04 | Forgot password always returns generic success (prevents email enumeration) |
| BR-RST-05 | Reset link redirects to frontend: `/reset-password?token=xxx&email=xxx` |
| BR-RST-06 | New password must meet the same complexity rules as registration |
| BR-RST-07 | Password is automatically hashed via the `hashed` cast on the User model |

### 2.5 OAuth

| Rule | Details |
|------|---------|
| BR-OA-01 | Supported providers: Google, GitHub |
| BR-OA-02 | OAuth login opens in a popup window (600x700px, centered) |
| BR-OA-03 | If email already exists in DB, the existing user is linked to the OAuth provider |
| BR-OA-04 | New OAuth users are created with `email_verified_at` set (trusted provider) |
| BR-OA-05 | OAuth users have nullable passwords (cannot use forgot-password flow) |
| BR-OA-06 | Popup posts `oauth-success` message to opener window on success |
| BR-OA-07 | Unsupported providers return `400 invalid_provider` error |

### 2.6 Logout

| Rule | Details |
|------|---------|
| BR-OUT-01 | Stateful (SPA): Session is invalidated and CSRF token is regenerated |
| BR-OUT-02 | Stateless (API/Mobile): Current Bearer token is revoked/deleted from the database |
| BR-OUT-03 | Frontend forcefully clears all state (Zustand store + React Query cache) even if the backend API call fails (using onSettled instead of onSuccess) |
| BR-OUT-04 | A fresh CSRF cookie is requested before the logout POST to prevent 419 errors on expired tokens (SPA only) |
| BR-OUT-05 | User is redirected to /login |

### 2.7 Rate Limiting

| Limiter | Scope | Limit |
|---------|-------|-------|
| `auth-limiter` | Login & Register | 5 per minute per IP |
| `password-limiter` | Forgot Password & Resend Verification | 2 per 5 minutes per IP+email |
| `reset-limiter` | Reset Password & Verify Email | 5 per minute per IP |
| `api-limiter` | All authenticated endpoints | 60 per minute per user |

---

## 3. Backend Architecture

### 3.1 File Structure

```
app/
├── Http/
│   ├── Controllers/Auth/
│   │   ├── AuthController.php     # register, login, logout, me
│   │   ├── EmailVerificationController.php  # verify, resend
│   │   ├── OAuthController.php    # redirect, callback
│   │   └── PasswordResetController.php      # forgot, reset
│   └── Requests/Auth/
│       ├── ForgotPasswordRequest.php
│       ├── LoginRequest.php
│       ├── OAuthCallbackRequest.php
│       ├── RegisterRequest.php
│       └── ResetPasswordRequest.php
├── Mail/
│   ├── VerificationMail.php       # Mailable: email verification
│   └── PasswordResetMail.php      # Mailable: password reset
├── Models/
│   └── User.php                   # Authenticatable model (implements MustVerifyEmail)
├── Services/Auth/
│   ├── EmailVerificationService.php  # Dispatches notifications & verifies signatures
│   ├── OAuthService.php              # Socialite abstraction
│   └── PasswordResetService.php      # Delegates to Laravel Password Broker
└── Traits/
    └── HasApiResponse.php         # Standardized JSON responses

resources/views/emails/
├── verify-email.blade.php         # HTML email template
└── reset-password.blade.php       # HTML email template

routes/api/
└── auth.php                       # All authentication routes
```

### 3.2 Controller Responsibilities (SRP)

| Controller | Methods | Responsibility |
|-----------|---------|---------------|
| `AuthController` | `register`, `login`, `logout`, `me` | Credential auth + dynamic stateful/stateless response handling |
| `EmailVerificationController` | `verify`, `resend` | Signature validation & email verification orchestration |
| `PasswordResetController` | `forgot`, `reset` | Password reset orchestration |
| `OAuthController` | `redirect`, `callback` | OAuth flow orchestration |

> **Key Principle**: Controllers do NOT contain business logic. They delegate to services and return responses dynamically based on the request context (Stateful vs. Stateless).

> **Key Principle**: Controllers do NOT contain business logic. They delegate to services and return responses.

### 3.3 Service Responsibilities (SRP)

| Service | Responsibility |
|---------|---------------|
| `EmailVerificationService` | Triggers `sendEmailVerificationNotification` on User, verifies URL signatures, marks email as verified |
| `PasswordResetService` | Delegates to Laravel's native `Password` broker for sending reset links and resetting passwords |
| `OAuthService` | Validate providers, generate Socialite redirect URLs, retrieve social user data |

### 3.4 Native Token & Verification Mechanisms

By migrating away from a custom `SentEmailLog` table, the system leverages Laravel's native, cryptographically secure mechanisms:

| Mechanism | Implementation |
|-----------|---------------|
| **Email Verification** | Uses `Illuminate\Contracts\Auth\MustVerifyEmail`. The `User` model overrides `sendEmailVerificationNotification()` to generate a **Relative Temporary Signed Route** (`URL::temporarySignedRoute(..., false)`). This ensures signature validation succeeds even when the SPA proxy alters the host header. |
| **Signature Validation** | Handled via `URL::hasValidSignature($request, false)` in the `EmailVerificationController`. No database queries are needed to validate verification tokens. |
| **Password Reset** | Uses Laravel's native `Password` broker (`Illuminate\Support\Facades\Password`). Tokens are automatically generated, hashed for security, and stored in the `password_reset_tokens` database table. Expiration and deletion are handled natively by the framework. |

---

## 4. Frontend Architecture

### 4.1 File Structure

```
src/
├── components/user/auth/
│   ├── AuthLayout.tsx             # Shared auth page layout (logo, title, card)
│   ├── OAuthButtons.tsx           # Google/GitHub OAuth buttons with popup logic
│   ├── PasswordInput.tsx          # Password field with show/hide toggle
│   ├── PasswordStrengthMeter.tsx  # Visual password strength indicator
│   └── ThemeToggle.tsx            # Dark/light theme switch
├── context/user/
│   └── authStore.ts               # Zustand store: user, isAuthenticated, isPremium, hasInitiallyLoaded
├── hooks/user/
│   └── useAuth.ts                 # React Query mutations & queries for all auth actions
├── routes/user/
│   ├── LoginPage.tsx              # Login form with remember me + OAuth
│   ├── RegisterPage.tsx           # Registration form with password strength
│   ├── ForgotPasswordPage.tsx     # Email input → success message
│   ├── ResetPasswordPage.tsx      # New password form (token from URL)
│   ├── VerifyEmailPage.tsx        # Dual-state: auto-verify or waiting for email
│   └── OAuthCallbackPage.tsx      # Popup handler for OAuth code exchange
├── services/user/
│   └── authService.ts             # Axios API calls for all auth endpoints
└── types/
    └── user.ts                    # TypeScript interfaces (VerifyEmailPayload uses Signed URL params)
```

### 4.2 State Management Strategy

| Layer | Tool | Responsibility |
|-------|------|---------------|
| Server State | React Query | Fetching user, mutation lifecycle, cache invalidation |
| Client State | Zustand | Current user object, authentication status, premium flag, and initial load status (prevents infinite fetch loops) |
| Form State | React Hook Form | Form values, validation errors, submission state |
| Validation | Zod | Schema-level input validation before API call |

### 4.3 Component Responsibilities

| Component | SRP |
|-----------|-----|
| `AuthLayout` | Visual wrapper: logo, title, subtitle, card container |
| `OAuthButtons` | OAuth popup lifecycle, provider selection |
| `PasswordInput` | Password field with visibility toggle |
| `PasswordStrengthMeter` | Visual password strength calculation and display |
| `ThemeToggle` | Dark/light mode persistence and switching |
| `ProtectedRoute` | Route guard: redirects unauthenticated users to `/login` |

### 4.4 VerifyEmailPage — Dual State Machine

```
URL has Signed URL params (id, hash, expires, signature)?
├── YES → STATE 1: Auto-Verification
│   ├── Pending  → Show spinner + "Verifying your email..."
│   ├── Success  → Redirect to /dashboard (via React Query invalidation)
│   └── Error    → Show error + "Send New Verification Email" button
│
└── NO → STATE 2: Awaiting Email
    ├── Show "Check your inbox" UI with user's email
    └── "Resend Verification Email" button
```

---

## 5. API Contract

### 5.1 Authentication Endpoints

All endpoints are prefixed with `/api/auth`.

---

#### `POST /api/auth/register`

Register a new user account. Sends verification email automatically.

**Rate Limit**: `auth-limiter` (5/min per IP)

**Request**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecureP@ss1",
  "password_confirmation": "SecureP@ss1"
}
```

**Request**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecureP@ss1",
  "password_confirmation": "SecureP@ss1"
}
```

**Success Response (Stateless - API/Postman/Mobile)** `201`:
```json
{
  "success": true,
  "message": "Registration successful. Please check your email to verify your account.",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "avatar": null,
      "role": "user",
      "email_verified_at": null,
      "profile_visibility": "public",
      "is_premium": false,
      "subscription": null,
      "created_at": "2025-07-XX..."
    },
    "token": "2|xyz987wvu654..."
  }
}
```

**Error Response** `422`:
```json
{
  "message": "The email has already been taken.",
  "errors": {
    "email": ["The email has already been taken."]
  }
}
```

---

#### `POST /api/auth/login`

Authenticate a user with credentials. Dynamically returns a session cookie for Stateful requests (SPA) or a Bearer token for Stateless requests (API/Mobile/Postman).


**Rate Limit**: `auth-limiter` (5/min per IP)

**Request**:
```json
{
  "email": "john@example.com",
  "password": "SecureP@ss1",
  "remember": true
}
```

**Success Response (Stateful - SPA)** `200`:
*Sets `momentum_session` and `XSRF-TOKEN` cookies automatically.*
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "email_verified_at": "2025-07-XX...",
    "is_premium": false,
    "subscription": {
      "plan": "free",
      "status": "active",
      "expires_at": null
    }
  }
}
```

**Success Response (Stateless - API/Postman/Mobile)** `200`:
*No cookies set. Token must be used in `Authorization: Bearer <token>` header for subsequent requests.*
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "email_verified_at": "2025-07-XX...",
      "is_premium": false,
      "subscription": {
        "plan": "free",
        "status": "active",
        "expires_at": null
      }
    },
    "token": "1|abc123def456ghi789..."
  }
}
```

**Error Response** `401`:
```json
{
  "success": false,
  "error": "authentication_failed",
  "message": "Invalid credentials"
}
```

---

#### `POST /api/auth/forgot-password`

Request a password reset email.

**Rate Limit**: `password-limiter` (2 per 5 min per IP+email)

**Request**:
```json
{
  "email": "john@example.com"
}
```

**Success Response** `200`:
```json
{
  "success": true,
  "message": "If an account with that email exists, a password reset link has been sent.",
  "data": null
}
```

> ⚠️ Always returns success to prevent email enumeration.

---

#### `POST /api/auth/reset-password`

Reset the user's password using a valid token.

**Rate Limit**: `reset-limiter` (5/min per IP)

**Request**:
```json
{
  "token": "abc123...",
  "email": "john@example.com",
  "password": "NewSecureP@ss1",
  "password_confirmation": "NewSecureP@ss1"
}
```

**Success Response** `200`:
```json
{
  "success": true,
  "message": "Password reset successfully. You can now log in with your new password.",
  "data": null
}
```

**Error Response** `422`:
```json
{
  "success": false,
  "error": "invalid_token",
  "message": "The password reset link is invalid or has expired. Please request a new one."
}
```

---

#### `POST /api/auth/verify-email?id=xxx&hash=xxx&expires=xxx&signature=xxx`

Verify user's email address using the Signed URL parameters. Parameters must be passed in the **Query String** so Laravel's `URL::hasValidSignature` can validate them natively.

**Rate Limit**: `reset-limiter` (5/min per IP)

**Request Body**: Empty (or `null`)

**Request Query Params**: `id`, `hash`, `expires`, `signature` (extracted from the email link by the SPA)

**Success Response** `200`:
```json
{
  "success": true,
  "message": "Email verified successfully. You can now access your account.",
  "data": null
}
```

**Error Response** `422`:
```json
{
  "success": false,
  "error": "invalid_token",
  "message": "The verification link is invalid or has expired. Please request a new one."
}
```

---

#### `POST /api/auth/verify-email/resend`

Resend the verification email.

**Rate Limit**: `password-limiter` (2 per 5 min per IP+email)

**Request**:
```json
{
  "email": "john@example.com"
}
```

**Success Response** `200`:
```json
{
  "success": true,
  "message": "Verification email sent. Please check your inbox.",
  "data": null
}
```

---

#### `GET /api/auth/oauth/{provider}`

Get the OAuth redirect URL for a provider.

**Request**: No body. Provider in URL: `google` or `github`.

**Success Response** `200`:
```json
{
  "success": true,
  "message": "OAuth URL generated",
  "data": {
    "url": "https://accounts.google.com/o/oauth2/auth?..."
  }
}
```

**Error Response** `400`:
```json
{
  "success": false,
  "error": "invalid_provider",
  "message": "Unsupported OAuth provider: twitter"
}
```

---

#### `POST /api/auth/oauth/{provider}/callback`

Exchange OAuth code for user authentication.

**Request**:
```json
{
  "code": "4/0AX4XfW..."
}
```

**Success Response** `200`:
```json
{
  "success": true,
  "message": "OAuth login successful",
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "email_verified_at": "2025-07-XX..."
  }
}
```

---

### 5.2 Authenticated Endpoints

These are in `/api/user` and require `auth:sanctum` + `verified` middleware.

#### `POST /api/user/logout`

Invalidates the current authentication context. 
- **Stateful (SPA)**: Invalidates session and regenerates CSRF token.
- **Stateless (API/Mobile)**: Revokes the current Bearer token (`currentAccessToken()->delete()`).

**Headers (Stateless)**: `Authorization: Bearer <token>`

**Success Response** `200`:
```json
{
  "success": true,
  "message": "Logged out successfully",
  "data": null
}
```

#### `GET /api/user/me`

**Success Response** `200`:
```json
{
  "success": true,
  "message": "Success",
  "data": { /* UserResource */ }
}
```

**Error Response** `401`:
```json
{
  "message": "Unauthenticated."
}
```

---

## 6. Flow Diagrams

### 6.1 Registration + Email Verification Flow

```
┌──────────┐     ┌──────────────┐     ┌───────────────────────┐     ┌─────────────┐
│  Browser  │────▶│  POST        │────▶│  AuthController       │────▶│  EmailVerif. │
│  (React)  │     │  /register   │     │  register()           │     │  Service     │
└──────────┘     └──────────────┘     │                       │     │             │
                                       │  1. Create User (DB)  │     │  1. Call     │
                                       │  2. Call service ─────│────▶│     user->   │
                                       │  3. Auth::login()     │     │     sendEmail│
                                       │  4. Return UserRes.   │     │     Verif.() │
                                       └───────────────────────┘     │  2. Generate │
                                                                      │     Signed  │
                                                                      │     URL     │
                                                                      │  3. Send    │
                                                                      │     email    │
                                                                      └─────────────┘
                                                                             │
                                                                             ▼
                                                                      ┌─────────────┐
                                                                      │  Mailpit     │
                                                                      │  (SMTP)      │
                                                                      │             │
                                                                      │  User sees   │
                                                                      │  email with  │
                                                                      │  "Verify"    │
                                                                      │  button      │
                                                                      └──────┬──────┘
                                                                             │
                                                                    User clicks link
                                                                             │
                                                                             ▼
┌──────────┐     ┌──────────────┐     ┌───────────────────────┐     ┌─────────────┐
│  Browser  │◀───│  /verify-    │────▶│  POST                 │────▶│  EmailVerif. │
│  (React)  │     │  email?      │     │  /api/auth/verify-    │     │  Service     │
│           │     │  id=x&hash=x │     │  email?id=x&hash=x...│     │             │
│  Auto-    │     │  &expires=x  │     │                       │     │  1. Verify   │
│  submits  │     │  &signature=x│     │  EmailVerifController │     │     Hash     │
│  on load  │     └──────────────┘     │  verify()             │     │  2. Mark     │
└──────────┘                          │  1. Validate Sig. ────│────▶│     verified │
                                      └───────────────────────┘     └─────────────┘
```

### 6.2 Password Reset Flow

```
┌──────────┐     ┌──────────────┐     ┌───────────────────────┐     ┌─────────────┐
│  Forgot   │────▶│  POST        │────▶│  PasswordReset        │────▶│  PasswordRst │
│  Password │     │  /forgot-    │     │  Controller::forgot() │     │  Service     │
│  Page     │     │  password    │     │                       │     │             │
└──────────┘     └──────────────┘     └───────────────────────┘     │  1. Call     │
                                                                      │     Password │
                                                                      │     ::sendRes│
                                                                      │     etLink()  │
                                                                      │  2. Native   │
                                                                      │     broker    │
                                                                      │     handles DB│
                                                                      │  3. User->   │
                                                                      │     sendPassw │
                                                                      │     ordReset  │
                                                                      │     Notif.()  │
                                                                      └──────┬──────┘
                                                                             │
                                                                    User clicks link
                                                                             │
                                                                             ▼
┌──────────┐     ┌──────────────┐     ┌───────────────────────┐     ┌─────────────┐
│  Reset    │────▶│  POST        │────▶│  PasswordReset        │────▶│  PasswordRst │
│  Password │     │  /reset-     │     │  Controller::reset()  │     │  Service     │
│  Page     │     │  password    │     │                       │     │             │
│           │     │              │     │  {token, email, pwd}  │     │  1. Call     │
│  token &  │     └──────────────┘     └───────────────────────┘     │     Password │
│  email    │                                                         │     ::reset()  │
│  from URL │                                                         │  2. Native   │
└──────────┘                                                         │     broker    │
                                                                      │     validates│
                                                                      │     & updates│
                                                                      └─────────────┘
```

---

## 7. Edge Cases

### 7.1 Email Verification Edge Cases

| # | Scenario | Expected Behavior |
|---|----------|-------------------|
| EC-VER-01 | User clicks verification link after 60 minutes | Signature is expired → 422 error response → "Send New Verification Email" button shown |
| EC-VER-02 | User clicks same verification link twice | First click: signature valid, marks verified. Second click: signature still valid, but `verifySignedUrl` returns true (already verified). |
| EC-VER-03 | User clicks "Resend" multiple times rapidly | Rate limiter blocks after 2 attempts per 5 minutes per IP+email |
| EC-VER-04 | User clicks old verification link after resending | Old link's signature has not changed, but it points to the same user. If not expired, it still works. |
| EC-VER-05 | Already-verified user requests resend | Backend returns success: "Your email is already verified." No new email sent |
| EC-VER-06 | User navigates to `/verify-email` without query params | STATE 2: shows "Check your inbox" UI (no auto-verification attempted) |
| EC-VER-07 | User tampers with the `id` or `hash` in the URL | Cryptographic signature validation fails → 422 error response |
| EC-VER-08 | SPA proxy alters the domain/host header | Using Relative Signed URLs (`false` parameter) ensures signature validation ignores the host, preventing 419/422 mismatches |
| EC-VER-09 | React Strict Mode double-fires useEffect | `hasProcessed` ref prevents duplicate API calls |

### 7.2 Password Reset Edge Cases

| # | Scenario | Expected Behavior |
|---|----------|-------------------|
| EC-RST-01 | User requests reset for non-existent email | Generic success message returned to prevent email enumeration (Laravel broker handles this natively) |
| EC-RST-02 | User clicks reset link after 60 minutes | Laravel broker rejects token → error: "invalid or has expired" |
| EC-RST-03 | User clicks reset link twice | First click: success (broker deletes token). Second: token consumed → error |
| EC-RST-04 | User navigates to `/reset-password` without params | Page shows "Invalid Link" UI with link to request new reset |
| EC-RST-05 | Token in URL is tampered with | Laravel broker rejects token → error response |

---

## 8. Notes

### 8.1 Development Environment

- **SMTP Server**: Mailpit running on `127.0.0.1:1025` (SMTP) and `127.0.0.1:5000` (Web UI)
- **Frontend Dev Server**: Vite on `http://localhost:5173`
- **Backend Dev Server**: Laravel on `http://localhost:8000`
- **FRONTEND_URL**: Must be set in `.env` to `http://localhost:5173`
- **SESSION_DRIVER**: Must be database or file (NOT cookie). The cookie driver has a 4KB limit which corrupts SPA sessions, causing 401 errors.
- **SESSION_DOMAIN**: Must be set to localhost in .env to ensure cookies are shared properly across the Vite proxy.
- **Database Sessions**: Requires the sessions table (generated via php artisan session:table).
- **Database Password Resets**: Requires the `password_reset_tokens` table (generated via `php artisan make:migration create_password_reset_tokens_table`).

### 8.2 Production Deployment Checklist

- [ ] Update `MAIL_*` env vars for production SMTP (SendGrid, SES, Postmark, etc.)
- [ ] Set `FRONTEND_URL` to production frontend domain
- [ ] Set `APP_URL` to production backend domain
- [ ] Enable HTTPS on both frontend and backend
- [ ] Configure `SANCTUM_STATEFUL_DOMAINS` for production domain
- [ ] Set `SESSION_DOMAIN` to your production domain (e.g., example.com, without https://)
- [ ] Ensure `SESSION_DRIVER` is set to database or redis for production (avoid cookie driver)
- [ ] Consider queueing emails (`ShouldQueue` on Mailables) for performance
- [ ] Add monitoring/alerting for failed email deliveries
- [ ] Set appropriate `SESSION_LIFETIME` in production

### 8.3 Future Enhancements

| Enhancement | Priority | Description |
|-------------|----------|-------------|
| Email Queueing | High | Add `ShouldQueue` to Mailables for async email dispatch |
| Account lockout | Medium | Lock account after N failed login attempts |
| Two-Factor Auth (2FA) | Low | TOTP-based 2FA for enhanced security |
| Magic Link Login | Low | Passwordless login via email link |
| Email change flow | Low | Verify new email before updating |

### 8.4 Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Laravel Signed URLs vs Custom DB Tokens | Leveraging Laravel's native `MustVerifyEmail` and Signed URLs eliminates the need for custom token generation, manual expiration logic, and dedicated database tables (`SentEmailLog`). This is significantly more secure, reduces DB queries, and adheres to KISS/DRY principles. |
| Relative Signed URLs (`false` param) | Generating and validating relative URLs prevents signature invalidation when the SPA proxy alters the host header (common in local dev and reverse-proxy production environments). |
| Laravel Password Broker vs Custom DB Tokens | Delegating to `Password::broker()` natively handles secure token hashing, expiration, and DB cleanup, removing boilerplate code from the service layer. |
| Frontend-first verification | Email link → Frontend route → API call. This ensures the SPA handles all navigation and state consistently. |
| Generic forgot-password response | Industry standard to prevent email enumeration attacks |
| OAuth popup pattern | Avoids full-page redirect which would lose SPA state. Popup completes OAuth flow independently |
| Session-based auth (not tokens) | Sanctum SPA mode with cookies is more secure for same-origin SPAs than Bearer tokens (no XSS token theft risk) |
```