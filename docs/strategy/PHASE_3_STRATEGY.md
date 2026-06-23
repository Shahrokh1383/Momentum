
### 📖 Phase 3: Single Source of Truth Implementation Plan


#### Step 3.1: Database Schema & Foundation
**Backend Implementation:**
*   Create migration to add feature flags to `habits` table (`mood_enabled`, `journal_enabled`, `photo_enabled`, `skip_enabled`).
*   Create migration to extend `habit_logs` (add `value` JSON, `skip_reason`, `mood`, `journal_entry`, `timer_duration`, `started_at`, `ended_at`, `offline_id`).
*   Create `journal_entries` table migration.
*   Create `habit_photos` table migration with foreign key cascades.
*   Update Laravel 12 Model casts: `habit_logs.value` => `array`, `habit_logs.mood` => `integer`.
*   Define Eloquent relationships (`HasMany` for photos, `BelongsTo` for user/habit).

**Frontend Implementation:**
*   Update TypeScript interfaces to match new backend DTOs.
*   Update Formik/Zod validation schemas to accommodate new nullable fields.

**Output/Deliverable:**
Running `php artisan migrate` successfully applies all tables. No UI is visible yet, but the data layer is strictly typed and ready. Database relationships are verified via Tinker.

#### Step 3.2: Polymorphic Log Creation & Feature Flags
**Backend Implementation:**
*   Update `HabitLogController::store()`.
*   Implement strict JSON schema validation based on `Habit.type`:
    *   `boolean`: `{"status": true}`
    *   `numeric`: `{"amount": 10}`
    *   `checklist`: `{"items": [true, false, true]}`
    *   `timer`: `{"duration": 300}`
*   Add FormRequest validation to reject `mood` if `habit.mood_enabled === false`, reject `journal_entry` if `habit.journal_enabled === false`.

**Frontend Implementation:**
*   Create the base skeleton for the **Log Modal** (`/habits/:id/log`).
*   Implement conditional rendering: If `mood_enabled` is false, hide the mood selector. If `journal_enabled` is false, hide the rich text notes.

**Output/Deliverable:**
A generic modal opens when clicking a habit. It displays a dynamic input based on the habit type. Submitting the form saves the raw log to the database. No advanced features (photos/timer) work yet.

#### Step 3.3: Skip Logic & Streak Recalculation
**Backend Implementation:**
*   Update `HabitLogController::store()` to accept `status: 'skipped'`. Validate that if status is skipped, `skip_reason` is required and not empty.
*   Refactor `StreakService`: Update the SQL query/Collection logic to treat `skipped` as a non-breaking event, but apply the **"Max 2 skips per 7 days"** rolling window rule to prevent streak exploitation.

**Frontend Implementation:**
*   Add a "Skip Today" button inside the Log Modal (only renders if `habit.skip_enabled === true`).
*   Clicking it opens a small sub-modal/dropdown with a text input for the reason.
*   Update the Habit Detail header to fetch and display the newly calculated, exploit-proof streak.

**Output/Deliverable:**
User can click "Skip Today", type a reason (e.g., "Sick"), and submit. The habit calendar shows that day as Yellow. The streak counter continues, but if they try to skip 3 times in one week, the backend returns a 403/422 and the streak breaks.

#### Step 3.4: Offline Sync & Conflict Resolution (Idempotency)
**Backend Implementation:**
*   Refactor `HabitLogController::store()` to handle the `offline_id` UUID.
*   *Correct Logic:* 
    1. Check if `offline_id` exists in the request.
    2. Query DB: `HabitLog::where('offline_id', $uuid)->orWhere('habit_id', X)->where('entry_date', Y)->first()`.
    3. If exists, enter Conflict Resolution:
        * If `is_delta: true` (numeric only): `$existing->value['amount'] += $incoming->value['amount']`.
        * Else (Boolean/Checklist/Numeric overwrite): Update existing record with incoming data.
        * Append `is_merged: true` to the response.
    4. If not exists, standard insert.

**Frontend Implementation:**
*   Generate a `uuidv4()` on the client side right before the API call and attach it to the payload.
*   If the response contains `is_merged: true`, show a small, non-intrusive toast notification: "Your data from another session has been merged."

**Output/Deliverable:**
If a user opens two browser tabs, logs a habit in Tab A, then logs the same habit in Tab B, Tab B does not crash. Instead, it merges the data intelligently (summing numbers if delta is true, overwriting if not) and returns success.

#### Step 3.5: Photo Evidence & Tiered Quotas
**Backend Implementation:**
*   Create `FileController::upload()`.
*   Implement `PlanQuotaService::canUploadPhoto($user, $habitLogId)`: Query `habit_photos` count for the log. Compare against `max_photos_per_log` (0 for Free, 5 for Expert, 999 for Premium).
*   Use Laravel's `Image Intervention` package to resize images to a max width/height of 1920px.
*   Store file in `storage/app/public/photos/{user_id}/{uuid}.jpg`.
*   Create DB record in `habit_photos`.

