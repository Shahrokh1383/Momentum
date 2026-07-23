## Phase 1: Foundation, Auth & PWA Core (Weeks 1–2)

### Database Schema

**New Tables:**

- **`users`**
  - `id` (PK, bigint unsigned, auto_increment)
  - `name` (varchar, 255)
  - `email` (varchar, 255, unique, indexed)
  - `email_verified_at` (timestamp, nullable)
  - `password` (varchar, 255, nullable — null for OAuth users)
  - `role` (enum: `user`, `admin`, default `user`)
  - `provider` (varchar, 50, nullable — e.g., 'google', 'github', 'apple')
  - `provider_id` (varchar, 255, nullable, unique — ID from OAuth provider)
  - `avatar` (varchar, 255, nullable)
  - `profile_visibility` (enum: `public`, `friends_only`, `private`, default `public`)
  - `bio` (text, nullable)
  - `remember_token` (varchar, 100, nullable)
  - `created_at`, `updated_at`

- **`password_reset_tokens`** (Laravel default)

- **`personal_access_tokens`** (Sanctum default)

- **`subscriptions`**
  - `id` (PK)
  - `user_id` (FK → users.id, indexed, cascade on delete)
  - `plan` (enum: `free`, `expert`, `premium`, default `free`)
  - `status` (enum: `active`, `cancelled`, default `active`)
  - `starts_at` (timestamp)
  - `cancelled_at` (timestamp, nullable)
  - `payment_method` (varchar, nullable)
  - `transaction_ref` (UUID, unique)
  - `created_at`, `updated_at`
  - *Architectural Note: `expires_at` is permanently removed. Cancellation triggers an immediate hard revocation of plan benefits.*

- **`plans`** (Feature-gating configuration)
  - `id` (PK)
  - `name` (varchar: "Free", "Expert", "Premium")
  - `slug` (varchar, unique: `free`, `expert`, `premium`)
  - `max_active_habits` (int, default 5 for free, -1 for unlimited)
  - `max_categories` (int, default 3 for free, -1 for unlimited)
  - `max_groups` (int, default 0 for free, 3 for expert, -1 for premium)
  - `max_freezes_per_week` (int, default 0 for free, 3 for expert, 7 for premium)
  - `max_photos_per_log` (int, default 0 for free, 5 for expert, -1 for unlimited)
  - `max_pdfs_per_month` (int, default 1 for free, 10 for expert, -1 for unlimited)
  - `allowed_habit_types` (varchar: `boolean,numeric` for free, `boolean,numeric,timer,checklist` for expert/premium)
  - `has_advanced_analytics` (boolean, default false)
  - `has_predictive_insights` (boolean, default false)
  - `has_smart_reminders` (boolean, default false)
  - `xp_multiplier` (decimal, 3,2, default 1.00)
  - `price_monthly` (decimal, nullable)
  - `price_yearly` (decimal, nullable)
  - `created_at`, `updated_at`

- **`payments`** (Replaces `simulated_payments`)
  - `id` (PK)
  - `user_id` (FK → users.id, indexed)
  - `subscription_id` (FK → subscriptions.id, nullable, indexed)
  - `amount` (decimal, 10, 2)
  - `currency` (varchar, default "USD")
  - `status` (enum: `pending`, `success`, `failed`, default `pending`)
  - `gateway_ref` (varchar, nullable — Transaction ID from Bank Gateway)
  - `payload` (JSON, nullable — stores gateway request/response data)
  - `processed_at` (timestamp, nullable)
  - `created_at`, `updated_at`

- **`user_settings`**
  - `id` (PK)
  - `user_id` (FK → users.id, unique, cascade delete)
  - `timezone` (varchar, default 'UTC')
  - `theme` (enum: `light`, `dark`, `system`, default 'system')
  - `language` (varchar, default 'en')
  - `date_format` (varchar, default 'Y-m-d')
  - `created_at`, `updated_at`

### Backend Logic

- **API Routing Architecture (Context-Based):**
  - `routes/api/auth.php`: Wrapped in `Route::prefix('api/auth')`. Contains login, register, forgot-password, OAuth callbacks, and CSRF token endpoint. (No auth middleware).
  - `routes/api/user.php`: Wrapped in `Route::prefix('api/user')->middleware(['auth:sanctum', 'verified'])`. Contains all user features.
  - `routes/api/admin.php`: Wrapped in `Route::prefix('api/admin')->middleware(['auth:sanctum', 'role:admin'])`.

- **SPA Authentication (Sanctum + HttpOnly Cookies):**
  - Configure `config/sanctum.php` for SPA stateful authentication with `SESSION_DRIVER=cookie`.
  - `AuthController`: `register()`, `login()`, `logout()`, `me()`.
  - Return user object with `active_plan` computed attribute on every auth response.

