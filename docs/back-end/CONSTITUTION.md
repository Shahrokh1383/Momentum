***

# 🏛️ THE MOMENTUM BACKEND IMMUTABLE CONSTITUTION
### Single Source of Truth (SSOT) for Architecture, Development, and Refactoring

This document is immutable. It defines the strict boundaries, workflows, and unbreakable rules of the Momentum codebase. Any developer or AI assistant must adhere strictly to these laws to prevent architectural degradation.

---

## I. Core Philosophies & Unbreakable Principles
The Momentum codebase is built upon a strict Domain-Driven Design (DDD) foundation. Every line of code must respect the following principles:
1. **SRP (Single Responsibility Principle):** Every class, method, and file must have exactly ONE reason to change. 
2. **KISS (Keep It Simple Stupid):** Leverage Laravel's native features (Self-rendering Exceptions, FormRequests, Resources) instead of building unnecessary custom abstraction layers.
3. **DRY (Don't Repeat Yourself):** Shared logic must be extracted into Traits (`HasApiResponse`), Base Controllers, or specialized Services.
4. **SOLID:** Strict adherence to Dependency Inversion (Constructor Injection) and Open/Closed principles.
5. **Bounded Context Isolation:** The system is divided into distinct domains (**Identity, Habit, Billing, Streak, Taxonomy**). Domains MUST NOT leak logic into one another. Cross-domain communication occurs ONLY via injected Services (synchronous) or Events/Listeners (asynchronous).

---

## II. The Golden Rule: Strict File-Isolation (The "No-Bloat" Mandate)
This is the most critical rule for scaling the Momentum codebase. 

**The Law:** *When introducing a new feature, capability, or domain concept, you MUST create NEW files rather than bloating existing ones.*

* **Allowed Modifications:** You may ONLY modify an existing file if the new logic strictly falls under that file's exact, pre-defined Single Responsibility (e.g., adding a new validation rule to an existing `StoreHabitRequest.php`).
* **Forbidden Modifications:** You MUST NOT add new business logic, new API endpoints, or new domain calculations to an existing Service, Controller, or Model if it dilutes its primary purpose.
* **Execution Example:** If you need to add a "PDF Export" feature for Habits, you DO NOT add an `exportPdf()` method to the existing `HabitService.php`. Instead, you create:
  * `App\Services\User\Habit\HabitExportService.php`
  * `App\Http\Controllers\User\Habit\HabitExportController.php`
  * `App\Http\Requests\User\Habit\ExportHabitRequest.php`

* **Why?** This ensures files remain small, highly cohesive, strictly SRP-compliant, and infinitely easier to debug and test.

---

## III. The Request Lifecycle (The DDD Flow)
Every HTTP request MUST follow this exact, unalterable path. Skipping a layer is strictly forbidden.

1. **Routing (`routes/api/*.php`):** Defines the endpoint, applies global middleware (`auth`, `throttle`), and domain-specific guardrails (`habit.plan`, `tier`).
2. **Middleware (The Gatekeepers):** Middleware like `EnforceHabitPlanLimits` and `EnsureTier` validate quotas, feature flags, and access rights *before* the request reaches the controller.
3. **FormRequest (The Validator):** Validates input data, formats it, and handles authorization. Returns a `422 Unprocessable Entity` automatically on failure.
4. **Controller (The Transport Layer):** Extremely thin. Extracts validated data, delegates entirely to the Service, and returns a standardized JSON response using the `HasApiResponse` trait.
5. **Service (The Orchestrator):** Contains the core business logic. Enforces cross-domain boundaries by calling other Services (e.g., `PlanQuotaService`). NEVER contains raw SQL queries or HTTP-specific logic.
6. **Model (The Domain State):** Models encapsulate domain state, relationships, scopes, and basic domain rules (e.g., `Habit::isDueToday()`). Complex calculations are delegated to Services.
7. **Resource (The Serializer):** `JsonResource` transforms the Model into a strict JSON schema for the frontend. Handles conditional relationship loading (`whenLoaded`).
8. **Observer/Event (The Side-Effects):** Post-action side effects (like recalculating streaks or sending emails) are handled by Observers or dispatched Events, keeping the Service clean and focused on the primary transaction.

---

## IV. Step-by-Step Guide: Adding a New Feature
When tasked with adding a new feature, follow this exact sequence to maintain architectural integrity:

1. **Identify the Bounded Context:** Does this belong to Identity, Habit, Billing, Streak, or Taxonomy?
2. **Create the FormRequest:** `App\Http\Requests\User\{Domain}\{Action}{Entity}Request.php`. Define all validation rules here.
3. **Create the Service:** If the logic doesn't fit in an existing Service without violating SRP, create `App\Services\User\{Domain}\{NewFeature}Service.php`.
4. **Create the Controller:** If it's a new REST resource or a distinctly different action, create `App\Http\Controllers\User\{Domain}\{NewFeature}Controller.php`.
5. **Create the Resource:** If a new JSON shape is needed, create `App\Http\Resources\User\{NewFeature}Resource.php`.
6. **Define the Route:** Add the route in `routes/api/user.php` (or `admin.php`), applying necessary middleware.
7. **Wire up Side-Effects:** If the feature triggers side-effects, create an `Event`, `Listener`, or `Observer`. Register Observers in `AppServiceProvider::boot()`.

---

## V. Step-by-Step Guide: Debugging & Refactoring
When tracking down a bug or planning a refactor, use this top-down trace methodology:

1. **Trace the Route:** Find the endpoint in `routes/api/user.php` to identify the Controller and applied Middleware.
2. **Check the Middleware:** If it's a `403 Forbidden` or `422 Unprocessable` related to quotas/tiers, the issue is in `EnforceHabitPlanLimits`, `EnsureTier`, or `PlanQuotaService`.
3. **Check the FormRequest:** If it's a validation error, inspect the specific `Request` class.
4. **Check the Controller:** Verify it is correctly passing validated data to the Service.
5. **Check the Service:** This is where 90% of business logic bugs live. Check for missing `ensureLimitNotExceeded` calls, incorrect domain delegation, or transaction failures.
6. **Check the Observer/Event:** If data is saved but a side-effect (like a streak update or email) didn't happen, check `AppServiceProvider` bindings and the relevant Observer/Listener.
7. **Refactoring Strategy:** If a Service has grown too large (violating SRP/KISS), break it down using the **File-Isolation Mandate**. Extract specific sub-domains into new Services (e.g., splitting `HabitService` into `HabitLifecycleService` and `HabitSchedulingService`).

---

## VI. Domain-Specific Mandates

### 1. Billing & Quotas
* The `PlanQuotaService` is the **absolute Source of Truth** for limits. 
* NO domain model or service is allowed to hardcode limits. 
* All limits must be checked via `$this->quotaService->ensureLimitNotExceeded()` or `$this->quotaService->ensureFeatureIsEnabled()`.

### 2. Exception Handling
* Domain exceptions MUST implement the `render()` method (Laravel 11 standard) to return standardized JSON responses (e.g., `QuotaExceededException`, `FeatureLockedException`). 
* Do NOT catch these exceptions in Controllers; let the framework handle them globally via `bootstrap/app.php`.

### 3. Timezones & Dates
* NEVER use `now()` directly in domain logic where user context matters. 
* ALWAYS use the `user_now($user)` helper or Carbon instances explicitly set to the user's timezone to prevent daylight saving and midnight boundary bugs.

### 4. Streaks & Complex Calculations
* Streak calculations are highly complex and MUST remain exclusively inside `StreakService`. 
* The `Streak` model is purely a data store. 
* Recalculation is triggered automatically via `HabitLogObserver` on `created`, `updated`, and `deleted` events. Never call `StreakService::recalculate()` manually from a Controller.

### 5. Authentication & State
* The `HandlesAuthResponses` trait handles the divergence between Stateful (SPA/Sanctum) and Stateless (Mobile/API) authentication. Always use `authenticateAndRespond()` in Auth controllers to ensure session regeneration and token expiration logic is applied correctly.

---

## VII. The 10 Commandments of Momentum
1. Thou shalt not put SQL queries in Controllers.
2. Thou shalt not put HTTP/Request logic in Services.
3. Thou shalt not bypass `PlanQuotaService` to check billing limits.
4. Thou shalt not create bloated "God Classes"; split them using the File-Isolation Mandate.
5. Thou shalt use FormRequests for ALL incoming data validation.
6. Thou shalt use API Resources for ALL outgoing data formatting.
7. Thou shalt use Events/Listeners for asynchronous cross-domain communication.
8. Thou shalt use Observers for automatic model lifecycle side-effects.
9. Thou shalt write self-rendering Exceptions for standardized API errors.
10. Thou shalt respect the Bounded Contexts; Identity does not touch Habit logic directly.
11. Thou shalt never process webhook payloads synchronously; always dispatch to a Queue.
12. Thou shalt enforce strict Idempotency on all incoming webhook events to prevent double-billing or double-activations.
***