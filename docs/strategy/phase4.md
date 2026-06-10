
---

## Phase 4: Gamification, Social & Real-time (Weeks 7–8)

### Database Schema

**Table Updates:**
- **`users`**
  - Add `total_xp` (bigint unsigned, default 0)
  - Add `current_level` (int unsigned, default 1)
  - Add `xp_booster_active_until` (timestamp, nullable)
  - Add `xp_booster_multiplier` (decimal, 3, 2, default 1.00)
- **`habits`**
  - Add `xp_weight` (int, default 10)

**New Tables:**
- **`xp_transactions`**
  - `id`, `user_id` (FK, indexed, cascade), `source_type` (varchar), `source_id` (bigint, nullable), `amount` (int), `multiplier` (decimal), `description`, `created_at`
- **`levels`**
  - `id`, `level_number` (unique), `xp_required` (int), `title` (varchar), `icon` (varchar, nullable)
- **`badges`**
  - `id`, `name`, `slug` (unique), `description`, `icon`, `criteria_type` (enum), `criteria_value` (int), `xp_reward`, `requires_premium` (boolean), `created_at`, `updated_at`
- **`user_badges`**
  - `id`, `user_id` (FK, cascade), `badge_id` (FK, cascade), `earned_at`, `seen` (boolean, default false)
- **`friends`**
  - `id`, `requester_id` (FK, indexed), `addressee_id` (FK, indexed), `status` (enum: `pending`, `accepted`, `blocked`), `created_at`, `updated_at`
  - *Indexes: `idx_friends_requester` on `(requester_id, status)`, `idx_friends_addressee` on `(addressee_id, status)`*
- **`challenges`**
  - `id`, `title`, `description`, `start_date`, `end_date`, `target_metric`, `created_by`, `created_at`, `updated_at`
- **`challenge_participants`**
  - `id`, `challenge_id` (FK, cascade), `user_id` (FK, cascade), `progress`, `completed_at`, `created_at`
- **`groups`**
  - `id`, `name`, `description`, `invite_code` (unique), `created_by`, `created_at`, `updated_at`
- **`group_members`**
  - `id`, `group_id` (FK, cascade), `user_id` (FK, cascade), `role` (enum: `admin`, `member`), `joined_at`
- **`group_habits`**
  - `id`, `group_id` (FK, cascade), `habit_id` (FK, cascade), `created_at`
- **`leaderboard_entries`** (Computed snapshots)
  - `id`, `user_id` (FK, cascade), `period_type` (enum: weekly, monthly), `category_id` (FK, nullable), `total_xp` (bigint), `total_completions` (int), `tie_breaker_timestamp` (timestamp — records the exact time the user reached this XP to resolve ties), `created_at`
- **`notifications`**
  - `id` (PK)
  - `user_id` (FK → users.id, indexed, cascade delete)
  - `type` (varchar, 100 — e.g., 'level_up', 'badge_earned', 'friend_request')
  - `title` (varchar, 255)
  - `body` (text, nullable)
  - `data` (JSON, nullable — stores related IDs, e.g., `{ "badge_id": 5 }`)
  - `read_at` (timestamp, nullable)
  - `created_at`

### Backend Logic

- **XP & Levels (Event-Driven with Tiered Multipliers):**
  - `HabitLogCreated` → `AddXpListener`: Applies `plans.xp_multiplier` (1x Free, 1.5x Expert, 2x Premium) combined with any active `xp_booster_multiplier`. Inserts transaction, increments `total_xp` → `LevelUpListener`: Checks `levels` table, increments `current_level`, fires `LevelUpEvent`.
- **Social Quotas (Groups):**
  - `GroupController::join()` enforces `max_groups` limit based on the user's subscription plan (0 Free, 3 Expert, Unlimited Premium). Returns 403 if the limit is reached.
- **Badge System:**
  - `BadgeEvaluatorService`: `evaluate($userId)` iterates unearned badges, checks criteria (streaks, completions, early bird logs before 8 AM local time).
  - If met: inserts `user_badges`, adds XP, creates a `notification` record.
