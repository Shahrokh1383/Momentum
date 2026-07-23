## 4. Module: Quota & Feature Gating

# Quota & Feature Gating — Technical Documentation

> **Project:** Momentum Application  
> **Backend:** Laravel (PHP 8.2+)  
> **Pattern:** Domain-Driven Design (DDD) with Service Layer  
> **Last Updated:** 2026-06-25

---

## 1. Overview

The **Quota & Feature Gating** module enforces real-time restrictions based on the user’s effective plan. It resolves the correct plan (even for FREE users with no subscription record), checks resource limits, feature flags, and habit type permissions, and throws typed exceptions when limits are exceeded.

### Key Characteristics
| Aspect | Implementation |
|--------|----------------|
| **Resolution** | Active subscription → `users.plan_slug` → FREE fallback |
| **Enforcement** | Middleware + Service layer (`PlanQuotaService`) |
| **Exceptions** | `QuotaExceededException` (HTTP 422) and `FeatureLockedException` (HTTP 422) |
| **Caching** | `PlanQuotaService` is a singleton; plan metadata cached forever |

### Module Scope
- **Plan Resolution**: Determine effective plan for any user.
- **Limit Checks**: Count resources and compare against plan limits.
- **Feature Flags**: Boolean gate checks (e.g., `has_smart_reminders`).
- **Habit Type Gating**: Validate habit creation against `allowed_habit_types`.
- **Middleware**: `EnsureTier` and `EnforceHabitPlanLimits`.
- **API Endpoint**: `/api/user/subscription/quotas` – aggregated quota, usage, features, freezes.
- **Quota Exceptions**: Structured error responses.

---

## 2. Business Rules

### 2.1 Quota Enforcement
1. **Source of Truth**: The user's active subscription determines the effective plan. If no active subscription exists, the denormalized `users.plan_slug` column is used, falling back to `FREE`.
2. **Quota Exceptions**: When a limit is exceeded, the system throws `QuotaExceededException` with the required upgrade plan.
3. **Feature Exceptions**: When a feature is accessed without the proper tier, the system throws `FeatureLockedException`.
4. **Habit Type Gating**: Creating a habit with a disallowed type throws `FeatureLockedException` pointing to the minimum required plan.

### 2.2 Plan Limits Interpretation
- A limit value of `-1` means **unlimited** for that resource.
- `allowed_habit_types` is a comma-separated string parsed to an array for validation.

---

## 3. Backend

### 3.1 Service Layer

#### `PlanQuotaService`
Singleton service (bound in `AppServiceProvider`) for real-time quota and feature resolution.

| Method | Responsibility |
|--------|----------------|
| `getPlan(User)` | Resolves effective plan via active subscription → `plan_slug` → FREE fallback. Cached forever by slug. |
| `getLimit(User, string)` | Returns integer limit for a given key (e.g., `max_active_habits`). Returns `-1` for unlimited. |
| `getUsage(User, string)` | Counts current resources (habits, groups, categories). Supports trashed/archived inclusion. |
| `isFeatureEnabled(User, string)` | Checks boolean feature flags on the effective plan. |
| `isHabitTypeAllowed(User, string)` | Parses `allowed_habit_types` CSV and checks membership. |
| `getMinimumPlanForHabitType(string)` | Finds the cheapest plan supporting a habit type (cached). |
| `getMinimumPlanForFeature(string)` | Finds the cheapest plan with a feature enabled (cached). |
| `getUpgradeRequiredPlan(Plan)` | Returns the next tier in the hierarchy. |
| `ensureLimitNotExceeded(...)` | Throws `QuotaExceededException` if limit reached. |
| `ensureFeatureIsEnabled(...)` | Throws `FeatureLockedException` if feature locked. |
| `resolveEffectiveSlug(User)` | Private. Source-of-truth logic for plan resolution. |

### 3.2 Middleware