**Frontend Implementation:**
*   Integrate `react-dropzone` into the Log Modal for Drag & Drop.
*   **UI Quota Logic:** 
    *   Fetch user plan on app init.
    *   If `plan === 'free'`, completely remove the dropzone DOM element.
    *   If `plan === 'expert'`, show dropzone, but display a progress indicator: "3/5 photos used".
*   Show image previews before uploading.

**Output/Deliverable:**
A user on the Expert plan drags 4 photos into the log modal. The UI shows "4/5". They try to drag a 6th photo, the frontend disables the dropzone, and if forced via API, the backend returns a 403 Quota Exceeded error. Photos are resized and saved.

#### Step 3.6: Timer Habits Logic
**Backend Implementation:**
*   Update `HabitLogController` to accept `started_at`, `ended_at`, and `timer_duration`.
*   Add validation: `timer_duration` must equal the difference between `ended_at` and `started_at` (with a **±15 second tolerance** to account for web latency). If it deviates more than 15s, throw a 422 Validation Error (prevents manual tampering with the timer).

**Frontend Implementation:**
*   Build the Timer UI component (Digital clock display, Start, Pause, Stop buttons).
*   Use `setInterval` in React to count seconds.
*   On "Stop", capture `started_at` (from when Start was clicked) and `ended_at` (now), calculate duration, and send to backend.

**Output/Deliverable:**
User opens a Timer habit. Clicks start, waits 2 minutes, clicks stop. The UI shows "02:00". On submit, the backend verifies the timestamps match and saves the 120 seconds.

#### Step 3.7: Journal System & HTML Sanitization
**Backend Implementation:**
*   Create `JournalController`.
*   Implement HTML sanitization using `mews/purifier`. Define a custom Purifier definition that *only* allows `<b>, <i>, <ul>, <ol>, <li>, <p>, <br>`. Strip all `class`, `style`, and `id` attributes.
*   Create `JournalController::daily($date)` which fetches `journal_entries` for that date AND eager-loads related `habit_logs` (which also have `journal_entry` quick notes), merging them into a chronological collection based on `created_at`.

**Frontend Implementation:**
*   Install and configure `@tiptap/react` with the basic extensions (Bold, Italic, List, Bullet).
*   Build the `/journal` page layout (Date picker at top, timeline feed below).
*   Render the chronological feed. For rich text content coming from the backend (both journal and habit notes), use `dangerouslySetInnerHTML` as requested.

**Output/Deliverable:**
User navigates to `/journal`, picks a date. They see a timeline: "8:00 AM - Drank Water (Habit Note)", "9:30 PM - Daily Journal Entry". The journal entry renders with bold and italic text correctly. No XSS is possible because the backend stripped malicious tags.

#### Step 3.8: Habit Detail UI & Calendar Integration
**Backend Implementation:**
*   Create `HabitController::show($id)` which returns the habit data, its feature flags, and a monthly summary of logs (status, mood) for the selected month to avoid N+1 queries on the frontend.
*   Create `HabitAnalyticsController::stats($id)` to return aggregated data: total completions, completion rate %, best streak, average value (for numeric), and weekly comparison arrays.

**Frontend Implementation:**
*   Build the `/habits/:id` page.
*   Build the Monthly Calendar Grid. Map log statuses to colors: Green (completed), Yellow (skipped), Red (missed/past with no log), Gray (future). Add a visual "ring" around today's date.
*   Build the Stats Cards below the calendar (Total, Rate %, Best Streak, Avg Value).
*   Clicking a calendar day opens the Log Modal (built in Step 3.2) pre-filled if a log already exists.

**Output/Deliverable:**
A beautiful, data-rich habit detail page. The calendar visually tells the story of the month. Clicking a green day opens the modal showing exactly what the user logged that day.

#### Step 3.9: Habit Analytics Dashboard
**Backend Implementation:**
*   The backend logic for this was mostly completed in Step 3.8. We just need to ensure the `HabitAnalyticsController` formats the data specifically for Recharts (e.g., returning an array of `{day: 'Mon', value: 5}` for the trend line, and `{week: 'W1', target: 7, actual: 5}` for the bar chart).

**Frontend Implementation:**
*   Build the `/habits/:id/stats` tab/route.
*   Integrate `recharts`: `<LineChart>` for the 30-day trend, `<BarChart>` for the weekly comparison.
*   Add text-based insights (e.g., "Your best day is Tuesday", "You struggle on weekends") based on the analyzed data arrays.

**Output/Deliverable:**
A highly interactive analytics page. Users can see their momentum via line charts and compare their weekly consistency via bar charts, giving them deep insights into their behavior.

---
