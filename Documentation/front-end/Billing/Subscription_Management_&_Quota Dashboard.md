# 2. Subscription Management & Quota Dashboard

# Subscription Management & Quota Dashboard — Frontend Technical Documentation

> **Project:** Momentum Application  
> **Frontend:** React 19 + TypeScript + Vite  
> **State Management:** TanStack Query (v5) + Zustand  
> **Routing:** React Router v6  
> **Last Updated:** 2026-06-26

---

## 1. Overview

The **Subscription Management & Quota Dashboard** module gives the user a view of their current subscription status and allows them to manage it. It also surfaces quota usage and feature availability so users can see what their current plan entitles them to. This module is responsible for the subscription lifecycle UI — viewing active subscriptions, cancelling them, and dismissing terminal status banners.

### Key Characteristics
| Aspect | Implementation |
|--------|----------------|
| **Main Component** | `SubscriptionStatusBanner` (state machine renderer) |
| **Data Fetching** | `useSubscription` – queries `currentSubscription` and `quotas` |
| **Cancellation** | `cancelMutation` → invalidates `currentSubscription` & `currentUser` |
| **Banner Dismissal** | `useDismissable` hook backed by `localStorage` |
| **Quota Display** | Quotas endpoint aggregated into limits, usage, features, freezes |

### Module Scope
- **Subscription Banner**: Renders contextual banner for every subscription state.
- **Cancellation Flow**: Modal, confirmation, refund display.
- **Quota Dashboard**: Display limits vs. usage and enabled features.
- **Dismissal Logic**: Persistent hiding of terminal status banners.
- **FREE User Handling**: `getCurrent()` returns `null` gracefully (no error).

---

## 2. Business Rules

### 2.1 Cancellation Rules
1. Cancellation is **immediate** — there is no grace period UI.
2. The cancellation modal warns that features are "immediately revoked" and "remaining time will be forfeited."
3. Refund status is displayed in the result after cancellation.
4. Only non-FREE active subscriptions can be cancelled.

### 2.2 Banner Dismissal Rules
1. Terminal status banners (`cancelled`, `expired`, `payment_failed`) are dismissible via localStorage.
2. The dismissal key is `dismissed_sub_{subscriptionId}`, persisted across sessions.
3. Active and pending banners are **not** dismissible.

---

## 3. Frontend

### 3.1 Component Architecture

#### SubscriptionStatusBanner
**Responsibility:** Contextual banner displaying the current subscription state.

**State Machine Rendering:**
| Status | Render |
|--------|--------|
| `pending_payment` + `gateway_transaction_id` | "Payment Processing" — spinner, plan name, transaction ref |
| `pending_payment` (no gateway id) | "Payment Incomplete" — warning, retry button |
| `active` | "Active Subscription" — plan badge, expiry date, cancel button |
| `payment_failed` | "Payment Failed" — error, dismissible, retry button |
| `cancelled` / `expired` | "Subscription Cancelled/Expired" — warning, dismissible, upgrade button |

**Dismissal Logic:**
- Uses `useDismissable(storageKey)` where `storageKey = dismissed_sub_{subscriptionId}`.
- Dismissed banners are hidden via `localStorage` persistence.
- Only terminal states (`cancelled`, `expired`, `payment_failed`) are dismissible.

#### Cancel Modal (inline in PlanPage or SubscriptionStatusBanner)
- Confirmation dialog with warning about immediate revocation and lost time.
- Calls `cancelMutation.mutateAsync()`.
- On success, renders refund details (amount, refunded_at).

### 3.2 Hooks Architecture

#### useSubscription (relevant parts)
| Query Key | Fetcher | Config |
|-----------|---------|--------|
| `['currentSubscription']` | `getCurrent()` | `retry: false`, smart polling (only if pending & gateway id) |
| `['quotas']` | `getQuotas()` | `staleTime: 5min` |

**Mutations:**
| Mutation | Endpoint | OnSuccess |
|----------|----------|-----------|
| `cancel` | `DELETE /api/user/subscription` | Invalidates `['currentSubscription']` & `['currentUser']` |

#### useDismissable
**Responsibility:** Persistent dismissal state backed by `localStorage`.

**API:**
```typescript
const { isDismissed, dismiss } = useDismissable(storageKey: string);
```

**Behavior:**
- Checks `localStorage` for `storageKey === 'true'`.
- Also tracks in-memory `userDismissed` state for immediate UI feedback.
- `dismiss()` writes to both React state and `localStorage`.

### 3.3 Service Layer

