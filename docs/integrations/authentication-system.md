# 1. Authentication Module Documentation

---

## 📄 `docs/modules/authentication.md`

```markdown
# Authentication Module — Technical Documentation

> **Module**: Authentication & Identity Management
> **Version**: 2.0.0
> **Last Updated**: 2025-07-XX
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
8. [Tests](#8-tests)
9. [Notes](#9-notes)

---

## 1. Overview

### 1.1 Purpose

The Authentication module provides secure user identity management for the Momentum Habit Tracker application. It handles user registration, login, logout, email verification, password reset, and third-party OAuth authentication.

### 1.2 Key Features

| Feature | Description |
|---------|-------------|
| **Email/Password Auth** | Traditional credential-based registration and login |
| **Email Verification** | Real SMTP-based email verification with tokenized links |
| **Password Reset** | Real SMTP-based password reset flow with secure tokens |
| **OAuth 2.0** | Google and GitHub social login via popup window |
| **Session-Based Auth** | Laravel Sanctum SPA authentication (cookie-based, no Bearer tokens) |
| **Rate Limiting** | Per-IP and per-email throttling on sensitive endpoints |

### 1.3 Technology Stack

| Layer | Technology |
|-------|-----------|
| Backend Framework | Laravel 11 (PHP 8.2+) |
| Authentication | Laravel Sanctum (Stateful SPA mode) |
| Email Transport | SMTP (Mailpit for development, any SMTP for production) |
| OAuth Provider | Laravel Socialite |
| Frontend Framework | React 18 + TypeScript |
| State Management | Zustand (authStore) |
| Server State | TanStack React Query v5 |
| Form Handling | React Hook Form + Zod validation |
| HTTP Client | Axios with XSRF cookie support |
| Routing | React Router v6 |

### 1.4 Architecture Principles

- **SOLID**: Each service has a single, well-defined responsibility
- **SRP**: Controllers delegate to services; services handle business logic
- **DRY**: Shared `HasApiResponse` trait for consistent JSON responses
- **KISS**: Simple token-based verification without over-engineering
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
| BR-VER-01 | Verification tokens are 64-character random strings |
| BR-VER-02 | Tokens expire after **60 minutes** from creation |
| BR-VER-03 | Only one active verification token exists per email at any time |
| BR-VER-04 | Old tokens are invalidated when a new one is generated |
| BR-VER-05 | Tokens are single-use — deleted immediately after successful verification |
| BR-VER-06 | Expired tokens are deleted upon verification attempt |
| BR-VER-07 | Already-verified users who request resend receive a success message without new email |
| BR-VER-08 | Verification link redirects to frontend route: `/verify-email?token=xxx&email=xxx` |
| BR-VER-09 | Frontend automatically submits token to backend API upon page load |

### 2.3 Login

| Rule | Details |
|------|---------|
| BR-LOG-01 | Login requires valid email and password |
| BR-LOG-02 | "Remember me" extends session duration |
| BR-LOG-03 | Session is regenerated on successful login (session fixation prevention) |
| BR-LOG-04 | Failed login returns generic "Invalid credentials" message (no email enumeration) |
| BR-LOG-05 | Login is rate-limited to 5 attempts per minute per IP |

### 2.4 Password Reset

| Rule | Details |
|------|---------|
| BR-RST-01 | Reset tokens are 64-character random strings |
| BR-RST-02 | Tokens expire after **60 minutes** from creation |
| BR-RST-03 | Only one active reset token exists per email at any time |
| BR-RST-04 | Old tokens are invalidated when a new one is generated |
| BR-RST-05 | Tokens are single-use — deleted after password is reset |
| BR-RST-06 | Forgot password always returns generic success (prevents email enumeration) |
| BR-RST-07 | Reset link redirects to frontend: `/reset-password?token=xxx&email=xxx` |
| BR-RST-08 | New password must meet the same complexity rules as registration |
| BR-RST-09 | Password is automatically hashed via the `hashed` cast on the User model |

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
| BR-OUT-01 | Session is invalidated and CSRF token is regenerated |
| BR-OUT-02 | Frontend clears all state (Zustand store + React Query cache) |
| BR-OUT-03 | User is redirected to `/login` |

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
├── Enums/
│   ├── EmailType.php              # PASSWORD_RESET | EMAIL_VERIFICATION
│   └── UserRole.php               # USER | ADMIN
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
│   ├── User.php                   # Authenticatable model
│   └── SentEmailLog.php           # Token storage for emails
├── Services/Auth/
│   ├── EmailVerificationService.php  # Token CRUD + email dispatch
│   ├── OAuthService.php              # Socialite abstraction
│   └── PasswordResetService.php      # Token CRUD + email dispatch
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
| `AuthController` | `register`, `login`, `logout`, `me` | Credential auth + session management |
| `EmailVerificationController` | `verify`, `resend` | Email verification orchestration |
| `PasswordResetController` | `forgot`, `reset` | Password reset orchestration |
| `OAuthController` | `redirect`, `callback` | OAuth flow orchestration |

> **Key Principle**: Controllers do NOT contain business logic. They delegate to services and return responses.

### 3.3 Service Responsibilities (SRP)

| Service | Responsibility |
|---------|---------------|
| `EmailVerificationService` | Generate tokens, persist to `SentEmailLog`, send `VerificationMail`, validate & consume tokens |
| `PasswordResetService` | Generate tokens, persist to `SentEmailLog`, send `PasswordResetMail`, validate & consume tokens |
| `OAuthService` | Validate providers, generate Socialite redirect URLs, retrieve social user data |

### 3.4 Token Storage Model

The `SentEmailLog` model serves as the token storage mechanism:

| Column | Type | Purpose |
|--------|------|---------|
| `id` | bigint | Primary key |
| `recipient_email` | string | Target email address |
| `subject` | string | Email subject line |
| `body` | text | Full URL sent in email |
| `token` | string | 64-char verification/reset token |
| `type` | enum | `email_verification` or `password_reset` |
| `created_at` | timestamp | Used for expiration calculation |

### 3.5 Email Templates

Both templates use a consistent dark-themed design matching the Momentum brand:
- Gradient header with app branding
- Clear call-to-action button
- Expiration time warning
- Fallback URL for email clients that don't render buttons
- Footer with copyright

### 3.6 Security Measures

| Measure | Implementation |
|---------|---------------|
| Password hashing | Automatic via `'password' => 'hashed'` cast |
| Session fixation | `$request->session()->regenerate()` after login/register |
| Session invalidation | `invalidate()` + `regenerateToken()` on logout |
| CSRF protection | Sanctum stateful middleware + XSRF-TOKEN cookie |
| Token expiration | 60-minute TTL enforced in services |
| Single-use tokens | Deleted from DB after consumption |
| One active token | Previous tokens deleted before issuing new ones |
| Email enumeration prevention | Generic messages on forgot-password |
| Rate limiting | IP-based and email-based throttling |

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
│   └── authStore.ts               # Zustand store: user, isAuthenticated, isPremium
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
    └── user.ts                    # TypeScript interfaces
```

