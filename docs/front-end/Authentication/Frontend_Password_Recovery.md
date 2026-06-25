# Module 3: Frontend Password Recovery

## 1. Overview
The Frontend Password Recovery module provides a secure, user-friendly password reset flow while enforcing strict anti-enumeration practices and password complexity validation. It implements the "Forgot Password" and "Reset Password" flows with real-time password strength feedback and ensures that backend validation errors are properly surfaced to the user. The module maintains CSRF token management and integrates seamlessly with the authentication architecture to prevent information leakage about account existence.

## 2. Business Rules
*   **Anti-Enumeration:** The "Forgot Password" flow always displays a generic success message, preventing attackers from determining if an email exists in the system. This is enforced both on the frontend (displaying the same message regardless of backend response) and backend.
*   **Password Complexity:** Client-side validation must enforce the same complexity rules as the backend: minimum 8 characters, at least one uppercase letter, one lowercase letter, one number, and one symbol.
*   **Real-Time Password Strength Feedback:** The frontend provides visual feedback on password complexity as the user types, helping them meet requirements before submission.
*   **CSRF Initialization:** Password reset requests require a valid CSRF token. The frontend must fetch `/sanctum/csrf-cookie` before making password reset POST requests.
*   **Token Validation:** The reset password flow requires a valid token from the email link. The frontend extracts this token from the URL and includes it in the reset request.

## 3. Frontend Architecture

### Key Components
*   **`ForgotPasswordPage`:** Handles the email submission for password reset. Displays a generic success message after submission to prevent enumeration.
*   **`ResetPasswordPage`:** Handles the new password submission. Extracts the reset token from the URL, validates password complexity and confirmation match, and displays backend errors if the token is invalid or expired.
*   **`PasswordStrengthMeter`:** Provides real-time visual feedback on password complexity against backend rules. Displays a strength indicator (weak, medium, strong) based on the password's adherence to complexity requirements.

### Validation
*   **Zod Schemas:** Client-side validation schemas enforce password complexity rules and password confirmation matching before submission.

## 4. API Contract

| Method | Endpoint | Frontend Service Method | CSRF Required? | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/sanctum/csrf-cookie` | *Implicit* | No | Initializes the XSRF-TOKEN cookie. |
| `POST` | `/api/auth/forgot-password` | `authService.forgotPassword` | Yes | Sends reset link. Always returns generic success. |
| `POST` | `/api/auth/reset-password` | `authService.resetPassword` | Yes | Resets password using valid token. |

## 5. Flow

### Forgot Password Flow
1.  User navigates to `/forgot-password` and enters their email.
2.  Frontend validates email format using Zod schema.
3.  `forgotPassword` mutation fires `authService.forgotPassword`.
4.  **Regardless of backend response (success or 404):** Frontend displays a generic success message: "If an account with that email exists, we've sent password reset instructions."
5.  This prevents attackers from enumerating valid email addresses.

### Reset Password Flow
1.  User clicks reset link in email (`https://frontend.com/reset-password?token=xxx&email=yyy`).
2.  `ResetPasswordPage` extracts `token` and `email` from URL query parameters.
3.  User enters new password and confirmation.
4.  `PasswordStrengthMeter` provides real-time feedback on password complexity.
5.  Frontend validates password complexity and confirmation match using Zod schema.
6.  `resetPassword` mutation fires `authService.resetPassword` with `{ token, email, password, password_confirmation }`.
7.  **If Success (200):** Frontend displays success message and redirects to `/login`.
8.  **If Error (422/400):** Backend errors (invalid token, expired token, password validation errors) are mapped to the form fields using `setError`.

## 6. Edge Cases & Vulnerabilities (Resolved)

*   **Email Enumeration Prevention (Resolved):** The frontend always displays the same generic success message after a forgot password request, regardless of whether the email exists in the system. This prevents attackers from using the endpoint to enumerate valid user accounts.
*   **Password Complexity Enforcement (Resolved):** Client-side Zod validation enforces the same password complexity rules as the backend (minimum 8 characters, uppercase, lowercase, number, symbol). The `PasswordStrengthMeter` component provides real-time visual feedback, helping users meet requirements before submission.
*   **Invalid/Expired Token Handling (Resolved):** When a user attempts to reset their password with an invalid or expired token, the backend returns a 422 error. The frontend catches this error and displays a clear message to the user, allowing them to request a new reset link.

## 7. Tests

*   **Unit (Zod Schemas):** Validate password complexity rules (min 8 chars, uppercase, lowercase, number, symbol) and password confirmation matching.
*   **Component (`ForgotPasswordPage`):** Mock `forgotPassword` mutation and assert that the generic success message is displayed regardless of whether the backend returns success or 404.
*   **Component (`ResetPasswordPage`):** 
    *   Test that `token` and `email` are correctly extracted from URL query parameters.
    *   Mock `resetPassword` to reject with a 422 error (invalid token) and assert that the error message is displayed to the user.
    *   Test password complexity validation and confirmation matching.
*   **Component (`PasswordStrengthMeter`):** Test that the strength indicator correctly reflects password complexity (weak, medium, strong) based on the password's adherence to requirements.

## 8. Notes

*   **Architecture Decision (Anti-Enumeration UX):** The frontend and backend work together to prevent email enumeration. The backend always returns a generic success message, and the frontend displays the same message to the user regardless of the backend response. This ensures that attackers cannot determine if an email exists in the system by observing different UI states.
*   **Architecture Decision (Real-Time Password Feedback):** The `PasswordStrengthMeter` component provides immediate visual feedback on password complexity, reducing user frustration and form submission errors. This improves the overall UX of the password reset flow.
*   **Architecture Decision (Token Extraction from URL):** The reset token and email are extracted from the URL query parameters rather than being stored in client-side state. This ensures that the reset flow works correctly even if the user opens the reset link in a new tab or after a page refresh.

---