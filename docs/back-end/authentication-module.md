
## **Backend Documentation** — Authentication Module

```markdown
# Momentum Authentication — Backend Documentation

> **Version**: 2.0.0  
> **Stack**: Laravel 11, PHP 8.2+, Sanctum (Stateful SPA), MySQL/PostgreSQL  
> **Status**: Production-Ready (Real SMTP integration)

## Table of Contents
1. [Overview](#overview)
2. [Business Rules (Server-Enforced)](#business-rules)
3. [Architecture & File Structure](#architecture--file-structure)
4. [Controllers & Route Definitions](#controllers--route-definitions)
5. [Services & Business Logic](#services--business-logic)
6. [Mail & Templates](#mail--templates)
7. [Token Storage Model](#token-storage-model)
8. [API Contract (All Endpoints)](#api-contract)
9. [Flow Diagrams (Backend Perspective)](#flow-diagrams)
10. [Security & Middleware](#security--middleware)
11. [Rate Limiting Configuration](#rate-limiting-configuration)
12. [Edge Cases & Error Handling](#edge-cases--error-handling)
13. [Testing Recommendations](#testing-recommendations)
14. [Deployment & Environment](#deployment--environment)
15. [Future Enhancements](#future-enhancements)

---

## Overview

The backend authentication system provides a secure, session-based identity layer for the Momentum SPA. All endpoints live under `/api/auth` (guest) and `/api/user` (authenticated). The module uses:

- **Laravel Sanctum** (stateful cookie mode) for authentication — no Bearer tokens.
- **SMTP** via Mailpit (dev) or any production provider for real transactional emails.
- **Socialite** for OAuth2 with Google and GitHub.
- A custom token store (`SentEmailLog`) for email verification and password reset tokens.

---

## Business Rules (Server-Enforced)

Rules are validated server-side, never trusted from the client.

### Registration
| ID | Rule |
|----|------|
| REG-01 | Name required, max 255 characters |
| REG-02 | Email unique across all users |
| REG-03 | Password min 8 chars, mixed case, numbers, symbols |
| REG-04 | Password confirmation must match |
| REG-05 | User auto-logged-in immediately after registration |
| REG-06 | Verification email sent automatically (real SMTP) |
| REG-07 | Unverified users blocked from protected routes (`verified` middleware) |

### Email Verification
| ID | Rule |
|----|------|
| VER-01 | 64-char random token, hashed in DB? (currently plaintext — see future hashing) |
| VER-02 | Token expires after 60 minutes |
| VER-03 | Only one active token per email; old ones deleted on new generation |
| VER-04 | Single-use: token deleted after successful verification |
| VER-05 | Already-verified user requesting resend → success without email |
| VER-06 | Expired token → deleted and error returned |

### Login
| ID | Rule |
|----|------|
| LOG-01 | Valid email + password required |
| LOG-02 | Session regeneration on login (anti-fixation) |
| LOG-03 | Generic "Invalid credentials" error (prevents enumeration) |
| LOG-04 | Rate limited: 5/min per IP |

### Password Reset
| ID | Rule |
|----|------|
| RST-01 | 64-char token, 60-min expiry |
| RST-02 | One active token per email; old ones pruned |
| RST-03 | Token single-use; consumed after password change |
| RST-04 | Forgot password always returns generic success |
| RST-05 | New password must meet same complexity rules |

### OAuth
| ID | Rule |
|----|------|
| OA-01 | Supported providers: Google, GitHub |
| OA-02 | If email exists, link OAuth to existing user |
| OA-03 | New OAuth users marked `email_verified_at` immediately |
| OA-04 | OAuth users have nullable password; cannot use forgot-password |
| OA-05 | Unsupported provider → 400 error |

### Logout
| ID | Rule |
|----|------|
| OUT-01 | Session invalidated, CSRF token regenerated |

---

## Architecture & File Structure

```
app/
├── Enums/
│   ├── EmailType.php          # 'email_verification', 'password_reset'
│   └── UserRole.php           # 'user', 'admin'
├── Http/
│   ├── Controllers/Auth/
│   │   ├── AuthController.php         # register, login, logout, me
│   │   ├── EmailVerificationController.php
│   │   ├── OAuthController.php
│   │   └── PasswordResetController.php
│   ├── Requests/Auth/
│   │   ├── ForgotPasswordRequest.php
│   │   ├── LoginRequest.php
│   │   ├── OAuthCallbackRequest.php
│   │   ├── RegisterRequest.php
│   │   └── ResetPasswordRequest.php
│   └── Middleware/
│       └── Verified.php (or via custom middleware group)
├── Mail/
│   ├── VerificationMail.php
│   └── PasswordResetMail.php
├── Models/
│   ├── User.php
│   └── SentEmailLog.php
├── Services/Auth/
│   ├── EmailVerificationService.php
│   ├── OAuthService.php
│   └── PasswordResetService.php
└── Traits/
    └── HasApiResponse.php

