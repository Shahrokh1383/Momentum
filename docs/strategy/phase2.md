
---

## Phase 2: Enhanced Data Model & Core Tracking (Weeks 3–4)

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

- **`streak_freezes`** *(Moved from Phase 4 to prevent schema dependency errors)*
  - `id` (PK)
  - `user_id` (FK → users.id, indexed, cascade delete)
  - `habit_id` (FK → habits.id, nullable, indexed, set null on delete)
  - `frozen_date` (date, indexed — the specific date being protected)
  - `used_at` (timestamp)
  - `reason` (varchar, nullable)
  - `created_at`

### Backend Logic

- **Timezone Handling (Architectural Fix):**
  - **NO dynamic modification of `config('app.timezone')`** via middleware to prevent race conditions in concurrent requests.
  - Create a global helper function `user_now($user = null)`: Returns `Carbon::now($user->settings->timezone ?? config('app.timezone'))`.
  - All "today", "yesterday", "isDueToday" calculations use `user_now()`.
  - `habit_logs.logged_date` is always stored in the user's local date (e.g., `user_now()->toDateString()`), NOT UTC.

- **Complex Scheduling & High-Performance Lookups (Habits):**
  - `HabitController`: `store()` validates `schedule` JSON structure based on `frequency`.
    - `daily`: Populates `due_days_of_week` string (e.g., "1,2,3,4,5").
    - `weekly`: Populates `due_days_of_week` string (e.g., "1" for Monday).
    - `custom`: Keeps `schedule` JSON for interval logic.
  - `isDueToday($habit)`: For `daily`/`weekly`, uses high-speed string search/check on `due_days_of_week` against `user_now()->format('N')`. For `custom`, parses JSON interval logic.

- **Automatic Missed Detection (Critical Timezone-Aware Fix):**
  - `MarkMissedHabitsCommand` (Artisan): **Runs every 15 minutes** via Laravel Scheduler to handle global timezone offsets safely.
  - Logic: Fetches active users. Calculates their "local yesterday" using `user_now($user)->subDay()->toDateString()`. Identifies habits due on that date where no `habit_log` exists (or exists with `status = pending`), and updates/creates a log with `status = missed`. The 15-minute interval ensures that even users in `UTC-12` are accurately processed *after* their local midnight has passed, without race conditions.

- **Reminder Dispatcher (Critical Addition):**
  - `DispatchRemindersCommand` (Artisan): Runs every minute via Scheduler.
  - Logic: Query habits where `reminder_time` is not null. Check if current UTC time matches the `reminder_time` adjusted for user's timezone offset. If match, broadcast a `ReminderDue` event via Laravel Reverb (or dispatch to a notification queue).

- **Streak Caching:**
  - `StreakService`: `calculate($habitId, $userId)` — fetches last 30 days of `habit_logs` for habit, computes consecutive `completed` days from `last_log_date` backward.
  - **Exclusions:** Excludes days marked as `skipped` OR days that exist in the `streak_freezes` table for that specific habit.
  - `HabitLogObserver`: on `created`/`updated`/`deleted`, triggers `StreakService::recalculate($habitId)`.
  - All read operations fetch streak from `streaks` table, never compute on the fly.

- **Archiving Logic:**
  - `HabitController`: `destroy()` sets `archived_at = now()`.
  - `restore()` sets `archived_at = null`.
  - `forceDelete()` permanently deletes habit + logs + streak.
  - Global scope `ActiveHabitScope` applies `whereNull('archived_at')` on all `Habit` queries unless explicitly removed.

- **Subscription-Aware Quotas (Enforcement):**
  - `HabitController::store()`: Calls `PlanQuotaService::canCreateHabit($user)` (Query: `count(habits where user_id = X and archived_at is null) < plans.max_active_habits` — e.g., 5 for free). If exceeded: 422 `{ error: 'quota_exceeded', resource: 'habits', limit: 5, used: 5 }`.
  - `HabitController::store()`: Calls `PlanQuotaService::canUseHabitType($type)`. Free users attempting to create `timer` or `checklist` types receive a 422 `{ error: 'feature_locked', feature: 'habit_type', required_plan: 'pro' }`.
  - `CategoryController::store()`: Calls `PlanQuotaService::canCreateCategory($user)` (e.g., 3 for free). If exceeded: 422 `{ error: 'quota_exceeded', resource: 'categories', limit: 3, used: 3 }`.

