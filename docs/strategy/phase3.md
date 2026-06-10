
---

## Phase 3: Advanced Habit Tracking & Journal (Weeks 5–6)

### Database Schema

**Table Updates:**

- **`habit_logs`** (Extended with rich context fields)
  - Add `value` (JSON, nullable) — `{"amount": 5}`, `{"duration": 900}`, `{"items": [true, false, true]}`
  - Add `skip_reason` (varchar, 255, nullable)
  - Add `mood` (tinyint unsigned, nullable, check 1-5)
  - Add `journal_entry` (longtext, nullable — sanitized HTML)
  - Add `timer_duration` (int, nullable, seconds)
  - Add `started_at` (timestamp, nullable)
  - Add `ended_at` (timestamp, nullable)
  - Add `offline_id` (UUID, nullable, unique) — *For offline sync idempotency*

- **`habits`** (Feature flags per habit)
  - Add `mood_enabled` (boolean, default false)
  - Add `journal_enabled` (boolean, default false)
  - Add `photo_enabled` (boolean, default false)
  - Add `skip_enabled` (boolean, default true)

**New Tables:**

- **`journal_entries`**
  - `id` (PK)
  - `user_id` (FK → users.id, indexed, cascade delete)
  - `entry_date` (date, indexed)
  - `title` (varchar, 255, nullable)
  - `content` (longtext, nullable — sanitized HTML)
  - `mood` (tinyint, nullable)
  - `created_at`, `updated_at`

- **`habit_photos`**
  - `id` (PK)
  - `habit_log_id` (FK → habit_logs.id, indexed, cascade delete)
  - `user_id` (FK → users.id, indexed, cascade delete)
  - `file_path` (varchar, 500)
  - `original_name` (varchar, 255)
  - `mime_type` (varchar, 50)
  - `file_size` (int, bytes)
  - `created_at`, `updated_at`

### Backend Logic

- **Polymorphic Logs:**
  - `HabitLogController::store()` validates `value` JSON schema based on parent `Habit.type`.

- **Offline Sync Conflict Resolution (Delta Updates Fix):**
  - If a request contains an `offline_id`, attempt to insert the log.
  - If a `QueryException` occurs due to the `unique_habit_log_per_day` constraint violation (meaning a log for this habit/date already exists, possibly created from another device), catch the exception.
  - Execute conflict resolution based on habit type:
    - For `boolean`/`checklist` habits: Last-write-wins (overwrite existing record with incoming payload).
    - For `numeric` habits: Calculate delta. Add incoming `value` to the existing `value` (prevents data loss from overlapping offline sessions, e.g., if offline log says 5 glasses and online log says 3 glasses, result is 8).
  - Return the updated log with an appended JSON flag: `{ ...log, is_merged: true }` so the frontend can notify the user or update local state accordingly.

- **Skip with Reason:**
  - `status` = `skipped` requires `skip_reason`.
  - `StreakService`: treats `skipped` as a non-breaking day.

- **Photo Evidence (Tiered Quotas):**
  - `FileController::upload()`. Storage path: `photos/{user_id}/{uuid}.jpg`.
  - **Quota check:** `PlanQuotaService::canUploadPhoto()` enforces `max_photos_per_log` based on user plan (0 for Free, 5 for Expert, Unlimited for Premium). Counts `habit_photos` for the specific `habit_log_id`. Free users are blocked from uploading; Expert users receive a 422 if the limit is exceeded.
  - Resize to max 1920px.

- **HTML Sanitization:**
  - Uses `mews/purifier`. Restricts to tags: b,i,ul,ol,li,p,br.

- **Timer Habits:**
  - Backend stores `timer_duration`, `started_at`, `ended_at`. Validates time delta (±5s tolerance).

- **Journal Aggregation:**
  - `JournalController::daily($date)` fetches logs + journal entries, merges chronologically. Eager-loads `habit_photos`.

### Frontend Pages

- **`/habits/:id` (Habit Detail)**
  - Header: title, category badge, streak flame, edit/archive buttons.
  - Monthly Calendar: green (completed), yellow (skipped), red (missed), gray (future), ring (today). Click opens Log Modal.
  - Stats Cards: total completions, rate %, best streak, avg value.

- **`/habits/:id/stats` (Habit Analytics)**
  - Trend Chart (Recharts line), Weekly Comparison (bar).
  - Best/Worst days text insights.

- **`/journal`**
  - Date picker navigation.
  - Daily Timeline feed of logs + entries.
  - Mood summary, Photo gallery with lightbox.
  - Add Journal Entry (TipTap rich editor).

- **`/habits/:id/log` or Modal (Log Entry)**
  - **Dynamic Input:** Boolean (toggle), Numeric (slider + input), Timer (digital display, start/pause/stop), Checklist (checkboxes + progress bar).
  - **Mood Selector:** 1-5 emojis (conditional on `habit.mood_enabled`).
  - **Photo Upload:** Drag-and-drop. UI is completely hidden for Free users. Expert users see a limit indicator (e.g., "3/5 photos used"). **Crucial PWA attribute:** `<input type="file" accept="image/*" capture="environment" />` to directly open mobile camera.
  - **Notes:** Mini rich text editor.
  - **Skip Button:** "Skip Today" → reason selector.

- **Secure HTML Rendering:**
  - When displaying `journal_entry` or `notes` from the backend, explicitly use React's `dangerouslySetInnerHTML` since the content is strictly pre-sanitized by `mews/purifier` on the backend to allow safe basic formatting.

### PWA Implementation (Phase 3)

- **Offline Mutation Queue (Dexie + Background Sync):**
  - If `navigator.onLine === false`, React Query mutation saves the payload (with a generated `offline_id`) into the Dexie `pending_mutations` store.
  - Register Background Sync: `navigator.serviceWorker.ready.then(reg => reg.sync.register('habit-sync'))`.
  - SW `sync` event reads from Dexie `pending_mutations` and POSTs to the backend. If the response contains `is_merged: true`, update the local React Query cache to reflect the server's merged state. Removes the mutation from Dexie on success.
  - Fallback: On app boot, if online and `pending_mutations` has items, flush the queue manually.

- **Photo Blob Storage (Fix for Quota Exceeded):**
  - Pending photos are stored as Blobs in the Dexie `pending_photos` store (NOT CacheStorage, preventing browser quota violations).
  - Client-side compression (`browser-image-compression`) is applied before saving the blob to Dexie.
  - LRU (Least Recently Used) eviction policy implemented for cached photo blobs to manage storage constraints.

- **Timer Offline Support:**
  - Timer runs via `setInterval`. If the app closes, save `timer_start` timestamp to `localStorage`. On reopen, calculate elapsed time and resume state.

- **Rich Text Auto-save:**
  - TipTap content saved to `localStorage` every 5 seconds to prevent data loss during extended writing sessions or sudden app closures.