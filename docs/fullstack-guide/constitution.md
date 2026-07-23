# 🏛️ THE MOMENTUM FULLSTACK IMMUTABLE CONSTITUTION
### Single Source of Truth (SSOT) for Architecture, Development, and Refactoring

This document is immutable. It defines the strict boundaries, workflows, and unbreakable rules of the **entire Momentum codebase (backend + frontend)**. Any developer or AI assistant must adhere strictly to these laws to prevent architectural degradation, prop-drilling, and state management bloat.

---

## I. Core Philosophies & Unbreakable Principles
The Momentum stack is built on a unified Domain-Driven, highly decoupled architecture. Every line of code — server-side or client-side — must respect:

1. **SRP (Single Responsibility):** Every class, file, hook, component, and function must have exactly ONE reason to change.
2. **KISS (Keep It Simple Stupid):** Leverage framework-native capabilities (Laravel FormRequests, self-rendering exceptions, API Resources; React Query for server state). No unnecessary custom abstractions.
3. **DRY:** Shared logic extracted into Traits (`HasApiResponse`), Base Controllers, pure utility functions, or custom hooks — never duplicated.
4. **SOLID:** Strict dependency injection (Constructor Injection on backend, prop/action injection on frontend), Open/Closed via conditional rendering and extensible services.
5. **Bounded Context Isolation (Backend) & Domain Isolation (Frontend):**  
   - Backend domains (**Identity, Habit, Billing, Streak, Taxonomy**) must NOT leak logic. Cross-domain communication only via injected Services (sync) or Events/Listeners (async).  
   - Frontend domains (**Auth, Billing, Habits, Categories, Profile**) are strictly siloed. No cross-domain state leakage.

---

## II. The Golden Rule: Strict File-Isolation (The "No-Bloat" Mandate)
*When introducing any new capability, you MUST create NEW files rather than bloating existing ones.*

**Allowed Modifications:** You may ONLY modify an existing file if the new logic fits exactly that file’s pre-defined Single Responsibility (e.g., adding a validation rule to an existing `StoreHabitRequest`, or a new route to `App.tsx`).

**Forbidden:** Adding new business logic, API endpoints, modal states, or domain calculations that dilute the file’s primary purpose.

**Examples:**
- **PDF Export feature:** Create `HabitExportService.php`, `HabitExportController.php`, `ExportHabitRequest.php` on backend; `useHabitExport.ts`, `habitExportUtils.ts`, `ExportButton.tsx` on frontend.
- **New form wizard:** Split into `useWizardActions.ts`, `StepOne.tsx`, `StepTwo.tsx` — never jam everything into one page.

This ensures files remain small, highly cohesive, strictly SRP-compliant, and infinitely easier to debug and test.

---

## III. The Fullstack Request-Response & Data Flow Lifecycle
Every feature flows through a strict, unidirectional chain. Skipping a layer is forbidden.

### A. Backend (Laravel DDD)
1. **Route** (`routes/api/*.php`) – defines endpoint, applies `auth`, `throttle`, domain middleware (`habit.plan`, `tier`).
2. **Middleware** – gatekeepers for quotas, feature flags, access rights (e.g., `EnforceHabitPlanLimits`). Rejects early with 403/422.
3. **FormRequest** – validates input, handles authorization. Returns `422` automatically.
4. **Controller** – extremely thin. Extracts validated data, delegates to Service, returns standardized JSON via `HasApiResponse` trait.
5. **Service** – core business logic. Orchestrates domain rules, calls other Services. NEVER touches HTTP or raw SQL.
6. **Model** – encapsulates state, relationships, scopes, basic domain checks (e.g., `Habit::isDueToday()`).
7. **Resource** (`JsonResource`) – transforms model into strict JSON schema. Uses `whenLoaded` for conditional relations.
8. **Observer/Event** – post-action side-effects (streaks, emails) handled automatically; never called manually from Controller.

### B. Frontend (React + TanStack Query)
1. **Service** (`services/user/[domain]Service.ts`) – raw Axios transport. Zero business logic.
2. **Data Hook** (`hooks/[domain]/use[Domain].ts`) – wraps service in React Query (`useQuery`, `useMutation`). Returns data/mutations, handles cache invalidation.
3. **Action Hook** (`hooks/[domain]/use[Domain]PageActions.ts`) – manages UI state (modals, loading flags) and bundles actions into clean objects (`habitActions`, `logActions`) to prevent prop-drilling.
4. **Page** (`pages/[domain]/[Domain]Page.tsx`) – layout composer. Renders grids, modals, banners. Zero business logic.
5. **Component** (`components/user/[domain]/*.tsx`) – receives data and bundled actions via props. Pure UI.

**Critical Connection:** Backend Resources define the data contract that frontend Services consume. Frontend Zod schemas mirror backend FormRequests.

---

## IV. Step-by-Step Guide: Adding a New Feature (Fullstack)
Follow this unified sequence to maintain architectural integrity across the stack.

1. **Identify the Bounded Context/Domain** (Identity, Habit, Billing, etc.).
2. **Define the contract:**
   - Create/Update backend `FormRequest` and `Resource`.
   - Define/update frontend TypeScript types (`src/types/[domain].ts`) and Zod schemas (`src/validation/[domain]Schema.ts`).
3. **Backend – Create the Request Handler:**
   - `FormRequest` (validation)
   - `Service` (if new logic violates SRP)
   - `Controller`
   - `Resource` (if new shape needed)
4. **Backend – Wire up:**
   - Add route in `routes/api/user.php` with appropriate middleware.
   - Register side-effects via Events/Listeners or Observers in `AppServiceProvider::boot()`.
5. **Frontend – Create the data layer:**
   - Service function in `services/user/[domain]Service.ts`.
   - Data Hook (React Query) in `hooks/[domain]/use[Domain].ts`.
   - Pure utilities (payload transformations, optimistic math) in `src/utils/[domain]/`.
