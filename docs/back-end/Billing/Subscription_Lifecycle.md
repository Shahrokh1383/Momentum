## 2. Module: Subscription Lifecycle

# Subscription Lifecycle — Technical Documentation

> **Project:** Momentum Application  
> **Backend:** Laravel (PHP 8.2+)  
> **Pattern:** Domain-Driven Design (DDD) with Service Layer  
> **Last Updated:** 2026-06-25

---

## 1. Overview

The **Subscription Lifecycle** module manages the complete life of a user's subscription – from upgrade request through activation, cancellation, and expiration. It enforces business rules around upgrades and maintains the state machine for subscriptions. Payments are delegated to the Payment Processing module; this module focuses solely on subscription status and user plan assignment.

### Key Characteristics
| Aspect | Implementation |
|--------|----------------|
| **State Machine** | `PENDING_PAYMENT` → `ACTIVE` → `EXPIRED` / `CANCELLED` |
| **Plan Assignment** | `users.plan_slug` denormalized for quick resolution |
| **FREE Users** | No subscription row created (Null Object Pattern) |
| **Notifications** | Confirmation & expiration emails dispatched via events |

### Module Scope
- **Subscription States**: Status enum and lifecycle rules.
- **Service Layer**: `SubscriptionService` orchestrates upgrade, verify, cancel, and internal activation/failure.
- **API Endpoints**: Get current subscription, upgrade, verify payment (polling), cancel.
- **Events & Mail**: `SubscriptionExpired` event, confirmation/expiration emails.
- **FREE Plan Optimization**: Dynamic plan resolution without a subscription record.

---

## 2. Business Rules

### 2.1 Subscription State Machine
```
PENDING_PAYMENT → ACTIVE → EXPIRED
     ↓              ↓
  PAYMENT_FAILED  CANCELLED
```

- **PENDING_PAYMENT**: Created immediately upon upgrade. User must complete payment at the gateway.
- **ACTIVE**: Payment verified by gateway. `starts_at` and `expires_at` are populated.
- **EXPIRED**: Reached `expires_at` without renewal. User downgraded to `FREE`.
- **CANCELLED**: User manually cancelled. Refund initiated if applicable.
- **PAYMENT_FAILED**: Gateway returned failure or user abandoned the session (>1 hour).

### 2.2 Upgrade & Cancellation Rules
1. **Upgrade Only**: Users cannot "upgrade" to `FREE`. Downgrade happens only via cancellation or expiration.
2. **No Duplicate Active Plans**: A user cannot have two active subscriptions to the same plan.

### 2.3 FREE Plan Optimization
- FREE users do **not** have a `subscriptions` record. Their plan is resolved dynamically via `PlanQuotaService::resolveEffectiveSlug()`.
- This prevents table bloat and reduces query load for the majority of users.

---

## 3. Backend

### 3.1 Domain Model

#### Subscription (`App\Models\Billing\Subscription`)
| Field | Type | Purpose |
|-------|------|---------|
| `user_id` | FK | Owner |
| `plan` | PlanSlug enum | Stored as string for historical integrity |
| `status` | SubscriptionStatus enum | State machine value |
| `starts_at` | datetime | Activation timestamp |
| `expires_at` | datetime | Calculated as `now + duration_months` |
| `cancelled_at` | datetime | Manual cancellation timestamp |
| `transaction_ref` | UUID (unique) | Internal reference for payment gateway callback |

**Key Methods:**
- `isActive()`: Checks `status === ACTIVE` and `expires_at` is future or null.
- `isPendingPayment()`: Checks `status === PENDING_PAYMENT`.

**Relationships:**
- `user()`: BelongsTo
- `planDetails()`: BelongsTo (Plan via `plan = slug`)
- `payments()`: HasMany
- `latestPayment()`: HasOne (latestOfMany)

### 3.2 Enums

#### `SubscriptionStatus` (enum `App\Enums\Billing\SubscriptionStatus`)
```php
enum SubscriptionStatus: string {
    case PENDING_PAYMENT = 'pending_payment';
    case ACTIVE = 'active';
    case CANCELLED = 'cancelled';
    case EXPIRED = 'expired';
    case PAYMENT_FAILED = 'payment_failed';
}
```

### 3.3 Service Layer

#### `SubscriptionService`
Central orchestrator for the subscription lifecycle (payment operations are delegated to PaymenterService).

