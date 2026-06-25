# Module 2: Frontend Email Verification

## 1. Overview
The Frontend Email Verification module handles the post-registration email verification flow with a focus on seamless UX transitions and network resilience. It implements a multi-state `VerifyEmailPage` component that handles both the initial "check your inbox" state and the verification callback state. The module is specifically engineered to bypass enterprise WAF/Load Balancer query-string stripping by sending verification parameters in the JSON request body. It implements explicit success state tracking to prevent infinite loading spinners and provides intelligent state persistence with graceful fallback mechanisms to ensure users are never hard-blocked from completing verification.

## 2. Business Rules
*   **Email Verification Enforcement:** Users who register with credentials are placed in a pending state. They must be restricted from accessing the main application dashboard until `email_verified_at` is populated.
*   **Explicit Verification Success State:** The frontend must explicitly track and render the success state of the email verification mutation. It must `await` the API call and transition to a dedicated success UI, preventing infinite loading spinners and providing a clear call-to-action to the dashboard upon successful verification.
*   **State Persistence & Fallback for Pre-Verification Flows:** During the registration flow, the user's `pendingEmail` must be persisted across page refreshes using Zustand's `persist` middleware. If this state is lost (e.g., direct navigation to URL), the system must provide a fallback input field for the user to manually enter their email, preventing a hard-block UI.
*   **WAF-Safe Email Verification:** Email verification parameters (`id`, `hash`, `expires`, `signature`) must be sent in the **JSON body** of the POST request, not as query string parameters. This bypasses enterprise WAFs and Load Balancers that strip query strings from POST requests.
*   **CSRF Initialization:** Email verification requests require a valid CSRF token. The frontend must fetch `/sanctum/csrf-cookie` before making the verification POST request, especially important when users open verification links in new tabs.

## 3. Frontend Architecture

### State Management
*   **Client State (Zustand - `authStore`):** Utilizes Zustand's `persist` middleware with `sessionStorage` and the `partialize` option to strictly persist *only* the `pendingEmail` during the pre-verification phase. This prevents state-loss errors on page refreshes while keeping the core `User` object strictly server-sourced to avoid stale auth states.

### Key Components
*   **`VerifyEmailPage`:** A multi-state component. 
    *   **State 1 (Post-Registration):** Displays a "Check your inbox" UI, utilizing a DRY `renderResendUI` helper. If `pendingEmail` is missing from state, it renders a fallback input field so the user can manually provide their email.
    *   **State 2 (Verification Callback):** Automatically extracts signed URL parameters and sends them as a **JSON body** when navigated to via email link. It explicitly `await`s the verification mutation and tracks a local `isVerificationSuccess` state to render a clear success UI with a dashboard redirect link.

## 4. API Contract

| Method | Endpoint | Frontend Service Method | CSRF Required? | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/sanctum/csrf-cookie` | *Implicit* | No | Initializes the XSRF-TOKEN cookie. |
| `POST` | `/api/auth/verify-email` | `authService.verifyEmail` | **Yes** | Verifies email using JSON body parameters (WAF-safe). |
| `POST` | `/api/auth/verify-email/resend` | `authService.resendVerification` | Yes | Resends verification email. Requires `{ email }` payload. |

## 5. Flow

### Email Verification & Resend Flow
1.  User clicks link in email (`https://frontend.com/verify-email?expires=...&hash=...&id=...&signature=...`).
2.  `VerifyEmailPage` detects all 4 required URL parameters via `useSearchParams`.
3.  Extracts `id`, `hash`, `expires`, and `signature` individually from the URL.
4.  Fetches CSRF cookie (Mandatory for new tabs).
5.  Fires `POST /api/auth/verify-email` with `{ id, hash, expires, signature }` in the **JSON Body**.
6.  **Success State Transition:** The component explicitly `await`s the mutation. Upon success (no error thrown), it sets a local `isVerificationSuccess` state to true, replacing the loading spinner with a success UI and a link to the dashboard.
7.  **Resend Flow:** If the user lands on `/verify-email` without URL params (post-registration), the component checks for `pendingEmail` in Zustand. If present, it is used for the resend payload. If absent (state loss), a fallback input field is rendered for the user to manually type their email, ensuring they are never hard-blocked from resending.

## 6. Edge Cases & Vulnerabilities (Resolved)

*   **Infinite Loading Spinner on Verification (Resolved):** The `VerifyEmailPage` previously lacked a success state, causing the UI to remain stuck on a loading spinner after a successful backend response, forcing users to manually refresh the page to access the dashboard. **Fix:** Implemented an explicit `isVerificationSuccess` local state that is set when the `verifyEmail` mutation resolves successfully. The UI now conditionally renders a success message and a dashboard navigation link, providing a seamless post-verification UX.
*   **State Loss on Page Refresh during Registration (Resolved):** When a user registers and lands on `/verify-email`, refreshing the page wiped the in-memory Zustand state, causing the "Resend" button to fail. **Fix:** Implemented Zustand's `persist` middleware using `sessionStorage` and the `partialize` option to selectively persist only `pendingEmail`. Additionally, if `pendingEmail` is still missing, a fallback manual email input is rendered to prevent hard-blocking the user.
*   **CSRF Mismatch on New Tabs (Resolved):** Opening the email verification link in a new tab initializes a clean SPA state without an XSRF-TOKEN. **Fix:** Added mandatory `await api.get('/sanctum/csrf-cookie')` inside `authService.verifyEmail` before the POST request.
*   **Enterprise WAF Query String Stripping & Cryptographic Mismatch (Resolved):** Some enterprise WAFs and Load Balancers strip query strings from POST requests, breaking email verification. Furthermore, decoupled SPA routing caused synthetic request reconstruction to fail HMAC validation on the backend. **Fix:** Changed `verifyEmail` to send parameters in the **JSON body**. The backend now validates the signature by natively regenerating the expected HMAC using Laravel's URL generator, eliminating 422 errors and bypassing WAFs.

## 7. Tests

*   **Unit (Zustand Store):** Verify that the `persist` middleware correctly saves `pendingEmail` to `sessionStorage` upon registration and that `partialize` prevents the `user` object from being cached locally.
*   **Integration (`VerifyEmailPage`):** 
    *   Simulate a hard refresh on `/verify-email` immediately after registration and assert that the "Resend" button successfully uses the persisted `pendingEmail`. 
    *   Simulate state loss (no `pendingEmail`) and assert that the fallback email input renders, and submitting it triggers `resendVerification` with the manual input value.
    *   Simulate navigation via email link and assert `authService.verifyEmail` is called with the structured JSON body.
    *   **Simulate a successful `verifyEmail` mutation resolution and assert that the success UI renders with the dashboard link, and the infinite loading spinner disappears.**

## 8. Notes

*   **Architecture Decision (Selective State Persistence & Fallback):** By using Zustand's `partialize` feature, we persist `pendingEmail` to survive page refreshes during the vulnerable pre-verification window, but strictly forbid persisting the `User` object. Furthermore, acknowledging that client-side state can never be 100% guaranteed (e.g., cross-device navigation), the `VerifyEmailPage` implements a manual fallback input adhering to graceful degradation principles rather than hard-blocking the user.
*   **Architecture Decision (Explicit Async State Tracking):** Relying solely on React Query's `isLoading` and `isError` states is insufficient for multi-step UX flows like email verification. By wrapping the mutation in an `async/await` block and tracking a local `isVerificationSuccess` state, the component gains precise control over the post-success UI, adhering to strict UX requirements and preventing dead-end loading states.

---