- **Categories CRUD & Soft Deletes:**
  - `CategoryController`: full CRUD. `destroy()` executes soft delete (`deleted_at = now()`). 
  - Global scope applied to ensure `whereNull('deleted_at')` is standard for all category queries.
  - `destroy()` checks if category has active habits. If yes: either move habits to `is_default = true` category or return 422 `{ error: 'category_has_habits', count: N }`.

- **Tags with Autocomplete:**
  - `TagController`: `index(q)` searches `tags` where `name LIKE %q%` and `user_id = auth()->id()`.
  - `store()` normalizes name to lowercase, prevents duplicates via unique slug per user.

- **Settings Management:**
  - `SettingsController`: `updateProfile()` (name, avatar, bio), `updatePreferences()` (timezone, theme, language).

- **Artisan Commands & Scheduler (Phase 2):**
  - **Command:** `habits:mark-missed` — Runs every 15 mins. Fetches active users, calculates "local yesterday" using `user_now($user)`, finds due habits with no log/pending log, and sets to `missed`. Safely covers global timezone offsets.
  - **Command:** `reminders:dispatch` — Runs every minute. Checks `reminder_time` against current UTC time adjusted for user timezone, fires `ReminderDue` event via Reverb.
  - **Scheduler:** Register both commands with their respective intervals in `Kernel.php`.

### Frontend Pages

- **`/dashboard` (Home)**
  - **Today's Habits Section**: List of habits due today. Each item: title, category color, streak flame + count, completion checkbox.
  - **Progress Overview Cards**: "Completed Today", "Pending Today", "Current Best Streak", "Total Active Habits".
  - **Quota Indicators (Free users)**: "Active Habits: 3/5", "Categories: 2/3". Progress bars.
  - **Upsell Banners/Tooltips**: Inline upgrade banner when free user has 4/5 habits. UI disables locked habit types (e.g., `timer`, `checklist`) in the Quick Add / Create modals with upsell tooltips directing to upgrade.
  - **Quick Add**: FAB disabled with tooltip if quota reached.

- **`/categories`**
  - Grid/List View with color strip, icon, habit count.
  - Create/Edit Modal: name, color picker, icon selector.
  - Delete Guard: Modal to move habits to Default or Cancel.

- **`/tags`**
  - Tag Cloud/List with colors.
  - Create Input with autocomplete.
  - Edit/Delete modals.

- **`/habits` (Habit Management)**
  - Active Habits Table: title, type, category, schedule, streak, actions.
  - Filters: category, tag, type.
  - Archive Button.
  - Create Habit Modal: Title, description, category, type, schedule builder, reminder time, target + unit. (Type selector grays out `timer`/`checklist` for free users with a lock icon and upsell tooltip).

- **`/settings`**
  - Profile Tab: Avatar upload, name, bio.
  - Preferences Tab: Timezone select, theme toggle, language.
  - Account Tab: Change password, Delete account.

- **`/archived`**
  - Grayed-out cards. Restore and Force Delete buttons.

### PWA Implementation (Phase 2)

- **Cache API Responses:**
  - Extend service worker to cache `/api/user/me`, `/api/user/habits`, `/api/user/categories` responses.
  - Strategy: Stale-while-revalidate (React Query handles this natively, SW acts as fallback).

- **Dexie Store Expansion:**
  - Initialize `momentum-db` using Dexie.js with stores: `habits`, `categories`, `tags`, `logs`.
  - React Query initial placeholder data populated from Dexie.
  
- **Offline Auth Session & Warnings:**
  - Store `last_verified_online_at` in the auth state within Dexie. 
  - If the app detects it is offline and the duration exceeds 24 hours, show a prominent UI warning: "Offline for an extended period. Plan status or quota limits may have changed."