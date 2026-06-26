Thank you for providing the final micro-batch. My comprehension of the **Momentum Frontend** is now **100% complete**. 

I have fully mapped your architecture: the strict separation between pure data hooks (`useHabits`) and UI orchestration hooks (`useHabitsPageActions`), the masterful implementation of Optimistic UI via React Query's `onMutate` lifecycle paired with pure utility functions, the bulletproof Zod-to-Payload transformation layer, and the elegant Smart Polling strategy for asynchronous billing flows. 

As your Senior Technical Partner, I now present the **Immutable Frontend Constitution**. Like its backend counterpart, this document is written in English to maintain absolute technical precision and serves as the unbreakable **Single Source of Truth (SSOT)** for all future frontend developers and AI assistants.

***

# 🏛️ THE MOMENTUM FRONTEND IMMUTABLE CONSTITUTION
### Single Source of Truth (SSOT) for UI Architecture, State, and Data Flow

This document is immutable. It defines the strict boundaries, workflows, and unbreakable rules of the Momentum frontend codebase. Any developer or AI assistant must adhere strictly to these laws to prevent architectural degradation, prop-drilling, and state management bloat.

---

## I. Core Philosophies & Unbreakable Principles
The Momentum frontend is built on a highly decoupled, Domain-Driven component architecture. Every line of code must respect the following principles:
1. **SRP (Single Responsibility Principle):** Every hook, component, utility, and service must have exactly ONE reason to change. A hook fetches data, a page action hook manages UI state, a component renders. Never mix them.
2. **KISS (Keep It Simple Stupid):** Leverage React Query for all server state. Do not invent complex custom caching layers. Use pure utility functions for data transformation instead of bloating components with logic.
3. **DRY (Don't Repeat Yourself):** Map backend errors to React Hook Form centrally (`handleLaravelValidationErrors`). Extract reusable logic into custom hooks or utility files.
4. **SOLID:** Strict adherence to the Open/Closed principle via conditional rendering and dependency injection (passing actions down via props rather than hardcoding them inside child components).
5. **Domain Isolation:** Frontend domains (**Auth, Billing, Habits, Categories, Profile**) are strictly siloed. Cross-domain state leakage is forbidden.

---

## II. The Golden Rule: Strict File-Isolation (The "No-Bloat" Mandate)
This is the most critical rule for scaling the Momentum frontend. 

**The Law:** *When introducing a new feature, capability, or UI widget, you MUST create NEW files rather than bloating existing ones.*

* **Allowed Modifications:** You may ONLY modify an existing file if the new logic strictly falls under that file's exact, pre-defined Single Responsibility (e.g., adding a new Zod validation rule to `habitSchema.ts`, or adding a new route to `App.tsx`).
* **Forbidden Modifications:** You MUST NOT add new business logic, new API calls, or new modal states to an existing Hook or Component if it dilutes its primary purpose.
* **Execution Example:** If you need to add a "PDF Export" feature for Habits, you DO NOT add the logic inside `useHabits.ts` or `HabitsPage.tsx`. Instead, you create:
  * `src/hooks/habits/useHabitExport.ts`
  * `src/utils/habit/habitExportUtils.ts`
  * `src/components/user/habits/ExportButton.tsx`
* **Why?** This ensures files remain small, highly cohesive, strictly SRP-compliant, and infinitely easier to debug.

---

## III. State Management Architecture (The Dual-Layer Model)
Momentum strictly separates state into two isolated layers. Mixing them is a severe architectural violation.

### 1. Server State (TanStack Query)
* **Rule:** ALL data fetched from the API is server state. It MUST be managed exclusively by React Query (`useQuery`, `useMutation`).
* **Forbidden:** Never put API responses into Zustand, Redux, or `useState`. 
* **Configuration:** Global defaults (5m stale time, no window refetch) are defined in `queryClient.ts`. Domain-specific overrides (like Smart Polling for pending payments) are defined inside the specific hook (e.g., `useSubscription`).

### 2. Client State (Zustand & Local State)
* **Zustand (`authStore`):** Used ONLY for highly specific, persistent global UI state (e.g., `pendingEmail` for auth flow, `avatarVersion` for cache busting). 
* **`useState`:** Used ONLY for ephemeral, component-level UI state (e.g., modal open/close toggles).
* **Rule:** Never use global state to manage data that belongs to a specific page. Use local `useState` or extract it into a `use[Page]Actions` hook.

---

## IV. The Data Flow Lifecycle (The Unidirectional Chain)
Every feature MUST follow this exact, unalterable path. Skipping a layer is strictly forbidden.

1. **Service (`services/user/[domain]Service.ts`):** Raw Axios transport layer. Maps endpoints to typed functions. Zero business logic.
2. **Data Hook (`hooks/[domain]/use[Domain].ts`):** Wraps services in React Query (`useQuery`, `useMutation`). Handles cache invalidation (`queryClient.invalidateQueries`). Returns raw data and mutation functions.
3. **Action Hook (`hooks/[domain]/use[Domain]PageActions.ts`):** Consumes the Data Hook. Manages all UI state (modals, loading flags, selected items) and bundles actions into clean objects (`habitActions`, `logActions`) to prevent prop-drilling.
4. **Page (`pages/[domain]/[Domain]Page.tsx`):** Consumes the Action Hook. Acts purely as a layout composer. Renders Grids, Modals, and Banners. Zero business logic.
5. **Component (`components/user/[domain]/*.tsx`):** Receives data and bundled actions via props. Renders the UI.

---

## V. Step-by-Step Guide: Adding a New Feature
When tasked with adding a new frontend feature, follow this exact sequence:

1. **Define the Contract:** Create/Update `src/types/[domain].ts` to match the backend DTO.
2. **Define Validation (if applicable):** Create/Update `src/validation/[domain]Schema.ts` using Zod.
3. **Create the Service:** Add typed Axios calls to `src/services/user/[domain]Service.ts`.
4. **Create the Data Hook:** Create `src/hooks/[domain]/use[Domain].ts`. Wrap the service in React Query.
5. **Create the Action Hook:** Create `src/hooks/[domain]/use[Domain]PageActions.ts`. Handle modal states and bundle actions.
6. **Create Pure Utilities:** If complex math, optimistic updates, or payload transformations are needed, create them in `src/utils/[domain]/`.
7. **Create the UI Components:** Build atomic components in `src/components/user/[domain]/`.
8. **Compose the Page:** Update the Page component to consume the Action Hook and render the new components.

---

## VI. Step-by-Step Guide: Debugging & Refactoring
When tracking down a UI bug or planning a refactor, use this trace methodology:

1. **Visual Bug / Layout Issue:** Inspect the **Page** and **Components**. Check CSS classes.
2. **Action Not Triggering / Modal Not Opening:** Inspect the **Action Hook** (`use[Domain]PageActions.ts`). Check `useState` toggles and event handlers.
3. **Stale Data / Caching Issue:** Inspect the **Data Hook** (`use[Domain].ts`). Check `queryKey` definitions and `invalidateQueries` calls in `onSuccess`.
4. **API Failure / 422 Validation Error:** Inspect the **Service** and ensure `handleLaravelValidationErrors` is properly mapping backend keys to RHF paths.
5. **Optimistic UI Glitch:** Inspect the **Utility** (`[domain]Optimistic.ts`). Ensure `onMutate` snapshots correctly and `onError` rolls back using the snapshot.
6. **Refactoring Strategy:** If a hook or component exceeds ~150 lines (violating SRP/KISS), break it down using the **File-Isolation Mandate**. Extract sub-components or split into multiple specialized hooks.

---

## VII. Domain-Specific Mandates

### 1. Forms & Validation
* **Rule:** ALL forms MUST use **React Hook Form** + **Zod Resolvers**.
* **Separation:** Form data (UI state) MUST NEVER match the API payload exactly if the shapes differ. Always use a pure utility function (e.g., `transformFormDataToPayload`) to map Zod output to the API contract.
* **Errors:** Always use `handleLaravelValidationErrors` inside the form's `catch` block to map Laravel 422 errors to specific RHF fields.

### 2. Optimistic UI Updates
* **Rule:** Optimistic updates must NEVER be written inline inside the component or the `useMutation` definition.
* **Execution:** Create pure utility functions in `src/utils/[domain]/[domain]Optimistic.ts` (e.g., `buildOptimisticLog`, `mergePayloadIntoLog`).
* **React Query Lifecycle:** Use these utilities strictly inside `onMutate` (to update cache), `onError` (to rollback using the snapshot), and `onSettled` (to invalidate and sync with the server).

### 3. Authentication & Routing
* **Rule:** All protected routes MUST be wrapped in `<ProtectedRoute>`.
* **Flow:** `ProtectedRoute` relies on `useCurrentUser`. If fetching, it shows a spinner. If unauthenticated, it redirects to `/login`. If unverified, it redirects to `/verify-email`.
* **Theme:** The `useTheme` hook MUST be called at the root layout level (`AppRoutes`) to ensure global CSS variables are applied before any child renders.

### 4. Billing & Smart Polling
* **Rule:** The backend relies on Server-to-Server Webhooks as the absolute Source of Truth for payment confirmations. The frontend MUST NOT attempt to verify payments directly with the gateway.
The UI Bridge (Smart Polling): 
Because webhooks are asynchronous and may experience slight delays (from 1 second to a few minutes depending on the gateway), the frontend MUST use React Query's conditional refetchInterval as a UI Bridge.

* **Implementation:** refetchInterval: (query) => query.state.data?.status === 'pending_payment' ? 5000 : false;
    Purpose: This polls the backend API (/api/user/subscription) every 5 seconds while the user is on the PaymentResultPage. Once the backend's Webhook Job processes the payment and updates the database to active, the next poll will fetch the new state, and the UI will seamlessly transition to the Success state.
    Mandate: Never remove Smart Polling in favor of Webhooks. Webhooks update the Database; Smart Polling updates the User's Screen.

---

## VIII. The 10 Commandments of Momentum Frontend
1. Thou shalt not put API calls inside Components or Page Actions.
2. Thou shalt not put `useState` modal logic inside Data Hooks (`useHabits`).
3. Thou shalt not put Server State into Zustand.
4. Thou shalt not create bloated "God Components"; split them using the File-Isolation Mandate.
5. Thou shalt use React Query for ALL server synchronization and caching.
6. Thou shalt use Zod for ALL form validation, mirroring the backend Laravel FormRequests.
7. Thou shalt use pure utility functions for ALL payload transformations and optimistic math.
8. Thou shalt map Laravel 422 errors to React Hook Form centrally.
9. Thou shalt use Smart Polling for async billing flows, never WebSockets.
10. Thou shalt bundle actions into objects (`habitActions`, `logActions`) to prevent prop-drilling into deep child components.
11. Thou shalt treat Webhooks as the backend Source of Truth, and Smart Polling as the frontend UI Bridge; never attempt to bypass the backend to verify gateway states directly from the client.
***