- **OAuth2 Integration (Google, Apple, GitHub):**
  - `OAuthController` & `OAuthService`: `redirect($provider)` generates OAuth URL. `callback($provider)` exchanges code, finds/creates user by `provider` + `provider_id`, issues Sanctum cookie.

- **Email Verification (Real Email Service):**
  - On `register()`, dispatch `VerificationMail` (Laravel Mailable) via `EmailVerificationService`.
  - `EmailVerificationController::verify($token)`: finds token record, sets `users.email_verified_at = now()`.
  - `verified` middleware applied to the `api/user` route group.

- **Password Reset (Real Email Service):**
  - `PasswordResetController`: `forgot()` uses `PasswordResetService` to dispatch `PasswordResetMail`. `reset()` validates token from email, updates password.

- **RBAC (Role-Based Access Control):**
  - `RoleMiddleware` checking `auth()->user()->role` against allowed roles.
  - **`EnsureTier($tier)` middleware:** Replaces `EnsurePremium`. Checks if user's active subscription plan meets the required tier (`expert` allows expert+premium, `premium` allows premium only). Returns 403 with subscription requirement details.

- **Rate Limiting & Strict Password Validation:** Same as previous iterations.

- **Subscription & Payment Infrastructure (Real Gateway & Hard Cancel):**
  - `SubscriptionController` & `SubscriptionService`: `current()` returns active subscription.
  - `upgrade(plan_slug)`: Creates `payments` record with `status = pending`, dispatches `ProcessPaymentJob`.
  - `ProcessPaymentJob` calls `PaymenterService` to interact with the real Bank Gateway API. On success, updates `payments.status = success`, updates `subscriptions.plan` to target plan, dispatches `SubscriptionConfirmedMail`. On failure, marks `payments.status = failed`.
  - **`cancel()` (Hard Cancel):** Sets `subscriptions.cancelled_at = now()`, `subscriptions.status = cancelled`, and **immediately reverts `subscriptions.plan` to `free`**. The user loses all paid features instantly.

- **Feature Gating (3-Tier System):**
  - `PlanQuotaService`: central service checking limits against the user's active plan. Methods: `canCreateHabit($user)`, `canCreateCategory($user)`, `canJoinGroup($user)`, `canUploadPhoto($user)`, `canGeneratePdf($user)`, `canUseHabitType($user, $type)`.
  - Returns `['allowed' => bool, 'reason' => string, 'limit' => int, 'used' => int]`.

- **Artisan Commands & Scheduler (Phase 1):**
  - **Command:** `subscriptions:clean-cancelled` — Permanently deletes `Subscription` records where `status = 'cancelled'` and `cancelled_at` is older than 30 days (for DB hygiene only, plan downgrade happens instantly upon cancel).
  - **Scheduler:** Register `$schedule->command('subscriptions:clean-cancelled')->daily();` in `Kernel.php`.

### Frontend Pages

- **Global Architecture:**
  - **State Management:** `Zustand` for UI state. `React Query` for server state.
  - **AxiosInstance:** base URL `/api/user/`, `withCredentials: true`, 401 interceptor → redirects to `/login`.
- **Auth Pages (`/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`):** Standard forms, OAuth buttons, password strength indicator.
- **`/plans` (3-Tier Pricing)**
  - Three cards: Free, Expert, Premium.
  - Feature matrix clearly showing escalations (Expert unlocks Timer/Checklist & Photos; Premium unlocks Smart Reminders & Predictive Insights & Unlimited Groups).
  - Cancel flow UI: Hard warning stating "Cancelling will immediately revoke your features."
- **Layout Components:** Header shows dynamic Plan Badge (Silver star for Expert, Golden crown for Premium). Zustand `AuthStore` tracks `activePlan` string.

### PWA Implementation (Phase 1)

- **Workbox Integration (Static Shell Only):**
  - Use `vite-plugin-pwa` configured with Workbox to **ONLY precache the static shell** (HTML, JS, CSS, fonts, offline.html).
  - **CRITICAL:** Remove any API caching routes from Service Worker. API caching is strictly delegated to React Query.
  - Create `offline.html`: branded fallback page.
- **Dexie.js & React Query Persistence:**
  - Initialize `momentum-db` using Dexie.js with initial stores: `pending_mutations`, `pending_photos` (for later phases).
  - Use `@tanstack/query-persist-client-core` with a Dexie persister to persist React Query cache to IndexedDB. Provides true offline reading.
- **Manifest & Install Prompt:** Register SW, capture `beforeinstallprompt`, show "Install App" button.

---