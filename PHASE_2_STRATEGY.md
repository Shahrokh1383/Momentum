
---

# Phase 2: Enhanced Data Model & Core Tracking (Dynamic Subscription-Aware Architecture)

## Core Architectural Foundation: The Subscription Engine
Before any feature is built, the mechanism for checking quotas must be established. 

**Backend Architecture:**
1. **User-Plan Relationship:** The `User` model must have a `plan()` relationship (BelongsTo). If a user has no plan, the system falls back to the 'Free' plan slug.
2. **PlanQuotaService:** A dedicated service class injected via Laravel's Service Container.
   - `getLimit(User $user, string $key): int` — Fetches the limit from `$user->plan->$key`. Handles `-1` (unlimited).
   - `getUsage(User $user, string $resource): int` — Counts current active resources.
   - `isFeatureEnabled(User $user, string $key): bool` — Checks boolean flags (e.g., `has_smart_reminders`).
   - `isHabitTypeAllowed(User $user, string $type): bool` — Parses the comma-separated `allowed_habit_types` column into an array and checks `in_array`.
3. **Standardized Quota Error Responses:** When a limit is exceeded, APIs return 422 with a universal format: 
   `{ "error": "quota_exceeded", "resource": "habits", "limit": 5, "used": 5, "upgrade_required": "expert" }`
   `{ "error": "feature_locked", "feature": "habit_type_timer", "required_plan": "expert" }`

**Frontend Architecture:**
1. **Quota Context/Store:** Frontend fetches a `/api/user/quotas` endpoint returning current usage and limits dynamically. UI components consume this context.
2. **No Hardcoded Limits:** If the UI needs to disable a button, it checks `quotaStore.habits.used >= quotaStore.habits.limit AND quotaStore.habits.limit !== -1`.

---


### Database Schema

**New Tables:**

- **`categories`**
  - `id` (PK)
  - `user_id` (FK → users.id, indexed, cascade delete)
  - `name` (varchar, 255)
  - `color` (varchar, 7 — hex color, e.g., "#4F46E5")
  - `icon` (varchar, 50 — Lucide/FontAwesome icon name)
  - `sort_order` (int, default 0)
  - `is_default` (boolean, default false — cannot be deleted)
  - `created_at`, `updated_at`, `deleted_at` (soft delete)

- **`habits`**
  - `id` (PK)
  - `user_id` (FK → users.id, indexed, cascade delete)
  - `category_id` (FK → categories.id, nullable, indexed, set null on delete)
  - `title` (varchar, 255)
  - `description` (text, nullable)
  - `type` (enum: `boolean`, `numeric`, `timer`, `checklist`, default `boolean`)
  - `schedule` (JSON — stores complex configs like `{"interval": 3, "start_date": "2024-01-01"}` for custom frequency)
  - `due_days_of_week` (varchar, 10, nullable — comma-separated ISO days, e.g., "1,2,3,4,5" for weekdays. Indexed for high-performance `isDueToday` lookups)
  - `frequency` (enum: `daily`, `weekly`, `custom`, default `daily`)
  - `reminder_time` (time, nullable)
  - `timezone` (varchar, default 'UTC')
  - `target_value` (decimal, nullable — e.g., 8 glasses, 5km)
  - `unit` (varchar, nullable — e.g., "glasses", "km", "minutes")
  - `is_active` (boolean, default true)
  - `archived_at` (timestamp, nullable) ← *Soft delete removed for habits. Archive is the ONLY way to hide them to prevent schema confusion.*
  - **`group_id` removed** — groups use `group_habits` pivot exclusively.
  - `created_at`, `updated_at`

- **`habit_logs`** (Basic structure — extended in Phase 3)
  - `id` (PK)
  - `habit_id` (FK → habits.id, indexed, cascade delete)
  - `user_id` (FK → users.id, indexed, cascade delete)
  - `logged_date` (date, indexed — user-local date)
  - `status` (enum: `pending`, `completed`, `missed`, `skipped`, default `pending`)
  - `notes` (text, nullable)
  - `created_at`, `updated_at`
  - *Indexes: `idx_habit_logs_habit_date` on `(habit_id, logged_date)`, `idx_habit_logs_status_date` on `(habit_id, logged_date, status)` for analytics.*
  - *Unique Constraint: `unique_habit_log_per_day` on `(habit_id, logged_date, user_id)` — **Critical for Offline Sync Conflict Resolution.***

- **`tags`**
  - `id` (PK)
  - `user_id` (FK → users.id, indexed, cascade delete)
  - `name` (varchar, 255)
  - `slug` (varchar, 255 — auto-generated lowercase)
  - `color` (varchar, 7, default "#6B7280")
  - `created_at`, `updated_at`

