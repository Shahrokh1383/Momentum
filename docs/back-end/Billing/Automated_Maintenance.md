## 5. Module: Automated Maintenance

# Automated Maintenance — Technical Documentation

> **Project:** Momentum Application  
> **Backend:** Laravel (PHP 8.2+)  
> **Pattern:** Domain-Driven Design (DDD) with Service Layer  
> **Last Updated:** 2026-06-25

---

## 1. Overview

The **Automated Maintenance** module handles background tasks that keep the billing system clean and enforce time-based rules. It consists of a single scheduled command that performs expiration of subscriptions, cleanup of abandoned payments, and purging of old cancelled records.

### Key Characteristics
| Aspect | Implementation |
|--------|----------------|
| **Schedule** | Intended for daily/hourly cron |
| **Command** | `subscriptions:check-status` |
| **Tasks** | Expire active subscriptions, hard-delete old cancellations, fail abandoned payments |
| **Events** | Fires `SubscriptionExpired` for each naturally expired subscription |

### Module Scope
- **Natural Expiration**: Downgrade users whose subscription `expires_at` has passed.
- **Hygiene**: Delete `CANCELLED` subscriptions older than 30 days.
- **Abandoned Payments**: Cancel `PENDING_PAYMENT` subscriptions older than 1 hour.
- **Bug Documentation**: Known namespace errors and their impact.

---

## 2. Business Rules

### 2.1 Expiration Rule
- When an ACTIVE subscription's `expires_at` is in the past, the subscription is moved to `EXPIRED`, the user is downgraded to FREE, and a `SubscriptionExpired` event is fired (which queues an email).

### 2.2 Abandoned Payment Rule
- Subscriptions in `PENDING_PAYMENT` status for more than 1 hour are considered abandoned. The linked pending payment is marked as `FAILED` and the subscription is cancelled.

### 2.3 Data Retention
- `CANCELLED` subscriptions older than 30 days are hard-deleted to keep the table lean.

---

## 3. Backend

### 3.1 Console Commands

#### `CheckSubscriptionStatus` (`subscriptions:check-status`)
Scheduled command (intended for daily/hourly cron) that performs three maintenance tasks:

1. **Natural Expiration**: Finds `ACTIVE` subscriptions where `expires_at < now()`. Atomically updates status to `EXPIRED`, plan to `FREE`, syncs `users.plan_slug`, and fires `SubscriptionExpired` event.
2. **Hygiene Cleanup**: Hard-deletes `CANCELLED` subscriptions older than 30 days.
3. **Abandoned Payments**: Finds `PENDING_PAYMENT` subscriptions older than 1 hour. Marks linked pending payments as `FAILED` and cancels the subscription.

> **Known Issue:** The command has incorrect namespace imports (`App\Enums\PaymentStatus` instead of `App\Enums\Billing\PaymentStatus`, etc.). This will cause a fatal error when executed.

### 3.2 Events

| Event | Trigger | Listener |
|-------|---------|----------|
| `SubscriptionExpired` | Fired by `CheckSubscriptionStatus` command when a subscription naturally expires. | `SendSubscriptionExpiredEmailListener` → Queues `SubscriptionExpiredMail` |

---

## 4. API Contract

_This module has no HTTP API; it operates solely via the CLI command._

---

## 5. Flows

### 5.1 Natural Expiration Flow (Cron)
```
Scheduler ──► php artisan subscriptions:check-status
                 │
                 ▼
    CheckSubscriptionStatus::handle()
                 │
                 ├──► Find ACTIVE subscriptions where expires_at < now()
                 │      ├── Atomic UPDATE → status=EXPIRED, plan=FREE
                 │      ├── Sync users.plan_slug = FREE
                 │      └── Fire SubscriptionExpired event
                 │             └── Queue Expiration Email
                 │
                 ├──► Hard-delete CANCELLED > 30 days old
                 │
                 └──► Cancel PENDING_PAYMENT > 1 hour old
                        ├── Mark Payment → FAILED
                        └── Mark Subscription → CANCELLED
```

---

## 6. Edge Cases

### 6.1 Invalid Namespace in Cron Command
**Scenario:** The scheduled `CheckSubscriptionStatus` command runs.
**Current Behavior:** Fatal `Class not found` error due to missing `Billing\` namespace in imports.
**Impact:** Expired subscriptions are never downgraded. Abandoned payments are never cleaned. Users may retain expired plan access indefinitely.
**Fix Required:** Update all imports in `CheckSubscriptionStatus.php` to use the `Billing` subdomain namespace.

---

## 7. Notes & Recommendations

### 7.1 Critical Bug (Immediate Fix Required)
**Namespace Errors in `CheckSubscriptionStatus`**: All imports are missing the `Billing\` subdomain prefix. This command will fatal error when executed by the scheduler, breaking expiration handling and database hygiene.
```php
// WRONG
use App\Enums\PaymentStatus;
// CORRECT
use App\Enums\Billing\PaymentStatus;
```

### 7.2 Performance
- The `subscriptions` table uses `chunkById(100)` in the cron command to prevent memory exhaustion on large datasets.

---