| Method | Responsibility |
|--------|----------------|
| `getCurrent(User)` | Retrieves active/pending subscription. Auto-verifies pending payments if the user has returned from the bank. |
| `upgrade(User, PlanSlug)` | Validates upgrade, cancels old subscription, creates new pending subscription, calls PaymenterService for session URL. |
| `verify(User, int)` | Polls PaymenterService to confirm transaction status. Activates or fails the subscription accordingly. |
| `cancel(User)` | Validates cancellation eligibility, calls PaymenterService to refund, downgrades user to FREE. |
| `activateSubscription(Payment, array)` | Private. Sets ACTIVE, calculates expiry, updates `users.plan_slug`, queues confirmation email. |
| `failPayment(Payment, array)` | Private. Marks payment and subscription as failed. |
| `performCancellation(Subscription)` | Private. Marks subscription as CANCELLED. |
| `validateUpgrade(User, PlanSlug)` | Private. Prevents FREE upgrades and duplicate active plans. |
| `resolveAmount(Plan, PlanSlug)` | Private. Always returns `price_monthly` (term license model). |

### 3.4 Controllers

#### `SubscriptionController`
- `GET /api/user/subscription` → Current subscription with `planDetails` and `latestPayment`.
- `POST /api/user/subscription/upgrade` → Initiates upgrade; returns `payment_url` (HTTP 202).
- `GET /api/user/subscription/verify/{transactionId}` → Polls gateway and returns subscription/payment status.
- `DELETE /api/user/subscription` → Cancels active subscription; returns refund details.

### 3.5 Events & Listeners

| Event | Trigger | Listener |
|-------|---------|----------|
| `SubscriptionExpired` | Fired by `CheckSubscriptionStatus` command when a subscription naturally expires. | `SendSubscriptionExpiredEmailListener` → Queues `SubscriptionExpiredMail` |

### 3.6 Mailables

- `SubscriptionConfirmedMail`: Sent upon successful activation. Includes subscription, payment, and plan details.
- `SubscriptionExpiredMail`: Sent when subscription naturally expires.

### 3.7 Database Schema

#### `subscriptions` Table
- `plan` column stores the `PlanSlug` string value (not `plan_id`).
- `transaction_ref` is a UUID for secure callback correlation.
- Indexed on `user_id`.

#### `users` Table
- `plan_slug` is a denormalized column for fast plan resolution without joining subscriptions.

---

## 4. API Contract

### 4.1 Get Current Subscription
```http
GET /api/user/subscription
Authorization: Bearer {token}
```
**Response 200 (Active):**
```json
{
  "success": true,
  "data": {
    "id": 42,
    "plan": { /* PlanResource */ },
    "plan_slug": "expert",
    "status": "active",
    "starts_at": "2026-06-01T10:00:00Z",
    "expires_at": "2026-07-01T10:00:00Z",
    "cancelled_at": null,
    "transaction_ref": "a1b2c3d4-e5f6-...",
    "latest_payment": {
      "status": "success",
      "gateway_transaction_id": 12345,
      "amount": 9.99
    }
  }
}
```
**Response 404:** No subscription found (typical for FREE users).

### 4.2 Upgrade Subscription
```http
POST /api/user/subscription/upgrade
Authorization: Bearer {token}
Content-Type: application/json

{
  "plan_slug": "expert"
}
```
**Validation:** `plan_slug` required, must be a valid `PlanSlug` enum value (not `free`).

**Response 202 (Accepted):**
```json
{
  "success": true,
  "message": "Redirecting to secure payment gateway.",
  "data": {
    "payment_url": "https://paymenter.com/pay/session/abc123"
  }
}
```

**Response 422 (Validation Error):**
```json
{
  "success": false,
  "error": "upgrade_failed",
  "message": "You are already subscribed to this plan."
}
```

**Response 502 (Gateway Error):**
```json
{
  "success": false,
  "error": "payment_error",
  "message": "Payment gateway is unreachable. Please check your connection."
}
```

### 4.3 Verify Payment (Polling)
```http
GET /api/user/subscription/verify/{transactionId}
Authorization: Bearer {token}
```
**Response 200 (Confirmed):**
```json
{
  "success": true,
  "message": "Payment confirmed. Subscription activated.",
  "data": {
    "status": "confirmed",
    "subscription": { /* SubscriptionResource */ },
    "payment": {
      "gateway_transaction_id": 12345,
      "status": "success",
      "amount": 9.99,
      "paid_at": "2026-06-25T14:30:00Z"
    }
  }
}
```

**Response 200 (Already Confirmed):**
```json
{
  "success": true,
  "message": "Payment was already confirmed.",
  "data": {
    "status": "already_confirmed",
    "subscription": { /* ... */ }
  }
}
```

