# Billing Module — High-Level Architecture

> **Project:** Momentum Application  
> **Backend:** Laravel (PHP 8.2+)  
> **Pattern:** Domain-Driven Design (DDD) with Service Layer  
> **Document Version:** 1.0.0 (final)  
> **Last Updated:** 2026-06-25

---

## Purpose

The Billing module implements a **Term License (Prepaid Duration)** billing model. Users pay upfront for a fixed duration and gain access to tiered features and quotas. The module handles plan definitions, subscription lifecycle, payment processing via Paymenter gateway, real-time quota enforcement, and automated maintenance.

This document is the **single source of truth** for the high-level architecture of the Billing module. Detailed specifications for each sub-module reside in separate documents (see [Sub-Modules](#sub-modules)).

---

## Architecture Overview

The module is decomposed into **five sub-modules** following the separation of concerns:

| Sub-Module | Responsibility |
|------------|----------------|
| [Plan Management](./plan-management.md) | Definition of tiers, limits, features, pricing, and hierarchy. |
| [Subscription Lifecycle](./subscription-lifecycle.md) | State machine (upgrade, activate, cancel, expire), user plan assignment. |
| [Payment Processing](./payment-processing.md) | Integration with Paymenter gateway (create sessions, verify, refund), payment records. |
| [Quota & Feature Gating](./quota-feature-gating.md) | Real-time enforcement of limits, feature flags, and habit-type permissions. |
| [Automated Maintenance](./automated-maintenance.md) | Cron-based expiration, abandoned payment cleanup, record purging. |

Each sub-module has its own detailed documentation with business rules, backend specifics, API contracts, flows, edge cases, and recommendations.

---

## High-Level Data Flow

```
Users ───────► API Layer (Controllers)
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
   Plans API   Subscription  Quota/Feature
   (list)      Lifecycle     Gating
                   │
                   ├──► PaymenterService (external gateway)
                   │
                   └──► Subscription Service
                          │
                          └──► PlanQuotaService (limits, features)

Cron (scheduler) ──► CheckSubscriptionStatus (maintenance)
```

1. **Plan Management** provides read-only plan data to the API.
2. **Subscription Lifecycle** receives user actions (upgrade, cancel) and orchestrates the workflow, delegating payment to **Payment Processing**.
3. **Quota & Feature Gating** intercepts requests (via middleware) and uses the effective plan (from Subscription + Plan data) to allow or deny actions.
4. **Automated Maintenance** runs periodically to expire subscriptions, fail abandoned payments, and clean old records.

---

## Key Design Patterns

### Term License Model
- **Prepaid, non-recurring** — no recurring charges; each purchase is a one-time payment for a fixed period.
- Expiry results in automatic downgrade to FREE.
- The system does **not** support downgrading via upgrade flow; only cancellation or expiration triggers downgrade.

### Plan Resolution & Storage
- `plans` table stores immutable plan definitions; `slug` is the natural key used throughout.
- `subscriptions` store a snapshot reference (`plan` as string slug), not a foreign key, for historical integrity.
- FREE users do **not** have a subscription row; their plan is resolved dynamically.

### Service Layer
- **SubscriptionService** — central orchestrator for the lifecycle.
- **PlanQuotaService** — singleton providing plan limits, usage, feature flags, and gating decisions.
- **PaymenterService** — thin wrapper for the external gateway; all payment-related HTTP calls are isolated here.

### Event-Driven Notifications
- `SubscriptionExpired` event fires on natural expiration → queues expiration email.
- `SubscriptionConfirmedMail` sent on successful activation.

---

## Critical Known Issues & Recommendations

The following are architectural issues documented in the sub-modules. They are central to the module’s reliability and should be addressed in future iterations.

| Issue | Impact | Recommendation |
|-------|--------|----------------|
| **Gateway timeout during upgrade** | Old subscription cancelled before payment confirmed → user left without active plan if gateway fails. | Defer cancellation until payment verification succeeds. |
| **Browser close after payment** | Callback never received; user charged but subscription never activated. | Implement server-to-server webhooks from Paymenter. |
| **Namespace errors in maintenance command** | Fatal error in `CheckSubscriptionStatus`; no expiration or cleanup occurs. | Fix all enum imports to use `App\Enums\Billing\*`. |
| **Plan configuration retroactive changes** | Modifying a live plan affects all historical subscribers. | Store a `plan_limits_snapshot` on subscription at activation time. |
| **Double-click upgrade** | Creates duplicate pending subscriptions. | Add unique constraint or DB lock on `user_id + status = PENDING_PAYMENT`. |
| **Prorated refunds missing** | Full refund always issued regardless of usage. | Implement prorated calculation before calling gateway refund. |
| **Concurrent quota checks** | Race condition may allow temporary overage. | Use pessimistic locking or atomic counters. |

---

## Technology Stack

- **Backend Framework:** Laravel 10+ (PHP 8.2+)
- **Database:** MySQL / MariaDB
- **Payment Gateway:** Paymenter (external REST API)
- **Queue:** Laravel queues (for emails)
- **Caching:** Laravel cache (plan metadata)

---

## Directory Structure (conceptual)

```
App/
├── Enums/
│   └── Billing/
│       ├── PlanSlug.php
│       ├── SubscriptionStatus.php
│       └── PaymentStatus.php
├── Models/
│   └── Billing/
│       ├── Plan.php
│       ├── Subscription.php
│       └── Payment.php
├── Services/
│   └── Billing/
│       ├── SubscriptionService.php
│       ├── PlanQuotaService.php
│       └── PaymenterService.php
├── Http/
│   ├── Controllers/
│   │   └── Billing/
│   │       ├── PlansController.php
│   │       ├── SubscriptionController.php
│   │       └── PaymentCallbackController.php
│   └── Middleware/
│       ├── EnsureTier.php
│       └── EnforceHabitPlanLimits.php
├── Console/
│   └── Commands/
│       └── CheckSubscriptionStatus.php
├── Mail/
│   └── Billing/
│       ├── SubscriptionConfirmedMail.php
│       └── SubscriptionExpiredMail.php
├── Events/
│   └── SubscriptionExpired.php
└── Listeners/
    └── SendSubscriptionExpiredEmailListener.php
```

---

## Further Reading

- [Plan Management Documentation](./plan-management.md)
- [Subscription Lifecycle Documentation](./subscription-lifecycle.md)
- [Payment Processing Documentation](./payment-processing.md)
- [Quota & Feature Gating Documentation](./quota-feature-gating.md)
- [Automated Maintenance Documentation](./automated-maintenance.md)

---