6. **Frontend – Create the UI layer:**
   - Action Hook (`use[Domain]PageActions.ts`) for UI state and bundled actions.
   - Atomic components in `components/user/[domain]/`.
   - Compose everything in the Page component.

---

## V. Step-by-Step Guide: Debugging & Refactoring (Fullstack)
Use this end-to-end trace methodology to locate bugs quickly.

### Backend Trace
1. **Route** → identify Controller and Middleware.
2. **Middleware** – if 403/422 quotas/tiers, inspect `EnforceHabitPlanLimits`, `EnsureTier`, `PlanQuotaService`.
3. **FormRequest** – if validation error, inspect the specific Request.
4. **Controller** – verify correct delegation to Service.
5. **Service** – 90% of business logic bugs. Check domain rules, quota calls, transaction boundaries.
6. **Observer/Event** – if side-effect missing, check registrations and Observer/Listener code.

### Frontend Trace
1. **Visual/Layout** → inspect Page & Components, CSS classes.
2. **Action not triggering / modal not opening** → inspect Action Hook (`use[Domain]PageActions.ts`).
3. **Stale data / caching** → inspect Data Hook: `queryKey`, `invalidateQueries` calls.
4. **API failure / 422** → inspect Service, ensure `handleLaravelValidationErrors` maps keys correctly.
5. **Optimistic glitch** → inspect utility (`[domain]Optimistic.ts`), check `onMutate` snapshot and `onError` rollback.

### Refactoring Strategy
If any Service, hook, or component exceeds ~150 lines (violating SRP), apply the **File-Isolation Mandate** immediately. Break into specialized files: e.g., split `HabitService` into `HabitLifecycleService` and `HabitSchedulingService`, or a large `useHabits.ts` into `useHabitList` and `useHabitMutations`.

---

## VI. Domain-Specific Mandates

### 1. Billing & Quotas (Fullstack)
- **Backend:** `PlanQuotaService` is the **absolute Source of Truth** for limits. No hardcoded limits anywhere. Always call `ensureLimitNotExceeded()` / `ensureFeatureIsEnabled()`.
- **Frontend:** **Smart Polling** is the UI bridge for async billing. Use `refetchInterval` based on status (e.g., `status === 'pending_payment' ? 5000 : false`). Webhooks update the database; Smart Polling updates the screen. NEVER bypass the backend to verify payment directly.

### 2. Exception Handling (Backend)
- Domain exceptions MUST implement `render()` to return standardized JSON (e.g., `QuotaExceededException`). Let Laravel’s exception handler manage them globally; never catch in Controllers.

### 3. Timezones & Dates (Backend)
- NEVER use `now()` directly. ALWAYS use the `user_now($user)` helper or Carbon set to user’s timezone to prevent DST and midnight boundary bugs.

### 4. Streaks & Complex Calculations (Backend)
- All streak logic belongs exclusively in `StreakService`. The `Streak` model is a pure data store. Recalculation triggered only via `HabitLogObserver` on `created/updated/deleted`. Never call `StreakService::recalculate()` manually.

### 5. Authentication & State (Backend)
- `HandlesAuthResponses` trait manages divergence between Stateful (SPA) and Stateless (Mobile) auth. Always use `authenticateAndRespond()`.

### 6. Forms & Validation (Frontend)
- **All forms** use React Hook Form + Zod Resolvers.
- **Payload transformation:** Always map Zod output to API contract via a pure utility function (`transformFormDataToPayload`).
- **Errors:** Use `handleLaravelValidationErrors` centrally inside the form's `catch` block.

### 7. Optimistic UI (Frontend)
- Optimistic logic MUST reside in pure utility files (`src/utils/[domain]/[domain]Optimistic.ts`). Use inside `onMutate` (snapshot cache), `onError` (rollback), `onSettled` (invalidate). Never inline in components.

### 8. Authentication & Routing (Frontend)
- All protected routes wrapped in `<ProtectedRoute>`. Flow: `useCurrentUser` → fetching spinner → redirect if unauthenticated → redirect to verify-email if unverified.
- `useTheme` must be called at root layout level (`AppRoutes`) for global CSS variables.

---

## VII. The 12 Commandments of Momentum (Fullstack)
1. Thou shalt not put SQL queries in Controllers, nor API calls in Components.
2. Thou shalt not put HTTP/Request logic in Services, nor `useState` modal logic in Data Hooks.
3. Thou shalt not bypass `PlanQuotaService` for billing limits (BE), nor bypass Smart Polling for billing state (FE).
4. Thou shalt not create bloated "God Classes" or "God Components"; split using File-Isolation.
5. Thou shalt use FormRequests for ALL backend validation, and Zod for ALL frontend form validation.
6. Thou shalt use API Resources for ALL outgoing data formatting, and pure utility functions for payload transformations.
7. Thou shalt use Events/Listeners for cross-domain async communication, and bundled action objects to prevent prop-drilling.
8. Thou shalt use Observers for model lifecycle side-effects, and React Query’s `onMutate`/`onError`/`onSettled` for optimistic UI.
9. Thou shalt write self-rendering Exceptions for API errors, and map Laravel 422 errors to React Hook Form centrally.
10. Thou shalt respect Bounded Contexts; Identity does not touch Habit logic (BE), Auth state does not leak into Habits (FE).
11. Thou shalt never process webhook payloads synchronously; always dispatch to a Queue (BE). Thou shalt treat Webhooks as backend Source of Truth and Smart Polling as the UI bridge (FE).
12. Thou shalt enforce strict Idempotency on all incoming webhook events to prevent double-billing (BE), and ensure optimistic rollbacks use proper snapshots (FE).