**Response 200 (Pending):**
```json
{
  "success": true,
  "message": "Payment is still being processed.",
  "data": {
    "status": "pending"
  }
}
```

**Response 200 (Failed):**
```json
{
  "success": true,
  "message": "Payment failed.",
  "data": {
    "status": "failed"
  }
}
```

### 4.4 Cancel Subscription
```http
DELETE /api/user/subscription
Authorization: Bearer {token}
```
**Response 200:**
```json
{
  "success": true,
  "message": "Subscription cancelled and refund initiated.",
  "data": {
    "subscription": { /* SubscriptionResource (status: cancelled, plan: free) */ },
    "refund": {
      "status": "refunded",
      "amount": 9.99,
      "refunded_at": "2026-06-25T15:00:00Z"
    }
  }
}
```

**Response 422:**
```json
{
  "success": false,
  "error": "cancel_failed",
  "message": "No active subscription found."
}
```

---

## 5. Flows

### 5.1 Subscription Upgrade Flow
```
User ──► POST /api/user/subscription/upgrade
           │
           ▼
    SubscriptionService::upgrade()
           │
           ├──► validateUpgrade() ──► Reject if FREE or duplicate
           │
           ├──► DB Transaction:
           │      ├── Cancel old ACTIVE subscription
           │      └── Fail old PENDING payment
           │
           ├──► Create new Subscription (PENDING_PAYMENT)
           │
           ├──► PaymenterService::createSession() (delegated to Payment Processing)
           │      └── Returns payment_url
           │
           ├──► Create Payment record (PENDING, gateway_id = null)
           │
           └──► Return { payment_url }
           │
           ▼
User ──► Redirects to payment_url (Paymenter Hosted Page)
```

### 5.2 Cancellation Flow
```
User ──► DELETE /api/user/subscription
           │
           ▼
    SubscriptionService::cancel()
           │
           ├──► Validate: Must be ACTIVE and not FREE
           │
           ├──► PaymenterService::refund(gateway_transaction_id)
           │
           ├──► DB Transaction:
           │      ├── Update Payment → REFUNDED
           │      ├── Update Subscription → CANCELLED, plan = FREE
           │      └── Update User.plan_slug = FREE
           │
           └──► Return { subscription, refund }
```

### 5.3 Payment Verification (Subscription Side)
When the frontend polls `GET /api/user/subscription/verify/{transactionId}`, `SubscriptionService::verify()` calls the Payment Processing module to check the gateway; on success it runs `activateSubscription()`, updating the subscription to ACTIVE and syncing the user’s plan.

---

## 6. Edge Cases

### 6.1 Gateway Timeout During Upgrade
**Scenario:** The old subscription is cancelled inside a DB transaction, but the gateway call `createSession()` fails with a connection error.
**Current Behavior:** The old subscription remains cancelled. The user is left with a `PENDING_PAYMENT` subscription that will eventually be marked as abandoned by the cron.
**Impact:** User experiences a service gap (downgraded to FREE) even though they intended to pay.
**Mitigation:** Keep the old subscription ACTIVE until the new payment is successfully verified. Only perform cancellation inside `activateSubscription()`.

### 6.2 Double-Click Upgrade
**Scenario:** User clicks upgrade twice rapidly.
**Current Behavior:** `validateUpgrade()` checks for an active subscription of the same plan, but if the first request has already cancelled the old subscription and created a pending one, the second request may create another pending subscription.
**Impact:** Duplicate pending subscriptions.
**Mitigation:** Add a unique constraint or database-level lock on `user_id + status = PENDING_PAYMENT`.

---

## 7. Notes & Recommendations

### 7.1 Transaction Safety in Upgrade (Critical Architectural Improvement)
**Current Issue:** The old subscription is cancelled before the gateway confirms payment. A gateway failure leaves the user without an active plan.
**Recommendation:** Defer cancellation until `activateSubscription()`. Keep the old subscription `ACTIVE` while the new one is `PENDING_PAYMENT`. Only cancel the old one after successful verification.

### 7.2 Automatic `plan_slug` Synchronization
**Current Issue:** `users.plan_slug` is updated manually in three separate locations (`activateSubscription`, `cancel`, `CheckSubscriptionStatus`).
**Recommendation:** Add an Eloquent Observer on the `Subscription` model (or use `booted()` events) to automatically sync `plan_slug` whenever `status` or `plan` changes. This eliminates human error and guarantees consistency.