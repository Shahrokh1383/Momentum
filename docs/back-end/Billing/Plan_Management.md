## 1. Module: Plan Management

---

# Plan Management — Technical Documentation

> **Project:** Momentum Application  
> **Backend:** Laravel (PHP 8.2+)  
> **Pattern:** Domain-Driven Design (DDD) with Service Layer  
> **Last Updated:** 2026-06-25

---

## 1. Overview

The **Plan Management** module defines the available subscription tiers, their hierarchy, limits, features, and pricing. It serves as the **configuration source** for all other Billing sub-modules and provides the API to list available plans to users.

### Key Characteristics
| Aspect | Implementation |
|--------|----------------|
| **Tiers** | `FREE` → `EXPERT` → `PREMIUM` |
| **Storage** | `plans` table – immutable configuration (no soft deletes) |
| **Key** | `slug` is the natural unique key used across the system |
| **Pricing** | Two price points: `price_monthly` and `price_yearly` |
| **Caching** | Plan metadata is cached forever by slug |

### Module Scope
- **Plan Definition**: Structure of a plan (name, slug, duration, limits, features, pricing).
- **Hierarchy & Rules**: Ordering of plans, interpretation of limits, feature flags, habit type allowance.
- **API Listing**: Public endpoint to return all plans with their limits, features, and pricing.
- **Cache Management**: Plan resolution caching and invalidation.

---

## 2. Business Rules

### 2.1 Plan Hierarchy
1. Plans are ordered by level: `FREE(0) < EXPERT(1) < PREMIUM(2)`.
2. Each plan defines hard limits (e.g., `max_active_habits`) and boolean feature flags (e.g., `has_smart_reminders`).
3. A value of `-1` for any limit indicates **unlimited** access.
4. The `allowed_habit_types` column is a comma-separated string (e.g., `"boolean,numeric"`) defining which habit types a user can create.

### 2.2 Immutability
- Plan records are treated as configuration; once a plan is published, its structure should not be altered without careful consideration, because changes retroactively affect all active subscribers (see Edge Cases).

---

## 3. Backend

### 3.1 Domain Model

#### Plan (`App\Models\Billing\Plan`)
| Field | Type | Purpose |
|-------|------|---------|
| `name` | string | Human-readable plan name |
| `slug` | string (unique) | Natural key (`free`, `expert`, `premium`) |
| `duration_months` | integer | Term length (1 for monthly, 12 for yearly) |
| `max_active_habits` | integer | Hard limit on active habits |
| `max_groups` | integer | Hard limit on groups |
| `max_freezes_per_week` | integer | Streak freeze weekly budget |
| `max_photos_per_log` | integer | Photo attachments per log entry |
| `max_pdfs_per_month` | integer | PDF export monthly budget |
| `max_categories` | integer | Custom category limit |
| `allowed_habit_types` | string (CSV) | Permitted habit types |
| `has_*` | boolean | Feature flags (analytics, insights, reminders, etc.) |
| `xp_multiplier` | decimal(3,2) | XP earning multiplier |
| `price_monthly` / `price_yearly` | decimal(10,2) | Pricing tiers |

**Relationships:**
- `subscriptions()`: HasMany via `plan = slug` (natural key join).

### 3.2 Enums

#### `PlanSlug` (enum `App\Enums\Billing\PlanSlug`)
```php
enum PlanSlug: string {
    case FREE = 'free';      // level 0
    case EXPERT = 'expert';  // level 1
    case PREMIUM = 'premium'; // level 2
}
```

### 3.3 Controllers

#### `PlansController`
- `GET /api/user/plans` → Returns all plans via `PlanResource`.

### 3.4 Database Schema

#### `plans` Table
- Natural key design: `slug` is unique and used as the foreign reference in other tables.
- No soft deletes; plans are considered immutable configuration.
- Cached forever with `Cache::rememberForever` by slug; cache must be busted manually when plans are modified.

---

## 4. API Contract

### 4.1 List Plans
```http
GET /api/user/plans
Authorization: Bearer {token}
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
      "limits": {
        "max_active_habits": 15,
        "max_groups": 3,
        "max_categories": 10,
        "max_freezes_per_week": 3,
        "max_photos_per_log": 5,
        "max_pdfs_per_month": 10,
        "allowed_habit_types": ["boolean", "numeric", "timer"]
      },
      "features": {
        "has_advanced_analytics": true,
        "has_insights": true,
        "has_predictive_insights": false,
        "has_smart_reminders": true,
        "has_xp_booster": true,
        "xp_multiplier": 1.5
      },
      "pricing": {
        "monthly": 9.99,
        "yearly": 99.99
      }
    }
  ]
}
```

---

## 5. Flows

_No specific flow is defined for this module; it is purely configuration-driven._

---

## 6. Edge Cases

### 6.1 Plan Configuration Changes
**Scenario:** Admin changes `EXPERT.max_active_habits` from 15 to 20.
**Current Behavior:** All existing `EXPERT` subscribers immediately receive the new limit because `planDetails()` resolves to the current `Plan` model.
**Impact:** Historical subscriptions retroactively adopt new limits.
**Mitigation:** Store a JSON snapshot of plan limits on the `subscriptions` table at the time of purchase to preserve historical entitlement boundaries.

---

## 7. Notes & Recommendations

### 7.1 Cache Busting
Plan metadata is cached forever using `Cache::rememberForever`. Whenever a plan configuration is changed (e.g., limits, features, pricing), the cache must be explicitly busted for that slug.

### 7.2 Historical Plan Snapshots (Architectural Improvement)
**Current Issue:** Changing a plan's limits retroactively affects all historical subscribers because `planDetails()` joins to the live `Plan` record.
**Recommendation:** Add a `plan_limits_snapshot` JSON column to the `subscriptions` table. Populate it during activation. Use this snapshot for quota enforcement instead of the live `Plan` model. This ensures past subscribers retain the limits they purchased.

---