routes/api/
└── auth.php (all auth routes)

resources/views/emails/
├── verify-email.blade.php
└── reset-password.blade.php
```

Controllers are thin: they validate input, delegate to services, and return JSON responses via `HasApiResponse`.

---

## Controllers & Route Definitions

### Routes (`api/auth.php`)

```php
// Guest routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [PasswordResetController::class, 'forgot']);
Route::post('/reset-password', [PasswordResetController::class, 'reset']);
Route::post('/verify-email', [EmailVerificationController::class, 'verify']);
Route::post('/verify-email/resend', [EmailVerificationController::class, 'resend']);
Route::get('/oauth/{provider}', [OAuthController::class, 'redirect']);
Route::post('/oauth/{provider}/callback', [OAuthController::class, 'callback']);

// Authenticated routes (require auth:sanctum + verified)
Route::middleware(['auth:sanctum', 'verified'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
});
```

*Note:* The `verified` middleware checks `email_verified_at !== null`.

### Controller Responsibilities

- **AuthController**: User registration (creates user, logs in, dispatches verification), login (attempt, session regen), logout (session invalidate, token regen), `me` (returns current user resource).
- **EmailVerificationController**: `verify` (validate token, mark email verified, delete token), `resend` (delete old tokens, generate new, send mail).
- **PasswordResetController**: `forgot` (find user, generate token, send mail, generic response), `reset` (validate token, update password, delete token).
- **OAuthController**: `redirect` (generate Socialite URL), `callback` (exchange code, find or create user, login).

---

## Services & Business Logic

**Service:** `EmailVerificationService`
- `generateToken(User $user)`: Deletes all previous tokens for that email, creates `SentEmailLog` with `type='email_verification'`, sends `VerificationMail`.
- `verifyToken(string $email, string $token)`: Finds token, checks expiry (60 min), if expired → delete & return error. If valid → mark user email verified, delete token, return success.

**Service:** `PasswordResetService`
- `generateToken(string $email)`: Deletes previous tokens for email, creates `SentEmailLog` with `type='password_reset'`, sends `PasswordResetMail`.
- `resetPassword(string $email, string $token, string $newPassword)`: Validates token, checks expiry, updates user password (auto-hashed by cast), deletes token.

**Service:** `OAuthService`
- `getRedirectUrl(string $provider)`: Validates provider, returns Socialite driver redirect URL (stateless for SPA popup).
- `handleCallback(string $provider, string $code)`: Retrieves user from Socialite, finds existing user by email or creates new, links provider if needed. Returns User.

---

## Mail & Templates

Both mailable classes accept the frontend URL, token, and email address. The email body contains a clickable link structured as:

- Verification: `{FRONTEND_URL}/verify-email?token={token}&email={email}`
- Reset: `{FRONTEND_URL}/reset-password?token={token}&email={email}`

Templates use dark-themed HTML, brand gradient, call-to-action button, fallback URL, and expiration note.

---

## Token Storage Model

`SentEmailLog` schema:

- `id`: bigint primary
- `recipient_email`: string
- `subject`: string
- `body`: text (full email body including URL)
- `token`: string (64-char random)
- `type`: enum('email_verification', 'password_reset')
- `created_at`: timestamp (expiry = created_at + 60 min)

**Important:** Tokens are currently stored in plaintext. For production, consider hashing (SHA-256) before storage and comparing hashes on verification (see Future Enhancements).

---

## API Contract (All Endpoints)

### `POST /api/auth/register`
- **Rate Limit:** `auth-limiter`
- **Body:** `{ name, email, password, password_confirmation }`
- **Success:** `201` with user data, message includes verification instruction.
- **Errors:** `422` validation errors.

### `POST /api/auth/login`
- **Rate Limit:** `auth-limiter`
- **Body:** `{ email, password, remember }`
- **Success:** `200` with user data.
- **Error:** `401` "Invalid credentials".

### `POST /api/auth/forgot-password`
- **Rate Limit:** `password-limiter`
- **Body:** `{ email }`
- **Success:** `200` generic message always returned.

### `POST /api/auth/reset-password`
- **Rate Limit:** `reset-limiter`
- **Body:** `{ token, email, password, password_confirmation }`
- **Success:** `200` on success.
- **Error:** `422` invalid/expired token.

### `POST /api/auth/verify-email`
- **Rate Limit:** `reset-limiter`
- **Body:** `{ token, email }`
- **Success:** `200` email verified.
- **Error:** `422` invalid/expired token.

### `POST /api/auth/verify-email/resend`
- **Rate Limit:** `password-limiter`
- **Body:** `{ email }`
- **Success:** `200` email sent.

### `GET /api/auth/oauth/{provider}`
- **Success:** `{ url: "..." }` OAuth redirect URL.

### `POST /api/auth/oauth/{provider}/callback`
- **Body:** `{ code }`
- **Success:** `200` with user data.
- **Error:** `400` invalid provider, `401` oauth_failed.

### `POST /api/user/logout` (authenticated)
- **Success:** `200`.

### `GET /api/user/me` (authenticated)
- **Success:** `200` full user resource.

---

## Flow Diagrams (Backend Perspective)

### Registration + Verification
```
Client → POST /register
  AuthController::register()
    Validate (RegisterRequest)
    Create User (DB)
    Auth::login(user) → regenerate session
    EmailVerificationService::generateToken(user)
      → delete old tokens
      → create SentEmailLog (token, type)
      → send VerificationMail (SMTP)
    Return UserResource (201)

