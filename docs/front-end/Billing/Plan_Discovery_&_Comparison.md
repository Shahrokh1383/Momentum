# 1. Plan Discovery & Comparison

---

# Plan Discovery & Comparison — Frontend Technical Documentation

> **Project:** Momentum Application 
> **Frontend:** React 19 + TypeScript + Vite  
> **State Management:** TanStack Query (v5) + Zustand  
> **Routing:** React Router v6  
> **Last Updated:** 2026-06-26

---

## 1. Overview

The **Plan Discovery & Comparison** module presents the available subscription tiers to authenticated users. It renders a plan grid where users can compare limits, features, and pricing, and initiate upgrades (which then hand off to the Payment Flow module). It also enforces selection rules to prevent invalid upgrade attempts.

### Key Characteristics
| Aspect | Implementation |
|--------|----------------|
| **Component** | `PlanCard` – reusable card for each tier |
| **Page** | `PlansPage` (`/plans`) – protected route |
| **Data Fetching** | `useSubscription` (plans query) – TanStack Query, staleTime 5 min |
| **Plan Rendering** | Utility functions for limits, features, pricing, CTA text |

### Module Scope
- **Plan Listing**: Fetch and display all plans from `GET /api/user/plans`.
- **PlanCard UI**: Renders limits, features, pricing, and upgrade button.
- **Selection Logic**: Prevent selecting FREE, prevent re-selecting current plan.
- **Plan Comparison**: Grid layout for side-by-side tier evaluation.
- **Type Definitions**: `Plan` interface (consolidated from billing).

---

## 2. Business Rules

### 2.1 Authentication Boundary
1. **The entire application is authentication-gated.** All routes, including `/plans`, are wrapped in `<ProtectedRoute>`.
2. No unauthenticated user can access any page, including billing pages. There is no "public plan browsing" or "upgrade before registration" flow.

### 2.2 Plan Selection Rules
1. The `FREE` plan cannot be selected for upgrade (it is the default fallback).
2. Users cannot upgrade to their currently active plan.
3. The `PREMIUM` plan card is visually featured (highlighted) in the plan grid.
4. The current active plan card displays "Current Plan" and is disabled for selection.

---

## 3. Frontend

### 3.1 Component Architecture

#### PlanCard
**Responsibility:** Renders a single plan with limits, features, pricing, and CTA.

**Props Interface:**
```typescript
interface PlanCardProps {
  plan: Plan;
  isCurrent?: boolean;      // Disables CTA, shows "Current Plan"
  isFeatured?: boolean;     // Applies visual highlight (premium plan)
  isAuthenticated?: boolean;
  onSelect?: (plan: Plan) => void;  // Opens PaymentModal
  disabled?: boolean;     // Global disable during upgrade mutation
}
```

**Display Logic:**
- Limits are rendered via `getPlanLimits(plan)` which formats `-1` as "Unlimited".
- Features are rendered via `getPlanFeatures(plan)` which returns **hardcoded marketing copy** per plan slug.
- Price display uses `getPlanPriceDisplay(plan)` — returns "Free", `$X/month`, or "Contact us".
- CTA text uses `getPlanCtaText(isCurrent, isAuthenticated)`.

### 3.2 Hooks Architecture

#### useSubscription (relevant queries)
| Query Key | Fetcher | Config |
|-----------|---------|--------|
| `['plans']` | `getPlans()` | `staleTime: 5min` |

### 3.3 Service Layer

#### subscriptionService
| Method | HTTP | Endpoint | Response |
|--------|------|----------|----------|
| `getPlans()` | GET | `/api/user/plans` | `Plan[]` |

### 3.4 Routing

#### Route Definition (App.tsx)
```typescript
<Route path="/plans" element={<ProtectedRoute><PlansPage /></ProtectedRoute>} />
```

### 3.5 Type System

