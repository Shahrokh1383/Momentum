# 4. Billing-Auth Integration & Tier Indicators

# Billing-Auth Integration & Tier Indicators — Frontend Technical Documentation

> **Project:** Momentum Application 
> **Frontend:** React 19 + TypeScript + Vite  
> **State Management:** TanStack Query (v5) + Zustand  
> **Routing:** React Router v6  
> **Last Updated:** 2026-06-26

---

## 1. Overview

The **Billing-Auth Integration & Tier Indicators** module ensures that the user's authentication state and billing subscription state are kept in sync across the entire application. It provides visual tier badges and automatically polls subscription status to update the user's effective plan even when they are not on a billing-specific page.

### Key Characteristics
| Aspect | Implementation |
|--------|----------------|
| **Auth Hook** | `useCurrentUser` – fetches user object, derives plan booleans |
| **Smart Polling** | Re-fetches user & subscription every 5s when `status === pending_payment` |
| **Tier Badging** | `PremiumBadge` component in header & mobile drawer |
| **Derived State** | `isExpert`, `isPremium` booleans based on `active_plan` |
| **Auth Store** | Zustand – manages `pendingEmail`, `avatarVersion` |

### Module Scope
- **User Plan Synchronization**: Ensure `active_plan` on the user object stays in sync with the latest subscription.
- **PremiumBadge**: Visual indicator of current tier.
- **Smart Polling Logic**: Cross-cutting polling in `useCurrentUser` for billing state changes.
- **Auth State for Billing**: `isAuthenticated`, `isVerified` – used by plan selection (though no longer needed after dead code removal).
- **Route Protection**: Interplay between `ProtectedRoute` and billing routes (especially the `/payment-result` trap).

---

## 2. Business Rules

### 2.1 Authentication Boundary
1. **The entire application is authentication-gated.** All routes, including `/plans` and `/payment-result`, are wrapped in `<ProtectedRoute>`.
2. No unauthenticated user can access any billing page.
3. `ProtectedRoute` blocks unauthenticated users and unverified email users.
4. The auth hook `useCurrentUser` performs **smart polling** (5-second interval) when the user's subscription is in `pending_payment` state, ensuring the UI reacts to backend state changes even when the user is on other pages.

### 2.2 Tier Indicators
- `PremiumBadge` displays the current plan icon and color in the app header (desktop) and mobile drawer.

---

## 3. Frontend

### 3.1 Component Architecture

#### PremiumBadge
**Responsibility:** Visual tier indicator with icon and color.

| Plan | Icon | Color |
|------|------|-------|
| `free` | None | Default text |
| `expert` | `fa-star` | `#C0C0C0` (Silver) |
| `premium` | `fa-crown` | `#FFD700` (Gold) |

Used in `AppHeader` (desktop nav + mobile drawer) to indicate the user's current tier at a glance.

### 3.2 Hooks Architecture

#### useCurrentUser
**Responsibility:** Provides auth state and derives plan-related booleans.

**Derived Values:**
```typescript
const activePlan = user?.active_plan || 'free';
const isExpert = activePlan === 'expert' || activePlan === 'premium';
const isPremium = activePlan === 'premium';
```

**Smart Polling (Billing Sync):**
```typescript
refetchInterval: () => {
  const sub = queryClient.getQueryData<SubscriptionDetail>(['currentSubscription']);
  return sub?.status === 'pending_payment' ? 5000 : false;
}
```
This ensures the user object (which includes `active_plan`) stays in sync with subscription state changes even when the user navigates away from the billing pages.

### 3.3 State Management

#### Zustand (useAuthStore)
**Store shape (billing-relevant parts only):**
```typescript
interface AuthStoreState {
  pendingEmail: string | null;   // for verify-email page routing
  avatarVersion: number;        // cache-busting query param for avatar images
  setPendingEmail: (email: string | null) => void;
  bustAvatarCache: () => void;
}
```
The `avatarVersion` is used to force re-fetch of avatar images when plan changes may affect badges (indirectly related).

### 3.4 Routing

- `<ProtectedRoute>` wraps all routes, including billing routes.
- The `/payment-result` route is wrapped in `<ProtectedRoute>` which causes a critical issue (see Edge Cases).

---

## 4. API Contract

No dedicated endpoints; relies on:
- `GET /api/user/me` (implied by `useCurrentUser` returning `user.active_plan`)
- `GET /api/user/subscription` (for smart polling check via queryClient)

---

## 5. Flows

### 5.1 Smart Polling Across Pages
```
Authenticated User on /dashboard (not on billing page)
           │
           ├──► useCurrentUser hook is active
           ├──► refetchInterval checks currentSubscription status every 5s
           ├──► If status === 'pending_payment' + has gateway_id:
           │      ├── Re-fetches /api/user/me (active_plan sync)
           │      ├── Re-fetches /api/user/subscription (via queryClient)
           │      └── If status changes to 'active':
           │             └── Dashboard UI updates (PremiumBadge changes, quota display)
           └──► If status !== 'pending_payment':
                  └── Polling stops (interval = false)
```

### 5.2 Tier Badge Update After Upgrade
```
User completes upgrade → subscription becomes active
   ├── Smart polling (if still in pending phase) or next page load
   ├── useCurrentUser refetches user
   ├── active_plan changes from 'free' to 'expert'
   ├── isExpert becomes true
   └── PremiumBadge updates from nothing to star (silver)
```

---

## 6. Edge Cases

### 6.1 Session Expiry During Payment (Auth Perspective)
**Scenario:** User returns from Paymenter but session expired. `ProtectedRoute` redirects to login, stripping `transaction_id`.
**Impact:** Lost transaction reference; billing can't verify payment.
**Fix:** `/payment-result` must be made public or the redirect logic must preserve query params.

### 6.2 Smart Polling After Manual Navigation
**Scenario:** User initiates an upgrade, returns from HPP, but instead of staying on `/payment-result`, they navigate to `/settings`.
**Current Behavior:** `useCurrentUser` smart polling detects `pending_payment` and keeps polling. When payment is verified, the subscription becomes active, and the user's plan updates even on `/settings`.
**Impact:** Works correctly.

### 6.3 Unverified Email and Billing
**Scenario:** User with unverified email tries to access `/plans`.
**Current Behavior:** `ProtectedRoute` blocks unverified users and redirects to verify-email page.
**Impact:** Billing is effectively blocked for unverified users. This is intentional.

---

## 7. Notes & Recommendations

### 7.1 Route Protection Cleanup
**Problem:** `ProtectedRoute` on `/payment-result` causes the session expiry trap.
**Fix:** Remove protection from that specific route and handle auth inside the component, preserving `transaction_id`.

### 7.2 PremiumBadge Extensibility
If new tiers are added, `PremiumBadge` must be updated to include the new icon and color. Consider driving the badge from a plan configuration map.

### 7.3 Smart Polling Duration Cap
**Current Behavior:** Smart polling runs indefinitely as long as the subscription is `pending_payment`. If the payment is abandoned and the cron hasn't cleaned it up, the user polls forever.
**Recommendation:** Add a maximum polling duration (e.g., 5 minutes) to prevent resource waste.