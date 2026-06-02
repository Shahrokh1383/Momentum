
---

# Core Foundation & Subscription Lifecycle – Backend Documentation

## Overview
This module provides the foundational data structures and business logic for user subscriptions within the Momentum application. It defines the subscription lifecycle (Free → Premium/Lifetime), plan limits, simulated payment processing, and daily cleanup of expired subscriptions. The implementation follows a plan-based model where every user has exactly one *current* subscription (fetched as the latest record), and premium features are gated by the subscription’s plan capabilities.

## Business Rules
1. **Free Plan on Registration**  
   Every newly registered user automatically receives a Free subscription (`plan = free`, `status = active`, `expires_at = null`). This ensures all users have a valid subscription row at all times. The creation is intended to happen in a registration controller or a `User` model observer.

2. **Subscription Lifecycle**  
   - A user can hold multiple `Subscription` records over time (e.g., Free → Premium → Lifetime).  
   - The *current* subscription is always the **latest** row for that user, retrieved via `User::subscription()` (uses `hasOne()->latestOfMany()`).  
   - When upgrading/downgrading, the system **should** create a new `Subscription` row and cancel the previous active one (`status = cancelled`, `cancelled_at = now()`). *Note: this cancellation logic is not yet implemented; currently only the latest row is considered.*  
   - Statuses: `active`, `cancelled`, `expired`.

3. **Active Subscription Definition**  
   A subscription is considered active if:  
   - `status === active`  
   - `expires_at` is `null` (for Free/Lifetime) **or** `expires_at` is in the future.  
   This is enforced by the `isActive()` method on the `Subscription` model.

4. **Grace Period**  
   The config value `momentum.subscription.grace_period_days` (default 3) is a **placeholder for future logic**. The current `isActive()` check and the `subscriptions:clean-expired` command do **not** consider it. When implemented, it will likely allow limited access for a few days after `expires_at` before the subscription is truly treated as expired.

5. **Plan Limits & Unlimited Convention**  
   - Numeric plan limits (e.g., `max_active_habits`, `max_groups`) use `-1` to represent **unlimited**.  
   - Enforcement will be handled by a future `PlanQuotaService`; currently no server-side validation exists beyond the data structure.  
   - Boolean flags (`has_advanced_analytics`, etc.) indicate feature availability.

6. **Simulated Payment Flow**  
   - Payments are represented by `SimulatedPayment` records, initially `pending`.  
   - A background job (not included in this module) processes the payment and updates it to `success` or `failed`, then modifies the associated subscription’s plan.  
   - The `subscription_id` is nullable because the subscription may not yet exist at payment creation time.

## Backend

### Directory Structure
- **Enums** – `UserRole`, `SubscriptionStatus`, `PlanSlug`, `PaymentStatus`, `EmailType`, `ProfileVisibility`, `Theme`
- **Models** – `User`, `Plan`, `Subscription`, `SimulatedPayment`, `UserSetting`, `SentEmailLog`
- **Migrations** – users, plans, subscriptions, simulated_payments, user_settings, sent_emails_log
- **Events** – `SubscriptionExpired`
- **Commands** – `CleanExpiredSubscriptions`
- **Configuration** – `config/momentum.php`
- **Seeders** – `PlanSeeder`

### Enums
All enums are PHP 8.1+ backed enums (`string`), used for strict type safety in models.  

| Enum | Values | Purpose |
|------|--------|---------|
| `UserRole` | `user`, `admin` | User access level. |
| `SubscriptionStatus` | `active`, `cancelled`, `expired` | Current state of a subscription. |
| `PlanSlug` | `free`, `premium`, `lifetime` | Unique identifier for a plan. |
| `PaymentStatus` | `pending`, `success`, `failed` | Lifecycle of a simulated payment. |
| `EmailType` | `password_reset`, `email_verification` | Categorisation of sent emails. |
| `ProfileVisibility` | `public`, `friends_only`, `private` | User profile privacy setting. |
| `Theme` | `light`, `dark`, `system` | UI theme preference. |