- **`habit_tag`** (Pivot)
  - `habit_id` (FK → habits.id, cascade delete)
  - `tag_id` (FK → tags.id, cascade delete)
  - Primary key composite (`habit_id`, `tag_id`)

- **`streaks`** (Cached streak data)
  - `id` (PK)
  - `user_id` (FK → users.id, indexed, cascade delete)
  - `habit_id` (FK → habits.id, unique, cascade delete)
  - `current_streak` (int, default 0)
  - `longest_streak` (int, default 0)
  - `last_log_date` (date, nullable)
  - `created_at`, `updated_at`

- **`streak_freezes`**
  - `id` (PK)
  - `user_id` (FK → users.id, indexed, cascade delete)
  - `habit_id` (FK → habits.id, nullable, indexed, set null on delete)
  - `frozen_date` (date, indexed — the specific date being protected)
  - `used_at` (timestamp)
  - `reason` (varchar, nullable)
  - `created_at`

## Sub-Phase 2.1: Foundations, Timezone & Settings

### 🛠 Backend
**What to Build:**
1. **Database Migrations:** Create all Phase 2 tables (`categories`, `habits`, `habit_logs`, `tags`, `habit_tag`, `streaks`, `streak_freezes`).
2. **Timezone Helper:** Create `user_now($user = null)`.
3. **Settings Controller & API:** `updateProfile()`, `updatePreferences()`.
4. **PlanQuotaService:** Implement the service and bind it in `AppServiceProvider`.

**Business Rules:**
- **NO dynamic `config('app.timezone')` modification.**
- `habit_logs.logged_date` is stored using `user_now()->toDateString()`.
- **Subscription Rule:** Timezone settings are global for all plans. No quota applied here.

**Expected Output:**
- All migrations run cleanly.
- `PlanQuotaService::getLimit($freeUser, 'max_active_habits')` dynamically returns `5` based on the DB seed.

### 🎨 Frontend
**What to Build:**
1. **Settings Page (`/settings`):** Profile, Preferences, Account tabs.

**Business Rules:**
- Timezone select populated dynamically from standard IANA list.

**Expected Output:**
- User updates timezone; API saves it. UI confirms update.

---

## Sub-Phase 2.2: Categorization & Tagging System (Subscription-Aware)

### 🛠 Backend
**What to Build:**
1. **CategoryController:** Full CRUD.
2. **TagController:** CRUD + Autocomplete.
3. **Custom FormRequest:** `StoreCategoryRequest` utilizes `PlanQuotaService`.

**Business Rules:**
- **Dynamic Category Quota:** Before creating a category, `PlanQuotaService::getLimit($user, 'max_categories')` is called. 
  - If the value is `-1`, creation is allowed (unlimited).
  - If `count(user->categories) >= limit`, abort with 422 `quota_exceeded`.
- **Category Deletion Guard:** Cannot delete if active habits exist.
- Default categories (`is_default = true`) cannot be deleted.

**Expected Output:**
- Free user creates 3 categories. On the 4th attempt, API returns 422 `{ "error": "quota_exceeded", "resource": "categories", "limit": 3, "used": 3 }`.
- Premium user (limit `-1`) creates categories indefinitely.

### 🎨 Frontend
**What to Build:**
1. **Categories Page (`/categories`):** Grid/List view, Create/Edit modals.
2. **Dynamic Quota UI:** Progress bar indicating category usage.

**Business Rules:**
- Read limits from Frontend Quota Store (fetched from API). 
- If `used >= limit` and `limit !== -1`, the "Add Category" button is disabled and shows an upsell tooltip: "Upgrade to Expert for more categories".

**Expected Output:**
- Free user sees "Categories: 2/3". At 3/3, the UI prevents creation and shows the upsell. Premium user sees no limit restriction.

---

## Sub-Phase 2.3: Habit Management & Scheduling (Subscription-Aware)

### 🛠 Backend
**What to Build:**
1. **HabitController:** CRUD + Archive/Restore/ForceDelete.
2. **ActiveHabitScope:** Global scope (`whereNull('archived_at')`).
3. **Schedule Logic:** `isDueToday()` method.
4. **Custom FormRequests:** `StoreHabitRequest`, `UpdateHabitRequest` utilizing `PlanQuotaService`.

**Business Rules:**
- **Dynamic Habit Quota:** `PlanQuotaService::getLimit($user, 'max_active_habits')` checked on `store()`. Archived habits do NOT count towards the quota (`whereNull('archived_at')`).
- **Dynamic Habit Type Restriction:** `PlanQuotaService::isHabitTypeAllowed($user, $type)` parses the `allowed_habit_types` CSV from the DB. 
  - Free user submits `timer` -> API checks 'boolean,numeric' -> Returns 422 `feature_locked`.
- **Smart Reminders Restriction:** If `PlanQuotaService::isFeatureEnabled($user, 'has_smart_reminders')` is false, user can only set 1 basic reminder per habit. If true, they can set multiple.

