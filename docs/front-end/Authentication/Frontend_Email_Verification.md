# Module 2: Frontend Email Verification

## 1. Overview
The Frontend Email Verification module handles the post-registration email verification flow with a focus on seamless UX transitions and network resilience. It implements a multi-state `VerifyEmailPage` component that handles both the initial "check your inbox" state and the verification callback state. The module is specifically engineered to bypass enterprise WAF/Load Balancer query-string stripping by sending verification parameters in the JSON request body. It leverages React Query's `setQueryData` for instant cache hydration upon successful verification, preventing network race conditions and eliminating infinite loading spinners. It also provides intelligent state persistence with graceful fallback mechanisms to ensure users are never hard-blocked from completing verification.

## 2. Business Rules
*   **Email Verification Enforcement:** Users who register with credentials are placed in a pending state. They must be restricted from accessing the main application dashboard until `email_verified_at` is populated.
*   **Strict Payload Typing:** URL search parameters are inherently strings. The frontend MUST cast `id` and `expires` to strict `number` types before transmitting the JSON payload to satisfy the backend's `integer` validation rules and prevent 422 errors.
*   **Instant Cache Hydration (Race Condition Prevention):** Upon successful verification of a pending registration, the backend returns a fully authenticated `User` object. The frontend MUST use `queryClient.setQueryData(['currentUser'], user)` to instantly hydrate the cache, rather than relying on `invalidateQueries`, preventing flash-of-unauthenticated-state (FOS) on the dashboard.
*   **State Persistence & Fallback for Pre-Verification Flows:** During the registration flow, the user's `pendingEmail` must be persisted across page refreshes using Zustand's `persist` middleware. If this state is lost (e.g., direct navigation to URL), the system must provide a fallback input field for the user to manually enter their email, preventing a hard-block UI.
*   **WAF-Safe Email Verification:** Email verification parameters (`id`, `hash`, `expires`, `signature`) must be sent in the **JSON body** of the POST request, not as query string parameters. This bypasses enterprise WAFs and Load Balancers that strip query strings from POST requests.
*   **CSRF Initialization:** Email verification requests require a valid CSRF token. This is handled transparently by the centralized Axios request interceptor in `api.ts`, adhering strictly to DRY principles without requiring manual CSRF fetches in the service layer.

## 3. Frontend Architecture

### State Management
*   **Server State (React Query):** The `useVerifyEmail` mutation hook manages the verification API call. On success, it bypasses network refetching by instantly updating the `['currentUser']` cache with the returned authenticated user object.
*   **Client State (Zustand - `authStore`):** Utilizes Zustand's `persist` middleware with `sessionStorage` and the `partialize` option to strictly persist *only* the `pendingEmail` during the pre-verification phase. This prevents state-loss errors on page refreshes while keeping the core `User` object strictly server-sourced to avoid stale auth states.

### Key Components
*   **`VerifyEmailPage`:** A multi-state component. 
    *   **State 1 (Post-Registration):** Displays a "Check your inbox" UI, utilizing a DRY `renderResendUI` helper. If `pendingEmail` is missing from state, it renders a fallback input field so the user can manually provide their email.
    *   **State 2 (Verification Callback):** Automatically extracts signed URL parameters, casts types strictly, and sends them as a **JSON body** when navigated to via email link. Relies on React Query's `isPending` and `isError` states to handle loading and error UIs seamlessly.

## 4. API Contract

| Method | Endpoint | Frontend Service Method | CSRF Required? | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/sanctum/csrf-cookie` | *Implicit via Interceptor* | No | Automatically initialized by `api.ts` interceptor if missing. |
| `POST` | `/api/auth/verify-email` | `authService.verifyEmail` | **Yes** | Verifies email using JSON body parameters. Returns `User` object on success. |
| `POST` | `/api/auth/verify-email/resend` | `authService.resendVerification` | Yes | Resends verification email. Requires `{ email }` payload. |

## 5. Flow

### Email Verification & Resend Flow
1.  User clicks link in email (`https://frontend.com/verify-email?expires=...&hash=...&id=...&signature=...`).
2.  `VerifyEmailPage` detects all 4 required URL parameters via `useSearchParams`.
3.  Extracts and strictly casts parameters: `id` and `expires` are cast to `Number()`, while `hash` and `signature` remain strings.
4.  Fires `POST /api/auth/verify-email` with the strictly typed JSON body `{ id, hash, expires, signature }`.
5.  **Success State & Cache Hydration:** The `useVerifyEmail` hook receives the returned `User` object. It calls `queryClient.setQueryData(['currentUser'], user)` to instantly make the user authenticated in the frontend state, then navigates to `/dashboard`.
6.  **Resend Flow:** If the user lands on `/verify-email` without URL params (post-registration), the component checks for `pendingEmail` in Zustand. If present, it is used for the resend payload. If absent (state loss), a fallback input field is rendered for the user to manually type their email, ensuring they are never hard-blocked from resending.

