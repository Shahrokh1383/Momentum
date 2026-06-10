# Authentication Module — Backend Documentation

> **Module**: Authentication & Identity Management  
> **Version**: 3.0.0  
> **Last Updated**: 2025-07-XX  
> **Status**: Production-Ready (Real Email Integration)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Business Rules](#2-business-rules)
3. [Backend Architecture](#3-backend-architecture)
4. [API Contract](#4-api-contract)
5. [Backend Process Flows](#5-backend-process-flows)
6. [Edge Cases — Backend](#6-edge-cases--backend)
7. [Development & Deployment Notes](#7-development--deployment-notes)

---

## 1. Overview

### 1.1 Purpose

The backend Authentication module provides secure user identity management for the Momentum Habit Tracker application. It exposes RESTful endpoints for user registration, login, logout, email verification, password reset, and third-party OAuth authentication, relying on session-based Sanctum authentication and Laravel’s native cryptographic tools.

### 1.2 Key Features (Backend)

| Feature | Description |
|---------|-------------|
| **Email/Password Auth** | Registration and login with hashed passwords, session creation, and CSRF protection. |
| **Email Verification** | Real SMTP verification via Laravel’s `MustVerifyEmail` and Temporary Signed URLs. No custom tokens. |
| **Password Reset** | Real SMTP reset using Laravel’s native Password Broker (hashed tokens, `password_reset_tokens` table). |
| **OAuth 2.0** | Google and GitHub social login via Laravel Socialite, returning redirect URLs and processing callbacks. |
| **Session-Based Auth** | Laravel Sanctum (stateful SPA mode) – cookie-based, no API tokens. |
| **Rate Limiting** | Per-IP and per-email throttling on all sensitive endpoints. |
| **Standardised Responses** | All endpoints return JSON via a shared `HasApiResponse` trait. |

### 1.3 Technology Stack (Backend)

| Layer | Technology |
|-------|-----------|
| Framework | Laravel 11 (PHP 8.2+) |
| Authentication Driver | Laravel Sanctum (Stateful SPA) |
| Email Transport | SMTP (Mailpit / any production SMTP) |
| Token & Verification | Laravel Native Signed URLs + Password Broker |
| OAuth | Laravel Socialite |
| Password Hashing | Bcrypt (automatically cast on User model) |
| Session Storage | Database (recommended) |
| CSRF Protection | Laravel’s built-in CSRF middleware |

### 1.4 Architecture Principles

- **SOLID & SRP**: Controllers delegate business logic to dedicated services; each class has a single responsibility.
- **DRY**: Shared `HasApiResponse` trait; reuse of Laravel’s built-in verification and password reset mechanisms.
- **KISS**: The module relies on Laravel’s native features (Signed URLs, Password Broker) instead of custom token tables and manual expiration logic.
- **Security by default**: Passwords are hashed, sessions are regenerated, signed URLs prevent tampering, and rate limiting protects brute-force attacks.

---

## 2. Business Rules

These rules define the expected behaviour of the backend; all API responses and validations are derived from them.

### 2.1 Registration

| Rule | Details |
|------|---------|
| BR-REG-01 | `name` required, max 255 characters |
| BR-REG-02 | `email` must be unique |
| BR-REG-03 | `password` minimum 8 characters, must contain uppercase, lowercase, number, symbol |
| BR-REG-04 | `password_confirmation` must match |
| BR-REG-05 | User is automatically authenticated immediately after registration |
| BR-REG-06 | A verification email is dispatched automatically upon registration |
| BR-REG-08 | Unverified users are blocked from protected routes by the `verified` middleware |

### 2.2 Email Verification

| Rule | Details |
|------|---------|
| BR-VER-01 | Verification uses Laravel Cryptographic Signed URLs; no database token storage required |
| BR-VER-02 | Signed URLs expire after **60 minutes** |
| BR-VER-03 | Tampering with signature parameters invalidates the URL |
| BR-VER-04 | Expired/invalid signature → 422 error response |
| BR-VER-05 | Already-verified users requesting a resend receive a success response, but no email is sent |

### 2.3 Login

| Rule | Details |
|------|---------|
| BR-LOG-01 | Requires valid `email` and `password` |
| BR-LOG-02 | `remember` flag extends session lifetime |
| BR-LOG-03 | Session is regenerated after successful login |
| BR-LOG-04 | Failed login returns generic `Invalid credentials` (no user enumeration) |
| BR-LOG-05 | Login rate-limited to 5 attempts per minute per IP |

### 2.4 Password Reset

| Rule | Details |
|------|---------|
| BR-RST-01 | Tokens generated and managed by Laravel’s native `Password` broker |
| BR-RST-02 | Tokens expire after **60 minutes** (configurable in `config/auth.php`) |
| BR-RST-03 | Tokens stored securely (hashed) in `password_reset_tokens` table |
| BR-RST-04 | Forgot password always returns generic success (no user enumeration) |
| BR-RST-06 | New password must meet the same complexity rules as registration |
| BR-RST-07 | Password automatically hashed via `hashed` cast on User model |

### 2.5 OAuth

| Rule | Details |
|------|---------|
| BR-OA-01 | Supported providers: `google`, `github` |
| BR-OA-03 | If email already exists, existing user is linked to the OAuth provider |
| BR-OA-04 | New OAuth users are created with `email_verified_at` set (trusted provider) |
| BR-OA-05 | OAuth users have a nullable password |
| BR-OA-07 | Unsupported providers return `400 invalid_provider` |

### 2.6 Logout

| Rule | Details |
|------|---------|
| BR-OUT-01 | Session invalidated and CSRF token regenerated |

### 2.7 Rate Limiting

| Limiter | Scope | Limit |
|---------|-------|-------|
| `auth-limiter` | Login & Register | 5 per minute per IP |
| `password-limiter` | Forgot Password & Resend Verification | 2 per 5 minutes per IP+email |
| `reset-limiter` | Reset Password & Verify Email | 5 per minute per IP |
| `api-limiter` | Authenticated endpoints | 60 per minute per user |

---

## 3. Backend Architecture

### 3.1 File Structure

```
app/
├── Http/
│   ├── Controllers/Auth/
│   │   ├── AuthController.php             # register, login, logout, me
│   │   ├── EmailVerificationController.php # verify, resend
│   │   ├── OAuthController.php            # redirect, callback
│   │   └── PasswordResetController.php    # forgot, reset
│   └── Requests/Auth/
│       ├── ForgotPasswordRequest.php
│       ├── LoginRequest.php
│       ├── OAuthCallbackRequest.php
│       ├── RegisterRequest.php
│       └── ResetPasswordRequest.php
├── Mail/
│   ├── VerificationMail.php               # Mailable for email verification
│   └── PasswordResetMail.php              # Mailable for password reset
├── Models/
│   └── User.php                           # Implements MustVerifyEmail
├── Services/Auth/
│   ├── EmailVerificationService.php       # Dispatches notifications, validates signatures
│   ├── OAuthService.php                   # Socialite abstraction
│   └── PasswordResetService.php           # Delegates to Laravel Password Broker
└── Traits/
    └── HasApiResponse.php                 # Standardised JSON responses

resources/views/emails/
├── verify-email.blade.php
└── reset-password.blade.php

routes/api/
└── auth.php                               # All auth routes
```

### 3.2 Controller Responsibilities (SRP)

| Controller | Methods | Responsibility |
|-----------|---------|---------------|
| `AuthController` | `register`, `login`, `logout`, `me` | Credential auth & session management |
| `EmailVerificationController` | `verify`, `resend` | Signature validation & email verification |
| `PasswordResetController` | `forgot`, `reset` | Password reset orchestration |
| `OAuthController` | `redirect`, `callback` | OAuth flow orchestration |

> Controllers contain **no business logic**. They validate input, delegate to services, and return formatted responses.

### 3.3 Service Responsibilities (SRP)

| Service | Responsibility |
|---------|---------------|
| `EmailVerificationService` | Triggers `sendEmailVerificationNotification` on the User, verifies URL signatures, marks email as verified |
| `PasswordResetService` | Delegates to Laravel’s `Password` broker (`sendResetLink`, `reset`) |
| `OAuthService` | Validates provider names, generates Socialite redirect URLs, retrieves social user data from callbacks |

### 3.4 Native Token & Verification Mechanisms

| Mechanism | Implementation |
|-----------|---------------|
| **Email Verification** | `User` model implements `MustVerifyEmail`. It overrides `sendEmailVerificationNotification()` to generate a **Relative Temporary Signed Route** (`URL::temporarySignedRoute(..., false)`). This ensures signature validation succeeds even when a reverse proxy or SPA proxy modifies the host header. |
| **Signature Validation** | In `EmailVerificationController`, `URL::hasValidSignature($request, false)` validates the URL. No database lookups are required. |
| **Password Reset** | Uses Laravel’s `Password` facade (`Illuminate\Support\Facades\Password`). Tokens are automatically created, hashed, stored in `password_reset_tokens`, and pruned by the framework. |

---

## 4. API Contract

All endpoints are prefixed with `/api/auth`. Responses use the `HasApiResponse` trait format.

### 4.1 Endpoints

#### `POST /api/auth/register`

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

**Success** `201`:
```json
{
  "success": true,
  "message": "Registration successful. Please check your email to verify your account.",
  "data": { /* UserResource */ }
}
```

**Error** `422`:
```json
{
  "message": "The email has already been taken.",
  "errors": { "email": ["The email has already been taken."] }
}
```

---

#### `POST /api/auth/login`

**Rate Limit**: `auth-limiter`

**Request**:
```json
{
  "email": "john@example.com",
  "password": "SecureP@ss1",
  "remember": true
}
```

**Success** `200`:
```json
{
  "success": true,
  "message": "Login successful",
  "data": { /* UserResource with subscription info */ }
}
```

**Error** `401`:
```json
{
  "success": false,
  "error": "authentication_failed",
  "message": "Invalid credentials"
}
```

---

#### `POST /api/auth/forgot-password`

**Rate Limit**: `password-limiter` (2/5min per IP+email)

**Request**:
```json
{
  "email": "john@example.com"
}
```

**Success** `200` (always):
```json
{
  "success": true,
  "message": "If an account with that email exists, a password reset link has been sent.",
  "data": null
}
```

---

#### `POST /api/auth/reset-password`

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

**Success** `200`:
```json
{
  "success": true,
  "message": "Password reset successfully. You can now log in with your new password.",
  "data": null
}
```

**Error** `422`:
```json
{
  "success": false,
  "error": "invalid_token",
  "message": "The password reset link is invalid or has expired. Please request a new one."
}
```

---

#### `POST /api/auth/verify-email?id=xxx&hash=xxx&expires=xxx&signature=xxx`

**Rate Limit**: `reset-limiter`

**Query parameters** (from Signed URL): `id`, `hash`, `expires`, `signature` (mandatory). Request body is ignored.

**Success** `200`:
```json
{
  "success": true,
  "message": "Email verified successfully. You can now access your account.",
  "data": null
}
```

**Error** `422`:
```json
{
  "success": false,
  "error": "invalid_token",
  "message": "The verification link is invalid or has expired. Please request a new one."
}
```

---

#### `POST /api/auth/verify-email/resend`

**Rate Limit**: `password-limiter`

**Request**:
```json
{
  "email": "john@example.com"
}
```

**Success** `200`:
```json
{
  "success": true,
  "message": "Verification email sent. Please check your inbox.",
  "data": null
}
```

---

#### `GET /api/auth/oauth/{provider}`

**Success** `200`:
```json
{
  "success": true,
  "message": "OAuth URL generated",
  "data": { "url": "https://accounts.google.com/o/oauth2/auth?..." }
}
```

**Error** `400`:
```json
{
  "success": false,
  "error": "invalid_provider",
  "message": "Unsupported OAuth provider: twitter"
}
```

---

#### `POST /api/auth/oauth/{provider}/callback`

**Request**:
```json
{
  "code": "4/0AX4XfW..."
}
```

**Success** `200`:
```json
{
  "success": true,
  "message": "OAuth login successful",
  "data": { /* UserResource */ }
}
```

---

#### `POST /api/user/logout` (Authenticated)

**Success** `200`:
```json
{
  "success": true,
  "message": "Logged out successfully",
  "data": null
}
```

#### `GET /api/user/me` (Authenticated, Verified)

**Success** `200`: UserResource.

---

## 5. Backend Process Flows

### 5.1 Registration + Email Verification (Backend View)

```
POST /register
      │
      ▼
AuthController::register()
  1. Validate input (RegisterRequest)
  2. Create User (DB)
  3. Call EmailVerificationService to send verification notification
     └─ User::sendEmailVerificationNotification()
         └─ Generates Relative Signed URL (60-min expiry)
         └─ Dispatches VerificationMail (SMTP)
  4. Auth::login($user) → session created
  5. Return UserResource (201)
```

```
User clicks link → Frontend POSTs /api/auth/verify-email?id=...&hash=...&expires=...&signature=...
      │
      ▼
EmailVerificationController::verify($request)
  1. URL::hasValidSignature($request, false) → checks expiry & integrity
  2. If invalid → 422
  3. Find user by `id` from query
  4. If already verified → success (no-op)
  5. Mark email_verified_at = now()
  6. Return 200
```

### 5.2 Password Reset (Backend View)

```
POST /forgot-password
      │
      ▼
PasswordResetController::forgot($request)
  1. Validate email
  2. PasswordResetService::sendResetLink(email)
       └─ Password::sendResetLink() (Laravel broker)
           └─ Generates token, stores hashed in password_reset_tokens
           └─ Dispatches PasswordResetMail with link containing token
  3. Return generic success (200)
```

```
POST /reset-password
      │
      ▼
PasswordResetController::reset($request)
  1. Validate token, email, password, password_confirmation
  2. PasswordResetService::reset(credentials)
       └─ Password::reset() (Laravel broker)
           └─ Validates token hash, expiry
           └─ Updates user password (auto-hashed via model cast)
           └─ Deletes used token
  3. Return 200 or 422 (invalid/expired token)
```

---

## 6. Edge Cases — Backend

| # | Scenario | Expected Behaviour |
|---|----------|-------------------|
| EC-VER-01 | Verification link accessed after 60 minutes | Signed URL expired → `hasValidSignature` fails → 422 response |
| EC-VER-02 | Same verification link clicked twice | First: marks verified. Second: user already verified → still returns 200 (no error) |
| EC-VER-03 | Rapid resend requests | Rate limiter blocks after 2 attempts per 5 minutes → 429 |
| EC-VER-04 | Old verification link after resend | Signature unchanged; if not expired, still works |
| EC-VER-05 | Already-verified user requests resend | Backend detects `email_verified_at` not null → returns 200 without sending email |
| EC-VER-07 | URL `id` or `hash` tampered | Cryptographic signature validation fails → 422 |
| EC-VER-08 | Host header altered by proxy | Relative Signed URL (`false` flag) ignores host → validation succeeds |
| EC-RST-01 | Forgot password for non-existent email | Generic success message (no 404) – Laravel broker handles this natively |
| EC-RST-02 | Reset link after 60 minutes | Broker rejects expired token → 422 |
| EC-RST-03 | Reset link used twice | First succeeds (token consumed). Second: token not found → 422 |
| EC-RST-05 | Token parameter tampered | Broker rejects → 422 |
| EC-LOG-01 | 5 failed login attempts from same IP | Rate limiter triggers → 429 for subsequent attempts within the minute |

---

## 7. Development & Deployment Notes

### 7.1 Development Environment
- **SMTP**: Mailpit on `127.0.0.1:1025` (SMTP) / `127.0.0.1:5000` (UI)
- **Backend Dev Server**: `http://localhost:8000`
- **SESSION_DRIVER**: **Must be `database`** (or file/redis). Never use `cookie` – the 4 KB limit corrupts SPA sessions.
- **SESSION_DOMAIN**: Set to `localhost` in `.env` for cross-origin cookies via Vite proxy.
- **Database Tables**: Sessions (`php artisan session:table`) and `password_reset_tokens` (default migration) must exist.
- **FRONTEND_URL**: Must point to the frontend dev server (`http://localhost:5173`).

### 7.2 Production Deployment Checklist
- [ ] Configure production SMTP (`MAIL_*` env)
- [ ] Set `FRONTEND_URL` and `APP_URL` to production domains
- [ ] Enforce HTTPS on both frontend and backend
- [ ] Configure `SANCTUM_STATEFUL_DOMAINS` for production SPA domain
- [ ] Set `SESSION_DOMAIN` to the production domain (e.g., `example.com`)
- [ ] Use `SESSION_DRIVER=database` or `redis` (not `cookie`)
- [ ] Set `SESSION_LIFETIME` appropriately
- [ ] Consider queueing emails (`ShouldQueue` on Mailables) for performance
- [ ] Add monitoring for failed email deliveries

### 7.3 Future Enhancements
| Enhancement | Priority | Description |
|-------------|----------|-------------|
| Email Queueing | High | Add `ShouldQueue` to Mailables |
| Account Lockout | Medium | Lock account after N failed attempts |
| Two-Factor Auth | Low | TOTP-based 2FA |
| Magic Link Login | Low | Passwordless login |
| Email Change Flow | Low | Verify new email before updating |

### 7.4 Key Design Decisions
| Decision | Rationale |
|----------|-----------|
| Laravel Signed URLs over custom DB tokens | Eliminates custom token tables, manual expiry logic, and reduces DB queries; significantly more secure. |
| Relative Signed URLs (`false` param) | Prevents signature mismatch when the SPA proxy or load balancer alters the host header. |
| Laravel Password Broker over custom logic | Native handling of token hashing, expiration, and cleanup – reduces boilerplate and risk of implementation errors. |

---

**Frontend Documentation**

---

# Authentication Module — Frontend Documentation

> **Module**: Authentication & Identity Management  
> **Version**: 3.0.0  
> **Last Updated**: 2025-07-XX  
> **Status**: Production-Ready

---

## Table of Contents

1. [Overview](#1-overview)
2. [Business Rules — Frontend Perspective](#2-business-rules--frontend-perspective)
3. [Frontend Architecture](#3-frontend-architecture)
4. [API Integration Summary](#4-api-integration-summary)
5. [User Flows & State Machines](#5-user-flows--state-machines)
6. [Edge Cases — Frontend](#6-edge-cases--frontend)
7. [Development Notes](#7-development-notes)

---