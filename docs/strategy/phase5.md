
---

## Phase 5: Intelligence, Insights & Reports (Weeks 9–10)

### Database Schema

**Table Updates:**
- **`users`**
  - Add `pdfs_generated_this_month` (int, default 0)
  - Add `last_pdf_reset_at` (date, nullable)

**New Tables:**
- **`insights`**
  - `id`, `user_id` (FK, cascade), `type` (enum: `predictive`, `correlation`, `basic`, `tip`), `title`, `description`, `data` (JSON), `risk_score` (decimal, 5, 2, nullable), `habit_id` (FK, nullable), `generated_at`, `expires_at`
- **`correlations`**
  - `id`, `user_id` (FK, cascade), `habit_a_id` (FK, cascade), `habit_b_id` (FK, cascade), `correlation_type` (enum), `correlation_score` (decimal, 3, 2), `period_days`, `sample_size`, `insight_text`
- **`reports`**
  - `id`, `user_id` (FK, cascade), `type` (enum), `date_from`, `date_to`, `status` (enum: `pending`, `processing`, `completed`, `failed`), `file_path`, `file_size`, `downloaded_at`
- **`smart_reminders`**
  - `id`, `user_id` (FK, cascade), `habit_id` (FK, cascade), `suggested_time` (time), `confidence_score` (decimal, 3, 2), `is_enabled` (boolean)

### Backend Logic

- **Feature Flags per Plan (Strict 3-Tier Enforcement):**
  - **Free:** Basic 7-day stats only.
  - **Expert (Unlocks `has_advanced_analytics`):** Access to 1-year historical charts, Rule-based tips, and **Statistical Correlation Analysis** (pure math co-occurrence, no AI).
  - **Premium (Unlocks `has_predictive_insights` & `has_smart_reminders`):** Everything in Expert + **Predictive Risk Score** and **Smart Reminders**.
- **Predictive Analytics (Statistical & Configurable Fix - Premium Only):**
  - `InsightService::predictive($userId)`:
  - Calculate raw score using weights pulled from `config('momentum.insights.risk_weights')` (e.g., `['late_nights' => 10, 'weekend_misses' => 15, 'recent_misses' => 20]`). This makes the algorithm tunable without code changes.
  - **Normalize Score:** Apply min-max normalization or a logistic function to map the raw score strictly to a 0-100 percentage scale. Store normalized value in `risk_score`.
  - Generate text: "You have a {risk_score}% chance of breaking your streak tomorrow."
- **Correlation Analysis (Expert & Premium Only):**
  - `CorrelationService::analyze($userId, $habitAId, $habitBId)`:
  - Calculate co-occurrence $P(B|A)$ over 30 days.
  - If > 0.80 and sample >= 10: store positive correlation. Generate text.
- **Rule-Based Tips (Expert & Premium Only):**
  - `InsightService::generateTips($userId)`: Simple pattern matching (missed > 2, weekend drops, variance in timing). Returns tip objects.
- **Batched Insight Generation (OOM Prevention Fix):**
  - `InsightsGenerateCommand`: Instead of processing all users in a single memory-heavy loop, uses `User::chunkById(100, function($users) { ... })`.
  - Inside the chunk, dispatches an individual `GenerateUserInsightsJob` to the database queue for each user. This ensures memory stays flat regardless of user count.
- **PDF Reports (Queue-Based, Tiered Quotas & Rendering Fix):**
  - **Quotas:** Free 1/month, Expert 10/month, Premium Unlimited.
  - `ReportController::request()`: Validate dates, check quota (`pdfs_generated_this_month`), create `reports` record, dispatch `GeneratePdfJob`.
  - `GeneratePdfJob` (Dompdf):
    - **Architectural Fix:** Do NOT attempt to generate base64 chart images in PHP.
    - Instead, render HTML/CSS-based data visualizations (e.g., styled `<div>` bars representing completion percentages, styled HTML tables for stats).
  - Save to `storage/app/reports/{uuid}.pdf`. Update status.
- **Smart Reminders (Premium Only):**
  - `SmartReminderService::suggest()`: Find mode (most common hour) of completion for a habit over 30 days. Calculate confidence based on low variance.
- **Artisan Commands & Scheduler (Phase 5):**
  - **Command:** `insights:generate` — Chunks active users, dispatches queue jobs for rule-based insight/correlation generation.
  - **Command:** `pdf-quota:reset-monthly` — Sets `users.pdfs_generated_this_month = 0`.
  - **Command:** `reports:clean-old` — Deletes PDF files from disk older than 90 days.
  - **Scheduler:** Register `insights:generate` daily at 03:00, `pdf-quota:reset-monthly` monthly on 1st at 00:00, `reports:clean-old` weekly in `app.php`.

### Frontend Pages

- **`/insights`**
  - **Free:** 7-day trend charts. Blurred overlays for advanced features + "Unlock with Expert/Premium" buttons.
  - **Expert:** Correlation cards/charts, 1-year historical trends, and Rule-based tips list unlocked.
  - **Premium:** Predictive Risk gauge (color-coded percentage) and Smart Reminder suggestions unlocked.
  - *Global UI:* Grid layout. Recharts line/bar charts for visual trends.
- **`/reports`**
  - Request Form: Date range picker, presets.
  - Status Area: Spinner + "Generating..." while polling `/api/user/reports/{id}/status` every 3 seconds.
  - Download Section: Button appears on `completed`.
  - Report History table.
  - Quota Indicator based on the user's specific plan (e.g., "1/1 Used (Free)", "4/10 Used (Expert)").
- **`/settings/smart-reminders`** (Premium Only)
  - Per-habit suggestions: "Suggested time: 08:00 AM" + confidence bar.
  - Toggle to enable/disable.
- **`/admin/payment-logs`** (Dev-Only)
  - Table of real `payments`. JSON payload viewer modal for gateway responses.

### PWA Implementation (Phase 5)

- **Insights Offline Caching:**
  - Cache generated insights in Dexie (IndexedDB) with 24-hour TTL.
- **Report Request Queue:**
  - Queue report requests in `pending_mutations` (IndexedDB) if offline, submit on reconnect.
- **Smart Reminders (Local Notifications):**
  - If Web Push is not set up, use Service Worker `setTimeout` or `periodicSync` to trigger `registration.showNotification()` based on cached smart reminder times.

---