## 6. Edge Cases & Vulnerabilities (Resolved)

*   **422 Validation Error on Integer Fields (Resolved):** The backend strictly enforces `integer` types for `id` and `expires` via the `VerifyEmailRequest` FormRequest. Because `useSearchParams` returns strings, the JSON payload originally failed backend validation. **Fix:** Implemented strict `Number()` type casting in `VerifyEmailPage` before passing the payload to the mutation, ensuring backend validation passes flawlessly.
*   **Infinite Loading Spinner / Race Condition on Dashboard (Resolved):** Previously, the frontend invalidated the `currentUser` query upon successful verification and immediately navigated to the dashboard. This caused a network race condition where the dashboard rendered before the `/api/user/me` call finished, leading to unauthenticated flashes. **Fix:** Replaced `invalidateQueries` with `setQueryData` in the `useVerifyEmail` hook. The frontend now instantly hydrates the cache with the user object returned directly from the verification endpoint, providing a seamless, instant transition.
*   **State Loss on Page Refresh during Registration (Resolved):** When a user registers and lands on `/verify-email`, refreshing the page wiped the in-memory Zustand state, causing the "Resend" button to fail. **Fix:** Implemented Zustand's `persist` middleware using `sessionStorage` and the `partialize` option to selectively persist only `pendingEmail`. Additionally, if `pendingEmail` is still missing, a fallback manual email input is rendered to prevent hard-blocking the user.
*   **CSRF Mismatch & DRY Violation on New Tabs (Resolved):** Opening the email verification link in a new tab initializes a clean SPA state without an XSRF-TOKEN. Previously, this required manual CSRF fetches inside the service layer. **Fix:** Relied on the centralized Axios interceptor in `api.ts` which automatically transparently fetches the CSRF cookie before state-changing requests, adhering strictly to DRY principles.
*   **Enterprise WAF Query String Stripping & Cryptographic Mismatch (Resolved):** Some enterprise WAFs and Load Balancers strip query strings from POST requests, breaking email verification. **Fix:** Changed `verifyEmail` to send parameters in the **JSON body**. The backend natively regenerates the expected HMAC, eliminating 422 errors and bypassing WAFs.

## 7. Tests

*   **Unit (Zustand Store):** Verify that the `persist` middleware correctly saves `pendingEmail` to `sessionStorage` upon registration and that `partialize` prevents the `user` object from being cached locally.
*   **Integration (`VerifyEmailPage`):** 
    *   Simulate a hard refresh on `/verify-email` immediately after registration and assert that the "Resend" button successfully uses the persisted `pendingEmail`. 
    *   Simulate state loss (no `pendingEmail`) and assert that the fallback email input renders, and submitting it triggers `resendVerification` with the manual input value.
    *   Simulate navigation via email link and assert `authService.verifyEmail` is called with `id` and `expires` parsed as strict numbers, not strings.
    *   **Simulate a successful `verifyEmail` mutation resolution and assert that `queryClient.setQueryData` is called with the `['currentUser']` key, and the user is instantly navigated to the dashboard without a loading flicker.**

## 8. Notes

*   **Architecture Decision (Selective State Persistence & Fallback):** By using Zustand's `partialize` feature, we persist `pendingEmail` to survive page refreshes during the vulnerable pre-verification window, but strictly forbid persisting the `User` object. Furthermore, acknowledging that client-side state can never be 100% guaranteed (e.g., cross-device navigation), the `VerifyEmailPage` implements a manual fallback input adhering to graceful degradation principles rather than hard-blocking the user.
*   **Architecture Decision (Cache Hydration over Refetching):** When a user verifies their email, the backend promotes the `PendingRegistration` to a `User` and returns the authenticated state. Instead of forcing the frontend to make a redundant `/api/user/me` network request (via `invalidateQueries`), we use React Query's `setQueryData` to instantly update the client state. This aligns perfectly with the Dual-Layer State Management mandate (Server State handled exclusively by React Query) and provides the highest possible UX quality.

***