**Expected Output:**
- Free user creates 5 habits. 6th attempt returns 422 quota error.
- Free user attempts `type: 'timer'`, API returns 422 feature locked.
- Expert user creates up to 15 habits and uses `timer` type successfully.

### 🎨 Frontend
**What to Build:**
1. **Habits Page (`/habits`):** Active habits table, filters.
2. **Create Habit Modal:** Schedule builder, type selector, reminder input.
3. **Archived Page (`/archived`):** Grayed-out cards.

**Business Rules:**
- **Dynamic Type UI:** The type selector dropdown queries the Quota Store for allowed types. Disallowed types are grayed out with a lock icon and upsell tooltip.
- **Dynamic FAB:** Quick Add FAB is disabled if quota is reached.
- **Smart Reminders UI:** If `has_smart_reminders` is false in the Quota Store, hide the "Add another reminder" button.

**Expected Output:**
- UI dynamically adapts to the user's plan. A Free user sees locked types; an Expert sees them as available. Quotas update in real-time on the dashboard.

---

## Sub-Phase 2.4: Tracking, Streaks & Automation (Subscription-Aware)

### 🛠 Backend
**What to Build:**
1. **HabitLogController:** Create/Update logs.
2. **StreakService:** `calculate()` and `recalculate()`.
3. **HabitLogObserver:** Triggers streak recalculation.
4. **StreakFreezeController:** Apply a freeze to a specific date.
5. **Artisan Commands:** `habits:mark-missed`, `reminders:dispatch`.

**Business Rules:**
- **Unique Log Constraint:** One log per `habit_id`, `logged_date`, `user_id`.
- **Dynamic Streak Freeze Quota:** When a user applies a streak freeze, check `PlanQuotaService::getLimit($user, 'max_freezes_per_week')`. If they have used >= limit for the current week, return 422 `quota_exceeded` for `streak_freezes`. `-1` means unlimited.
- **XP Multiplier Integration (Prep for later):** When a habit is completed, if you dispatch an event, attach the `$user->plan->xp_multiplier` dynamically.
- **Mark Missed Logic:** Runs every 15 mins, calculates "local yesterday", sets pending/due habits to `missed`.

**Expected Output:**
- Logging a habit updates the `streaks` table.
- Free user applies 1 freeze. 2nd attempt in the same week returns 422. Premium user applies freezes freely.
- Artisan commands accurately process timezones and update logs.

### 🎨 Frontend
**What to Build:**
1. **Log Interaction UI:** Checkboxes/Inputs on the habits list.
2. **Streak Display:** Flame icon + count.
3. **Freeze Button:** UI to apply a freeze to a missed day.

**Business Rules:**
- Apply Freeze button checks the Quota Store for `max_freezes_per_week`. If limit reached, button shows lock/upsell.
- Optimistic UI updates for checking off habits, with revert on API error.

**Expected Output:**
- User checks off habit, streak increments immediately.
- Free user sees "Freezes: 1/1" and is blocked from using more without upgrading.

---

## Sub-Phase 2.5: Dashboard & Dynamic Quota Indicators

### 🛠 Backend
**What to Build:**
1. **DashboardController:** Aggregation endpoint for today's data + dynamic quota payload.
2. **UserQuotaController:** Dedicated endpoint `/api/user/quotas` that maps the user's plan limits vs. current usage.

**Business Rules:**
- The `UserQuotaController` must dynamically build a response like:
  ```json
  {
    "habits": { "used": 3, "limit": 5, "unlimited": false },
    "categories": { "used": 2, "limit": 3, "unlimited": false },
    "freezes": { "used": 0, "limit": 1, "unlimited": false },
    "allowed_habit_types": ["boolean", "numeric"],
    "features": { "has_smart_reminders": false, "has_advanced_analytics": false }
  }
  ```
  This ensures the frontend never hardcodes plan logic.

**Expected Output:**
- `GET /api/user/quotas` returns accurate, dynamic limits parsed directly from the `plans` table for the authenticated user.

### 🎨 Frontend
**What to Build:**
1. **Dashboard Page (`/dashboard`):** Today's Habits list, Progress Overview Cards.
2. **Dynamic Quota Indicators:** UI components that read from the Quota Store.

**Business Rules:**
- **Quota Indicators:** Progress bars render dynamically based on the JSON payload. If `unlimited: true`, show an infinity icon (∞) instead of a progress bar.
- **Upsell Banners:** Show inline upgrade banners *only* when `used >= limit * 0.8` (80% threshold) and `unlimited === false`.

**Expected Output:**
- Dashboard perfectly reflects the user's current plan restrictions.
- If the database `plans` row is updated (e.g., Free habits changed from 5 to 7), the Dashboard progress bar and limits update automatically on the next API fetch without any frontend deployment required.