#### types/subscription.ts (Plan interface)
```typescript
interface Plan {
  id: number;
  name: string;
  slug: 'free' | 'expert' | 'premium';
  duration_months: number;
  limits: {
    max_active_habits: number;
    max_groups: number;
    max_freezes_per_week: number;
    max_photos_per_log: number;
    max_pdfs_per_month: number;
    max_categories: number;
    allowed_habit_types: string[];
  };
  features: {
    has_advanced_analytics: boolean;
    has_insights: boolean;
    has_predictive_insights: boolean;
    has_smart_reminders: boolean;
    has_xp_booster: boolean;
    xp_multiplier: number | null;
  };
  pricing: {
    monthly: string | null;
    yearly: string | null;
  };
  created_at: string;
}
```

> **Note:** The unified `Plan` type must be used across the entire frontend. A duplicate and incorrect definition exists in `types/user.ts` (with `pricing` as `number` and missing `duration_months`). Only `types/subscription.ts` is authoritative.

---

## 4. API Contract

### 4.1 List Plans
```http
GET /api/user/plans
Authorization: Bearer (session cookie)
```
**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Expert",
      "slug": "expert",
      "duration_months": 1,
      "limits": { "max_active_habits": 15, ... },
      "features": { "has_advanced_analytics": true, ... },
      "pricing": { "monthly": "9.99", "yearly": "99.99" }
    }
  ]
}
```

---

## 5. Flows

### 5.1 Plan Page Rendering
```
Authenticated User ──► /plans
           │
           ├──► useSubscription fetches plans
           │      └── queryKey: ['plans'], staleTime: 5min
           │
           ├──► PlansPage maps plans → PlanCard[]
           │      ├── FREE: CTA "Get Started" (no action, default plan)
           │      ├── Current plan: CTA "Current Plan" (disabled)
           │      └── Others: CTA "Upgrade" (enabled)
           │
           └──► User clicks "Upgrade" on a plan
                  └── handleSelectPlan(plan)
                        ├── If plan.slug === 'free' → return (no‑op)
                        ├── If isCurrent → return (no‑op)
                        └── setSelectedPlan(plan) → opens PaymentModal (handled by Payment Flow module)
```

---

## 6. Edge Cases

### 6.1 Plan Data Desynchronization
**Scenario:** Admin changes plan limits in the backend while a user is viewing `/plans`.
**Current Behavior:** The plan list has `staleTime: 5min`. The user may see stale data for up to 5 minutes.
**Impact:** User may make upgrade decisions based on outdated limits.
**Mitigation:** Reduce `staleTime` for the plans query, or implement a websocket/SSE push for plan configuration updates.

### 6.2 Plan Configuration Changes (from Backend)
**Scenario:** Admin changes `EXPERT.max_active_habits` from 15 to 20.
**Current Behavior:** The live `Plan` model is used; existing subscribers immediately see the new limit. The frontend only reflects the backend data, so it's consistent.
**Impact:** Users may be confused if they thought they bought a different limit. This is primarily a backend concern; frontend always displays the current data.

---

## 7. Notes & Recommendations

### 7.1 Critical Issue: Dead Unauthenticated Guard in PlansPage
**Problem:** `PlansPage.tsx` contains:
```typescript
const handleSelectPlan = (plan: Plan) => {
  if (!isAuthenticated) {
    navigate('/register');
    return;
  }
  // ...
};
```
Since the entire application is behind `ProtectedRoute` and `/plans` is explicitly wrapped, an unauthenticated user can never reach `PlansPage`. This guard is **unreachable dead code** and misrepresents the auth model.
**Fix:** Remove the `!isAuthenticated` check entirely. Remove the `isAuthenticated` prop from `PlanCard` as it is always `true`.

### 7.2 Architectural Improvement: Dynamic Feature Lists
**Problem:** `planUtils.ts` hardcodes marketing feature labels per plan slug. Adding a new tier requires a frontend deployment.
**Recommendation:** Add a `marketing_features` array to the backend `PlanResource` and map over it dynamically in `PlanCard`, replacing the hardcoded `getPlanFeatures()` function.

### 7.3 Type Consistency
**Problem:** `types/user.ts` defines a duplicate `Plan` interface with incorrect `pricing` types (`number` instead of `string`) and missing `duration_months`.
**Fix:** Delete the `Plan` and related interfaces from `types/user.ts`. Import all billing types from `types/billing.ts` or `types/subscription.ts`.