### Models & Relationships
- **User**  
  - `subscription()` – `hasOne(Subscription::class)->latestOfMany()` → returns the most recent subscription.  
  - `settings()` – `hasOne(UserSetting::class)`  
  - `simulatedPayments()` – `hasMany(SimulatedPayment::class)`  
  - Casts: `role` to `UserRole`, `profile_visibility` to `ProfileVisibility`.

- **Plan**  
  - `subscriptions()` – `hasMany(Subscription::class, 'plan', 'slug')` (no inverse on `Subscription`).  
  - Casts: `slug` to `PlanSlug`, all limits to `integer`, boolean flags, prices to `decimal:2`.

- **Subscription**  
  - `user()` – `belongsTo(User::class)`  
  - **No `plan()` relationship**; plan lookup is via the stored slug (`plan` column).  
  - `isActive()` – checks status and expiration.  
  - Auto‑generates a UUID `transaction_ref` on creation via `booted`.

- **SimulatedPayment**  
  - `user()` – `belongsTo(User::class)`  
  - `subscription()` – `belongsTo(Subscription::class)` (nullable).  
  - Casts: `status` to `PaymentStatus`, `payload` to `array`.

- **UserSetting** – `belongsTo(User::class)`.  
- **SentEmailLog** – standalone model, no relationships, casts `type` to `EmailType`.

### Migrations (Key Fields)
- `subscriptions`  
  - `plan` – string, default `free`.  
  - `status` – string, default `active`.  
  - `starts_at` – timestamp, not nullable.  
  - `expires_at` – nullable timestamp (null for free/lifetime).  
  - `cancelled_at` – nullable timestamp.  
  - `transaction_ref` – UUID, unique, auto-generated.  
  - Index on `user_id`.

- `simulated_payments`  
  - `subscription_id` – nullable foreign key to `subscriptions`.  
  - `amount` – decimal 10,2.  
  - `currency` – string, default `USD`.  
  - `status` – string, default `pending`.  
  - `payload` – JSON, nullable.  
  - Indexes on `user_id` and `subscription_id`.

- `plans` – `slug` is unique; all limit fields are integers.

### Artisan Command: `subscriptions:clean-expired`
- Scheduled daily via `routes/console.php`.  
- Logic:  
  1. Fetch all subscriptions where `status = active` and `expires_at < now()`.  
  2. Update each to `status = expired`.  
  3. Dispatch `SubscriptionExpired` event for each.  
- Grace period is **not** factored in (future enhancement).  
- Uses `chunkById` for memory efficiency on large tables.

### Seeders
- `PlanSeeder` inserts/upserts the three predefined plans (Free, Premium, Lifetime) using the slug as the unique key.  
- All plan attributes are explicitly listed; the Free plan has `-1` for unlimited fields where applicable.

### Event
- `SubscriptionExpired` – receives the `Subscription` model. No listeners are implemented yet; the event serves as an extension point for future notifications or cleanup tasks.

## API Contract (Planned – Not Yet Implemented)
The following REST endpoints are derived from the Phase 1 blueprint. They are not coded in Module 1 and should be considered **planned**.

### `GET /api/user/subscriptions/current`
Returns the current subscription with its plan details.  
**Response**:
```json
{
  "data": {
    "id": 1,
    "plan": "premium",
    "status": "active",
    "starts_at": "2025-01-01T00:00:00Z",
    "expires_at": "2025-02-01T00:00:00Z",
    "is_active": true,
    "plan_details": {
      "max_active_habits": -1,
      "has_advanced_analytics": true,
      ...
    }
  }
}
```

### `POST /api/user/subscriptions/upgrade`
**Body**: `{ "plan_slug": "premium" }`  
- Creates a `SimulatedPayment` (pending).  
- Enqueues a job to process the payment.  
- Eventually updates the subscription record (new plan, new expiration).  
**Response** (immediate): `{ "payment_id": 1, "status": "pending" }`

### `POST /api/user/subscriptions/cancel`
Marks the current active subscription as cancelled (sets `cancelled_at`).  
**Response**: `{ "status": "cancelled" }`