#### `EnsureTier`
- Parameter: `tier` (string matching PlanSlug value).
- Checks if user has an active subscription with `level() >= requiredTier.level()`.
- Returns 403 if insufficient tier.
- Used on route groups: `expert`, `premium`.

#### `EnforceHabitPlanLimits` (alias: `habit.plan`)
- Applied to `POST /habits` and `PUT /habits/{habit}`.
- **Quota Check**: On POST, ensures `max_active_habits` not exceeded.
- **Habit Type Check**: Validates `type` against `allowed_habit_types`.
- **Smart Reminders Check**: If request contains multiple reminders or basic reminder time, validates `has_smart_reminders`.

### 3.3 Custom Exceptions

#### `QuotaExceededException` (HTTP 422)
Thrown when a user exceeds a plan limit. Response includes:
```json
{
  "success": false,
  "error": "quota_exceeded",
  "resource": "habits",
  "limit": 5,
  "used": 5,
  "upgrade_required": "expert"
}
```

#### `FeatureLockedException` (HTTP 422)
Thrown when a user accesses a locked feature. Response includes:
```json
{
  "success": false,
  "error": "feature_locked",
  "feature": "reminders",
  "required_plan": "expert"
}
```

### 3.4 Controllers

#### `SubscriptionController` (Quota endpoint only)
- `GET /api/user/subscription/quotas` → Aggregated quota, usage, feature flags, and freeze data. (The rest of this controller belongs to Subscription Lifecycle, but this endpoint is documented here as it is entirely quota-related.)

---

## 4. API Contract

### 4.1 Get User Quotas
```http
GET /api/user/subscription/quotas
Authorization: Bearer {token}
```
**Response 200:**
```json
{
  "success": true,
  "data": {
    "plan": { /* PlanResource */ },
    "limits": {
      "max_active_habits": 15,
      "max_groups": 3,
      "max_categories": 10,
      "max_freezes_per_week": 3,
      "max_photos_per_log": 5,
      "max_pdfs_per_month": 10
    },
    "usage": {
      "habits": 7,
      "groups": 0,
      "categories": 4
    },
    "features": {
      "advanced_analytics": true,
      "insights": true,
      "predictive_insights": false,
      "smart_reminders": true,
      "xp_booster": true
    },
    "freezes": {
      "used": 1,
      "limit": 3,
      "unlimited": false
    },
    "allowed_habit_types": ["boolean", "numeric", "timer"]
  }
}
```

---

## 5. Flows

### 5.1 Quota Enforcement Flow (Habit Creation)
```
User ──► POST /api/user/habits
           │
           ▼
    EnforceHabitPlanLimits (middleware: habit.plan)
           │
           ├──► ensureLimitNotExceeded('habits', 'max_active_habits')
           │      └── Throws QuotaExceededException if limit reached
           │
           ├──► isHabitTypeAllowed(type)
           │      └── Throws FeatureLockedException if type not allowed
           │
           └──► isFeatureEnabled('has_smart_reminders')
                  └── Throws FeatureLockedException if reminders locked
```

---

## 6. Edge Cases

### 6.1 Concurrent Quota Checks
**Scenario:** Two simultaneous requests to create a habit when the user is at `limit - 1`.
**Current Behavior:** Race condition may allow both requests to pass `ensureLimitNotExceeded()` before either habit is persisted.
**Impact:** Temporary quota overage.
**Mitigation:** Use database-level pessimistic locking or atomic increment counters for critical quota boundaries.

### 6.2 FREE Plan User Accessing Premium Route
**Scenario:** FREE user hits a route protected by `middleware('tier:premium')`.
**Current Behavior:** `EnsureTier` checks `$user->subscription?->isActive()`. For FREE users, `subscription` is null.
**Response:** 403 JSON with `subscription_required` error.

---

## 7. Notes & Recommendations

### 7.1 Performance
- `PlanQuotaService` is registered as a singleton, preventing redundant plan lookups within a single request.
- Plan metadata is cached forever by slug; remember to bust cache when modifying plan configurations.