- **Streak Freeze (Subscription-Linked):**
  - `StreakFreezeController::use($habitId, $date)`:
  - Count freezes for the ISO week of `$date` in user's timezone.
  - Check against `plans.max_freezes_per_week` (0 Free, 3 Expert, 7 Premium). If under limit, insert into `streak_freezes`. If limit reached: 403.
- **Group Streak Logic (Architectural Fix):**
  - `GroupStreakService::recalculate($groupId)` calculates the **Daily Group Completion Rate** for the last `N` days. If >= 80% of active members completed the group habit on a specific day, that day counts toward the group streak. If a day drops below 80%, the group streak resets to 0.
- **Leaderboard Computation & Tie-Breaking:**
  - `LeaderboardComputeCommand`: Aggregates XP/completions. When inserting into `leaderboard_entries`, populates `tie_breaker_timestamp` with the timestamp of the user's most recent qualifying activity.
  - Query ordering: `ORDER BY total_xp DESC, tie_breaker_timestamp ASC` (The user who reached the XP score first ranks higher).
- **Artisan Commands & Scheduler (Phase 4):**
  - **Command:** `leaderboard:compute --period={weekly|monthly}` — Aggregates XP/completions, populates `leaderboard_entries` including `tie_breaker_timestamp`.
  - **Scheduler:** Register weekly (Sunday 23:59) and monthly (Last day 23:59) runs in `Kernel.php`.
- **Real-time Broadcasting (Laravel Reverb):**
  - Events: `HabitCompleted`, `LevelUpEvent`, `FriendRequestEvent`, `BadgeEarnedEvent`.
  - Broadcasts on private channels: `private-user.{id}`.
- **Notifications:**
  - `NotificationController::index()`: Returns paginated unread/read notifications.
  - `NotificationController::markAsRead($id)`: Sets `read_at = now()`.
- **Friend Privacy:**
  - `UserController::publicProfile($userId)` respects `profile_visibility` and `friends` table status.

### Frontend Pages

- **`/profile`**
  - Profile Card: avatar, name, level badge, animated XP bar (current / next level XP), **dynamic XP multiplier badge** (showing 1x, 1.5x, or 2x based on subscription).
  - Stats Grid: Total Habits, Completions, Longest Streak, Total XP.
  - Level-Up Animation: Confetti if `seen = false`.
  - Badges Showcase: Earned (color), Locked (grayscale), Premium locked (blurred + ribbon).
  - XP Booster Widget: Activate button or countdown timer.
- **`/friends`**
  - Search bar, Pending requests (Accept/Decline), Friends list, Activity feed (respects privacy).
- **`/challenges`**
  - Active/Available/My tabs. Progress bars, join/leave buttons.
- **`/leaderboard`**
  - Tabs (Global/Premium), Period (Weekly/Monthly), Category filter.
  - Top 3 Podium (Gold/Silver/Bronze). Highlighted "Your Rank" row at bottom.
  - Tie indicator (e.g., "Reached 2 hours ago") displayed next to tied scores.
- **`/groups`**
  - My Groups, Create Group modal, Group Detail (group streak, members, invite code, shared habits).
  - Join Group via invite code.
  - **Hard locked for Free users (UI hides join/create or shows paywall). Limit indicators for Expert tier users.**
- **Notification Dropdown (Global Layout)**
  - Bell icon in Header. Listens to Laravel Reverb `private-user.{id}` channel.
  - Drops down list of notifications. Clicking marks as read and navigates to relevant content.

### PWA Implementation (Phase 4)

- **Service Worker Update Flow (Fix for Stale Apps):**
  - On new deployment, Workbox detects new precache manifest.
  - SW fires `SKIP_WAITING` message. React displays global toast: "A new version is available. Refresh to update."
  - User clicks → `navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' })` → `window.location.reload()`.
- **Social Data Caching:**
  - Cache friends, challenges, groups in IndexedDB (using Dexie) for offline reading.
- **Sync Queue for Social Actions:**
  - Friend requests/challenge joins queued in IndexedDB (`pending_mutations` table) if offline, synced upon network restoration.
- **Real-time via Service Worker:**
  - Use `navigator.serviceWorker` to listen for push events (if Web Push configured later) or rely on active Reverb WebSocket connection when app is open.

---