### 4.2 State Management Strategy

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  React Query     │────▶│  authStore    │────▶│  Components     │
│  (Server State)  │     │  (Zustand)    │     │  (UI State)     │
│                  │     │              │     │                 │
│  - currentUser   │     │  - user      │     │  - form errors  │
│  - mutations     │     │  - isAuth    │     │  - loading      │
│                  │     │  - isPremium │     │  - messages     │
└─────────────────┘     └──────────────┘     └─────────────────┘
```

| Layer | Tool | Responsibility |
|-------|------|---------------|
| Server State | React Query | Fetching user, mutation lifecycle, cache invalidation |
| Client State | Zustand | Current user object, authentication status, premium flag |
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
URL has token + email?
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

**Success Response** `201`:
```json
{
  "success": true,
  "message": "Registration successful. Please check your email to verify your account.",
  "data": {
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

Authenticate a user with credentials.

**Rate Limit**: `auth-limiter` (5/min per IP)

**Request**:
```json
{
  "email": "john@example.com",
  "password": "SecureP@ss1",
  "remember": true
}
```

**Success Response** `200`:
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

#### `POST /api/auth/verify-email`

Verify user's email address using token from email link.

**Rate Limit**: `reset-limiter` (5/min per IP)

**Request**:
```json
{
  "token": "abc123...",
  "email": "john@example.com"
}
```

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
                                       │  1. Create User (DB)  │     │  1. Delete   │
                                       │  2. Call service ─────│────▶│     old tkn  │
                                       │  3. Auth::login()     │     │  2. Generate │
                                       │  4. Return UserRes.   │     │     64-char  │
                                       └───────────────────────┘     │  3. Persist  │
                                                                      │     to DB    │
                                                                      │  4. Send     │
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
│           │     │  token=xxx   │     │  email                │     │             │
│  Auto-    │     │  &email=xxx  │     │                       │     │  1. Find tkn │
│  submits  │     └──────────────┘     │  EmailVerifController │     │  2. Check    │
│  on load  │                          │  verify()             │     │     expiry   │
└──────────┘                          └───────────────────────┘     │  3. Mark     │
                                                                      │     verified │
                                                                      │  4. Delete   │
                                                                      │     token    │
                                                                      └─────────────┘
```

### 6.2 Password Reset Flow

```
┌──────────┐     ┌──────────────┐     ┌───────────────────────┐     ┌─────────────┐
│  Forgot   │────▶│  POST        │────▶│  PasswordReset        │────▶│  PasswordRst │
│  Password │     │  /forgot-    │     │  Controller::forgot() │     │  Service     │
│  Page     │     │  password    │     │                       │     │             │
└──────────┘     └──────────────┘     └───────────────────────┘     │  1. Delete   │
                                                                      │     old tkn  │
                                                                      │  2. Generate │
                                                                      │  3. Persist  │
                                                                      │  4. Send     │
                                                                      │     email    │
                                                                      └──────┬──────┘
                                                                             │
                                                                    User clicks link
                                                                             │
                                                                             ▼
┌──────────┐     ┌──────────────┐     ┌───────────────────────┐     ┌─────────────┐
│  Reset    │────▶│  POST        │────▶│  PasswordReset        │────▶│  PasswordRst │
│  Password │     │  /reset-     │     │  Controller::reset()  │     │  Service     │
│  Page     │     │  password    │     │                       │     │             │
│           │     │              │     │  {token, email, pwd}  │     │  1. Find tkn │
│  token &  │     └──────────────┘     └───────────────────────┘     │  2. Check    │
│  email    │                                                         │     expiry   │
│  from URL │                                                         │  3. Update   │
└──────────┘                                                         │     password │
                                                                      │  4. Delete   │
                                                                      │     token    │
                                                                      └─────────────┘
```

### 6.3 OAuth Flow (Popup)

```
┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│  Login Page   │     │  Backend    │     │  Google/     │
│  (main window)│     │  API        │     │  GitHub      │
└──────┬───────┘     └──────┬──────┘     └──────┬───────┘
       │                     │                    │
       │ GET /oauth/google   │                    │
       │────────────────────▶│                    │
       │                     │                    │
       │  { url: "..." }     │                    │
       │◀────────────────────│                    │
       │                     │                    │
       │ window.open(url)    │                    │
       │─────────────────────│───────────────────▶│
       │                     │                    │
       │                     │   redirect with    │
       │                     │   ?code=xxx        │
       │                     │◀───────────────────│
       │                     │                    │
       │ ┌─────────────────┐ │                    │
       │ │  Popup Window    │ │                    │
       │ │  /auth/callback/ │ │                    │
       │ │  google?code=xxx │ │                    │
       │ │                  │ │                    │
       │ │ POST /oauth/     │ │                    │
       │ │ google/callback  │─│───▶ Exchange code  │
       │ │ { code: "xxx" }  │ │    for user data   │
       │ │                  │ │                    │
       │ │ postMessage(     │ │                    │
       │ │  'oauth-success')│ │                    │
       │ │ window.close()   │ │                    │
       │ └────────┬─────────┘ │                    │
       │          │            │                    │
       │◀─────────┘            │                    │
       │ (receives message)    │                    │
       │                       │                    │
       │ invalidateQueries()   │                    │
       │ navigate('/dashboard')│                    │
       └───────────────────────┘                    │
```

---

## 7. Edge Cases

### 7.1 Email Verification Edge Cases

| # | Scenario | Expected Behavior |
|---|----------|-------------------|
| EC-VER-01 | User clicks verification link after 60 minutes | Token is expired → deleted from DB → error response → "Send New Verification Email" button shown |
| EC-VER-02 | User clicks same verification link twice | First click: success. Second click: token not found → error response |
| EC-VER-03 | User clicks "Resend" multiple times rapidly | Rate limiter blocks after 2 attempts per 5 minutes per IP+email |
| EC-VER-04 | User clicks old verification link after resending | Old token was deleted when new one was generated → error response |
| EC-VER-05 | Already-verified user clicks verification link | Token not found (was deleted on first verify) → error, but user is already verified so no impact |
| EC-VER-06 | Already-verified user requests resend | Backend returns success: "Your email is already verified." No new email sent |
| EC-VER-07 | User navigates to `/verify-email` without query params | STATE 2: shows "Check your inbox" UI (no auto-verification attempted) |
| EC-VER-08 | User navigates to `/verify-email?token=invalid&email=x` | Auto-verification fails → error UI with resend button |
| EC-VER-09 | React Strict Mode double-fires useEffect | `hasProcessed` ref prevents duplicate API calls |

### 7.2 Password Reset Edge Cases

| # | Scenario | Expected Behavior |
|---|----------|-------------------|
| EC-RST-01 | User requests reset for non-existent email | `ForgotPasswordRequest` validates `exists:users,email` → 422 validation error. However, the generic success message in the controller prevents enumeration at the response level |
| EC-RST-02 | User clicks reset link after 60 minutes | Token expired → deleted → error: "invalid or has expired" |
| EC-RST-03 | User clicks reset link twice | First click: success. Second: token consumed → error |
| EC-RST-04 | User requests multiple resets, clicks oldest link | Old token was deleted when newest was created → error |
| EC-RST-05 | User navigates to `/reset-password` without params | Page shows "Invalid Link" UI with link to request new reset |
| EC-RST-06 | Token in URL is tampered with | Token not found in DB → error response |

### 7.3 OAuth Edge Cases

| # | Scenario | Expected Behavior |
|---|----------|-------------------|
| EC-OA-01 | User registers via email, then logs in via Google (same email) | Existing user is updated with `provider` and `provider_id`. No duplicate created |
| EC-OA-02 | User closes popup before completing OAuth | Timer detects `popup.closed` → clears loading state in parent window |
| EC-OA-03 | OAuth provider returns no email | User creation fails → `oauth_failed` error returned |
| EC-OA-04 | Unsupported provider in URL (e.g., `/oauth/twitter`) | `OAuthService` throws `InvalidArgumentException` → 400 response |
| EC-OA-05 | OAuth code is invalid or expired | Socialite throws exception → `oauth_failed` 401 response |
| EC-OA-06 | User opens OAuth link directly (not in popup) | No `window.opener` → fallback: navigate to `/dashboard` directly |

### 7.4 Session & Auth Edge Cases

| # | Scenario | Expected Behavior |
|---|----------|-------------------|
| EC-AUTH-01 | Session expires while user is on protected page | Next API call returns 401 → `ProtectedRoute` detects `!isAuthenticated` → redirects to `/login` |
| EC-AUTH-02 | User opens app in new tab | React Query `currentUser` query runs → `getMe()` → restores auth state from session cookie |
| EC-AUTH-03 | CSRF token mismatch | Sanctum returns 419 → Axios can retry with fresh `csrf-cookie` |
| EC-AUTH-04 | User accesses `/login` while already authenticated | Currently no guard — user sees login form (could be enhanced with redirect) |


---

## 9. Notes

### 9.1 Development Environment

- **SMTP Server**: Mailpit running on `127.0.0.1:1025` (SMTP) and `127.0.0.1:8025` (Web UI)
- **Frontend Dev Server**: Vite on `http://localhost:5173`
- **Backend Dev Server**: Laravel on `http://localhost:8000`
- **FRONTEND_URL**: Must be set in `.env` to `http://localhost:5173`

### 9.2 Production Deployment Checklist

- [ ] Update `MAIL_*` env vars for production SMTP (SendGrid, SES, Postmark, etc.)
- [ ] Set `FRONTEND_URL` to production frontend domain
- [ ] Set `APP_URL` to production backend domain
- [ ] Enable HTTPS on both frontend and backend
- [ ] Configure `SANCTUM_STATEFUL_DOMAINS` for production domain
- [ ] Set `SESSION_DOMAIN` for cookie sharing
- [ ] Consider queueing emails (`ShouldQueue` on Mailables) for performance
- [ ] Add monitoring/alerting for failed email deliveries
- [ ] Set appropriate `SESSION_LIFETIME` in production

### 9.3 Future Enhancements

| Enhancement | Priority | Description |
|-------------|----------|-------------|
| Email Queueing | High | Add `ShouldQueue` to Mailables for async email dispatch |
| Login redirect guard | Medium | Redirect authenticated users away from `/login` and `/register` |
| Account lockout | Medium | Lock account after N failed login attempts |
| Two-Factor Auth (2FA) | Low | TOTP-based 2FA for enhanced security |
| Magic Link Login | Low | Passwordless login via email link |
| Email change flow | Low | Verify new email before updating |
| Token hashing | Medium | Hash tokens in DB (store SHA-256, compare on verify) |
| Login activity log | Low | Track login timestamps, IPs, user agents |

### 9.4 Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Custom token system vs Laravel's built-in `VerifiesEmail` | Full control over UX, frontend URL structure, and token lifecycle. Laravel's built-in system uses signed URLs that hit the backend directly, which doesn't fit the SPA architecture |
| `SentEmailLog` as token storage | Reuses existing table; keeps email audit trail. Avoids additional migration |
| Frontend-first verification | Email link → Frontend route → API call. This ensures the SPA handles all navigation and state consistently |
| 64-char tokens | Sufficient entropy (roughly 384 bits). Unfeasible to brute-force within the 60-minute window |
| Always delete old tokens | Prevents token accumulation and ensures only the latest token is valid |
| Generic forgot-password response | Industry standard to prevent email enumeration attacks |
| OAuth popup pattern | Avoids full-page redirect which would lose SPA state. Popup completes OAuth flow independently |
| Session-based auth (not tokens) | Sanctum SPA mode with cookies is more secure for same-origin SPAs than Bearer tokens (no XSS token theft risk) |
```