| Method | HTTP | Endpoint | Response |
|--------|------|----------|----------|
| `getCurrent()` | GET | `/api/user/subscription` | `SubscriptionDetail \| null` (404 caught) |
| `cancel()` | DELETE | `/api/user/subscription` | `SubscriptionDetail` (with refund info) |
| `getQuotas()` | GET | `/api/user/subscription/quotas` | `QuotasData` |

**Error Handling:**
- `getCurrent()` catches `404` and `401` to return `null` instead of throwing. This allows FREE users (who have no subscription row) to use the app without error boundaries triggering.

### 3.4 Routing
Subscription management is embedded in `/plans` (cancellation) and `/dashboard` (banner, quota display). No dedicated route.

---

## 4. API Contract

### 4.1 Get Current Subscription
```http
GET /api/user/subscription
Authorization: Bearer (session cookie)
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
    "starts_at": "...",
    "expires_at": "...",
    "latest_payment": { "status": "success", "gateway_transaction_id": 12345, "amount": "9.99" }
  }
}
```
**Response 404:** Returns `null` in frontend.

### 4.2 Get User Quotas
```http
GET /api/user/subscription/quotas
Authorization: Bearer (session cookie)
```
**Response 200:**
```json
{
  "success": true,
  "data": {
    "plan": { /* PlanResource */ },
    "limits": { "max_active_habits": 15, ... },
    "usage": { "habits": 7, "groups": 0, "categories": 4 },
    "features": { "advanced_analytics": true, ... },
    "freezes": { "used": 1, "limit": 3, "unlimited": false },
    "allowed_habit_types": ["boolean", "numeric", "timer"]
  }
}
```

### 4.3 Cancel Subscription
```http
DELETE /api/user/subscription
Authorization: Bearer (session cookie)
```
**Response 200:**
```json
{
  "success": true,
  "data": {
    "subscription": { /* status: cancelled, plan: free */ },
    "refund": {
      "status": "refunded",
      "amount": "9.99",
      "refunded_at": "2026-06-25T15:00:00Z"
    }
  }
}
```

---

## 5. Flows

### 5.1 Cancellation Flow
```
Authenticated User on /plans (with active subscription)
           │
           ├──► SubscriptionStatusBanner shows "Active Subscription"
           ├──► User clicks "Cancel Plan"
           │      └── handleCancelRequest() → opens cancel modal
           │
           ├──► Cancel Modal renders
           │      ├── Warning: "immediately revoked", "remaining time forfeited"
           │      └── User clicks "Confirm Cancellation"
           │            └── handleConfirmCancel()
           │                  ├── cancelMutation.mutateAsync()
           │                  ├── Backend refunds + cancels
           │                  ├── OnSuccess: invalidateQueries(['currentSubscription', 'currentUser'])
           │                  └── UI updates to cancelled banner (with refund info)
```

### 5.2 Banner Dismissal
```
User sees "Subscription Expired" banner (terminal state)
           ├── Clicks close icon
           ├── dismiss() called: sets localStorage 'dismissed_sub_42' = 'true'
           └── Banner hidden from UI and future visits
```

---

## 6. Edge Cases

### 6.1 Dismissed Banner for New Subscription
**Scenario:** User dismisses an `expired` banner for `subscription_id = 5`. Later, they upgrade again and receive `subscription_id = 10` which also expires.
**Current Behavior:** The dismissal key is `dismissed_sub_10`, so the new banner is **not** dismissed.
**Impact:** Correct behavior — each subscription's terminal state is independently dismissible.

### 6.2 Cancellation During Active Polling
**Scenario:** User initiates an upgrade, is redirected to the bank, but before returning they open another tab and cancel their current subscription.
**Current Behavior:** The old subscription is cancelled. When they return from the bank, a new pending subscription exists. The payment may still succeed, activating the new subscription.
**Impact:** The user successfully upgrades despite the intermediate cancellation. This is acceptable but may confuse the user. (Handled by both Subscription Lifecycle and Payment modules, this module only triggers cancellation.)

### 6.3 FREE User Accessing Quota Endpoint
**Scenario:** FREE user navigates to a dashboard that calls `/api/user/subscription/quotas`.
**Current Behavior:** The backend resolves the FREE plan (no subscription row) and returns limits, usage, and features for FREE.
**Impact:** Works correctly. No error.

---

## 7. Notes & Recommendations

### 7.1 Type Safety for Quota Response
Ensure `QuotasData` interface matches the backend response exactly, including the `freezes` object and `allowed_habit_types` array.

### 7.2 Refund Display
The cancel response includes `refund` details. The cancellation modal should show a success state with the refund amount and date after the mutation succeeds, not just a generic message.