### `GET /api/plans`
Public list of all available plans with their features and pricing.

### `GET /api/user/quota-status`
Returns current usage counts vs plan limits (to be backed by `PlanQuotaService`).

## Flow

### 1. User Registration
1. User account is created.  
2. A Free subscription row is inserted:  
   - `plan = free`, `status = active`, `starts_at = now()`, `expires_at = null`.  
3. User immediately has active Free access.

### 2. Upgrade to Premium/Lifetime
1. User calls upgrade endpoint with target plan slug.  
2. A `SimulatedPayment` record is created (`status = pending`).  
3. A background processor (future) sets payment to `success`, then:  
   - Cancels the previous active subscription (not yet implemented).  
   - Creates a new `Subscription` row with the new plan, `starts_at = now()`, and for Premium a future `expires_at` (e.g., +1 month).  
4. The new subscription becomes the current one via `latestOfMany()`.  

### 3. Daily Expiry Cleanup
- `subscriptions:clean-expired` runs once per day.  
- Any active subscription with `expires_at` in the past is marked `expired`.  
- The user no longer has premium access; their latest subscription is now expired. If they have an older Free subscription still `active`, it will not be picked up automatically (see edge cases).

## Edge Cases

- **Multiple Active Subscriptions**  
  The system does not enforce a unique constraint on active status. If an upgrade fails to cancel the previous subscription, two `active` rows can exist. The `latestOfMany()` relationship will return the newest, potentially hiding a still-valid older subscription. A cleanup job or explicit cancellation is required.

- **Grace Period Not Enforced**  
  A subscription that expired 1 minute ago will immediately become `expired` and the user loses access. The `grace_period_days` config has no effect. This must be addressed in future iterations.

- **Free Subscription Never Expires**  
  `expires_at` is `null` for Free plans, so `isActive()` always returns `true` for them.

- **Lifetime Subscription**  
  Also has `expires_at = null`, so it never expires.

- **Payment Failures**  
  The simulated payment may stay `pending` or become `failed`. The upgrade flow should handle this by not altering the subscription. Currently no compensation logic exists.

- **Null `subscription_id` in Payments**  
  If a payment is created before a subscription row exists (e.g., first upgrade), the `subscription_id` must be filled later. The nullable foreign key with `nullOnDelete` accommodates this.

## Tests (Recommended Scenarios)
No test files are present. The following scenarios should be implemented:

1. **`subscriptions:clean-expired`**  
   - Past expiration → status becomes `expired`.  
   - Event `SubscriptionExpired` is dispatched for each.  
   - Future expiration → untouched.  
   - No expired subscriptions → zero updates.

2. **`Subscription::isActive()`**  
   - `active` + future `expires_at` → `true`.  
   - `active` + past `expires_at` → `false`.  
   - `cancelled`/`expired` status → `false`.  
   - `active` + `null` expires_at → `true`.

3. **User-Subscription Relationship**  
   - Multiple subscriptions exist; `user->subscription` returns the latest.

4. **Enum Casting**  
   - Invalid strings throw `ValueError` on cast.

5. **Plan Seeder**  
   - No duplicate slugs after multiple runs (upsert works).

6. **Auto UUID**  
   - Creating a subscription without `transaction_ref` generates one.

## Notes
- **`-1` Convention**: All numeric limits that use `-1` for “unlimited” must be documented for developers. The future `PlanQuotaService` will centralize checks and treat negative values as unlimited.
- **Loose Coupling**: `Subscription` does not have a `plan()` Eloquent relationship. The plan slug is treated as an enum-like string, verified via `PlanSlug`. This avoids migration complexity and keeps the data transfer simple.
- **Configuration**: `config/momentum.php` currently only holds the grace period value. Additional subscription-related settings should be added here.
- **Event Extension**: `SubscriptionExpired` is fired but unhandled. Listeners can be attached later for email notifications, token revocation, or analytics.
- **Command Registration**: In Laravel 12, the command is scheduled in `routes/console.php` using `Schedule::command(...)`. The command class is also registered automatically via auto-discovery.

--- 