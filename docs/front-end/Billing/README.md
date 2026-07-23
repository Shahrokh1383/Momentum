# Billing Module (Frontend) — High-Level Architecture

> **Project:** Momentum Application  
> **Frontend:** React 19 + TypeScript + Vite  
> **State Management:** TanStack Query (v5) + Zustand  
> **Routing:** React Router v6  
> **Document Version:** 1.0.0 (final)  
> **Last Updated:** 2026-06-26

---

## Purpose

The Billing frontend implements the user interface for a **Term License (Prepaid Duration)** subscription model. It enables authenticated users to browse plan tiers, upgrade their plan, complete payments via an external hosted payment page (HPP), and manage their subscription lifecycle. The module uses a **smart polling architecture** to bridge asynchronous payment gateway verification with reactive UI updates.

This document is the **single source of truth** for the high‑level architecture of the Billing frontend. Detailed specifications for each sub-module reside in separate documents (see [Sub-Modules](#sub-modules)).

---

## Architecture Overview

The frontend is decomposed into **four sub-modules** following clear separation of concerns:

| Sub-Module | Responsibility |
|------------|----------------|
| [Plan Discovery & Comparison](./plan-discovery-comparison.md) | Displaying available plans, comparison grid, selection rules, and CTA rendering. |
| [Subscription Management & Quota Dashboard](./subscription-management-quota.md) | Current subscription status banner, cancellation flow, quota/usage/feature display, and banner dismissal. |
| [Payment Flow (Upgrade & Verification)](./payment-flow.md) | Upgrade initiation modal, HPP redirect, payment verification countdown, and result screens. |
| [Billing-Auth Integration & Tier Indicators](./billing-auth-integration.md) | Syncing auth state with subscription state, smart polling across pages, and `PremiumBadge` indicators. |

Each sub-module has its own detailed documentation covering business rules, component architecture, hooks, API contracts, flows, edge cases, and recommendations.

---

## High-Level Data Flow

```
Authenticated User
        │
        ▼
   AppHeader (PremiumBadge reflects active plan)
        │
        ├──► /plans (Plan Discovery)
        │       ├── PlansList fetched (TanStack Query)
        │       ├── PlanCard selection → opens PaymentModal
        │       └── Upgrade mutation → window.location.href = payment_url
        │
        ▼
   Paymenter Hosted Page (external)
        │
        └──► /payment-result?transaction_id=... (Payment Flow)
                ├── PaymentProcessing (countdown + polling)
                ├── PaymentResult (success/failure/timeout)
                └── Redirects to /dashboard or /plans
        │
   Everywhere (Background Sync)
        └── useCurrentUser smart polling (5s when pending_payment)
              └── Syncs active_plan, PremiumBadge, and subscription status
```

1. **Plan Discovery** provides static plan data and selection UI.
2. **Payment Flow** handles the external gateway dance and polling verification.
3. **Subscription Management** displays the live subscription state and allows cancellation.
4. **Billing-Auth Integration** ensures the user’s tier and badges stay up‑to‑date across all routes.

---

## Key Design Patterns

### Smart Polling Architecture
- `useCurrentUser` and `useSubscription` conditionally poll (every 5 seconds) only when the subscription is in `pending_payment` **and** a `gateway_transaction_id` exists (meaning the user has returned from the bank). This avoids unnecessary network calls for FREE users or settled subscriptions.
- Polling stops automatically when the status transitions away from `pending_payment`.

### TanStack Query as Server State
- All server data (plans, subscription, quotas, verification) is cached and managed by TanStack Query.
- Mutations (upgrade, cancel) automatically invalidate relevant queries, forcing a refetch and keeping the UI consistent.

### External Gateway Bridge
- The frontend never handles sensitive payment details. It redirects entirely to the Paymenter HPP.
- After the gateway processes the payment, it redirects to the backend callback, which stores the transaction ID and then redirects the user back to the frontend’s `/payment-result` page.
- The frontend polls a verification endpoint to confirm the backend has processed the payment, then updates the subscription status.

### Null Object for FREE Users
- The API returns `404` for users without an active subscription. The frontend treats this as `null`, gracefully handling FREE users without showing errors.

### Persistent Banner Dismissal
- Terminal status banners (`cancelled`, `expired`, `payment_failed`) can be dismissed. The dismissal is persisted in `localStorage` using a key tied to the subscription ID, so it survives page reloads.

---

## Critical Known Issues & Recommendations

These issues are documented in the respective sub-modules and are central to the module’s reliability.

| Issue | Impact | Recommendation |
|-------|--------|----------------|
| **Session expiry during payment** | `/payment-result` route is authentication‑gated; expired sessions lose the `transaction_id` on redirect to login. User is charged but subscription not verified. | Remove `ProtectedRoute` from `/payment-result`. Store `transaction_id` in `sessionStorage` before login redirect. |
| **Race condition in `usePaymentVerification`** | Timer and data effects not synchronised; `onTimeout` may fire after `onSuccess`. | Use a `useRef` completion guard to prevent timeout after success. |
| **Duplicate `Plan` type definition** | `types/user.ts` has an incorrect `Plan` interface (number pricing, missing fields). | Consolidate all billing types into a single `types/billing.ts` and delete the duplicate. |
| **Dead code: unauthenticated guard in PlansPage** | `PlansPage` checks `!isAuthenticated` and navigates to `/register`, but the page is already behind `ProtectedRoute`. | Remove the dead check and `isAuthenticated` prop from `PlanCard`. |
| **Hardcoded “Monthly” label** | `PaymentModal` always shows “Monthly”, ignoring the plan’s `duration_months`. | Derive label dynamically from `plan.duration_months`. |
| **`alert()` for errors** | Payment errors are shown via `alert()` which is poor UX. | Integrate a toast library (e.g., `react-hot-toast`). |

---

## Technology Stack

- **Framework:** React 19 (with StrictMode)
- **Language:** TypeScript
- **Build Tool:** Vite
- **State Management:** TanStack Query v5 (server state), Zustand (client/auth state)
- **Routing:** React Router v6
- **HTTP Client:** Axios (with Sanctum CSRF interceptor)
- **Styling:** (project‑specific, not defined in billing docs)
- **Authentication:** Laravel Sanctum (session‑based, cookie)

---

## Directory Structure (conceptual)

```
src/
├── components/
│   └── billing/
│       ├── PlanCard.tsx
│       ├── PaymentModal.tsx
│       ├── PaymentProcessing.tsx
│       ├── PaymentResult.tsx
│       ├── SubscriptionStatusBanner.tsx
│       └── PremiumBadge.tsx
├── hooks/
│   ├── useSubscription.ts
│   ├── usePaymentVerification.ts
│   ├── useDismissable.ts
│   └── useCurrentUser.ts   (auth + billing sync)
├── services/
│   └── subscriptionService.ts
├── types/
│   └── billing.ts          (unified Plan, Subscription, Quota interfaces)
├── store/
│   └── authStore.ts        (Zustand)
├── pages/
│   ├── PlansPage.tsx
│   └── PaymentResultPage.tsx
└── App.tsx                 (route definitions)
```

---

## Further Reading

- [Plan Discovery & Comparison](./plan-discovery-comparison.md)
- [Subscription Management & Quota Dashboard](./subscription-management-quota.md)
- [Payment Flow (Upgrade & Verification)](./payment-flow.md)
- [Billing-Auth Integration & Tier Indicators](./billing-auth-integration.md)

---