Client clicks link → Frontend redirects to /verify-email?token=... → auto-calls API:
  POST /verify-email
  EmailVerificationController::verify()
    EmailVerificationService::verifyToken(email, token)
      → find SentEmailLog by email & type
      → if expired → delete, return error
      → if valid → mark user email_verified_at = now(), delete log
      return success
```

### Password Reset
```
POST /forgot-password
  PasswordResetController::forgot()
    Find user by email (if not found, still return success)
    PasswordResetService::generateToken(email)
      → delete old tokens, create new log, send mail
    Return success

POST /reset-password
  PasswordResetController::reset()
    PasswordResetService::resetPassword(email, token, newPwd)
      → find token, check expiry
      → update user password (hashed cast)
      → delete token
    Return success
```

### OAuth Callback
```
Client popup → Google auth → redirect to backend /oauth/google/callback?code=xxx
OAuthController::callback('google', code)
  OAuthService::handleCallback('google', code)
    → Socialite::driver('google')->stateless()->user()
    → if existing user by email → link provider fields, login
    → else create user with email_verified_at = now()
  Auth::login(user)
  Return user resource → popup sends postMessage to opener.
```

---

## Security & Middleware

- **Password Hashing**: Automatic via `'password' => 'hashed'` cast on User model.
- **Session Fixation**: `$request->session()->regenerate()` after login/register.
- **CSRF**: Sanctum stateful middleware checks `X-XSRF-TOKEN` cookie.
- **Email Enumeration Prevention**: Forgot-password always returns success; login returns generic error.
- **Token Expiry**: Enforced in service layer, expired tokens deleted immediately.
- **Single Active Token**: Old tokens deleted before issuing new ones (prevents stale link reuse).
- **Rate Limiting**: Applied per IP and per email.

---

## Rate Limiting Configuration

| Limiter            | Scope                  | Limit              |
|--------------------|------------------------|--------------------|
| `auth-limiter`     | IP                     | 5 per minute       |
| `password-limiter` | IP + email             | 2 per 5 minutes    |
| `reset-limiter`    | IP                     | 5 per minute       |
| `api-limiter`      | Authenticated user ID  | 60 per minute      |

---

## Edge Cases & Error Handling

Refer to the business rules and service logic. Key server-side edge cases:

1. **Expired verification token** → deleted, response `422 invalid_token`.
2. **Token reuse** → second attempt fails (token already deleted).
3. **Already verified user tries resend** → success but no email sent (service checks `email_verified_at`).
4. **Invalid provider** → `400 invalid_provider`.
5. **OAuth callback with missing email** → `oauth_failed` error.
6. **Concurrent token generation** → race condition possible? Not critical; old token deleted before new one inserted.
7. **Session expiration** → Sanctum returns `401 Unauthenticated`, client must redirect.

---

## Testing Recommendations

- Unit tests for services (token generation, expiry checks, deletion).
- Feature tests for all API endpoints with success and error scenarios.
- Mail fake assertions: email sent, correct link structure.
- Rate limiter tests.
- OAuth mocked Socialite tests.

---

## Deployment & Environment

- `MAIL_*`: production SMTP credentials.
- `FRONTEND_URL`: production frontend domain (used in email links).
- `APP_URL`: backend domain.
- `SANCTUM_STATEFUL_DOMAINS`: comma-separated frontend domain.
- `SESSION_DRIVER`: database or redis (never cookie, 4KB limit).
- `SESSION_DOMAIN`: set to `.yourdomain.com` in production, `localhost` in dev.
- `SESSION_LIFETIME`: appropriate minutes.

---

## Future Enhancements

- Token hashing (SHA-256) instead of plaintext.
- Queue mails (`ShouldQueue`) for async sending.
- Account lockout after N failed logins.
- 2FA / WebAuthn.
- Email change verification flow.