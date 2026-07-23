# 3. Payment Flow (Upgrade & Verification)

# Payment Flow (Upgrade & Verification) — Frontend Technical Documentation

> **Project:** Momentum Application  
> **Frontend:** React 19 + TypeScript + Vite  
> **State Management:** TanStack Query (v5) + Zustand  
> **Routing:** React Router v6  
> **Last Updated:** 2026-06-26

---

## 1. Overview

The **Payment Flow** module manages the end-to-end upgrade and payment verification user experience. It bridges the gap between the external Paymenter hosted payment page (HPP) and the frontend through a polling-based verification UI. This module includes the payment modal, the payment processing countdown, and the result screen.

### Key Characteristics
| Aspect | Implementation |
|--------|----------------|
| **Initiation** | `PaymentModal` → `upgrade` mutation → `window.location.href` |
| **Return Handling** | Backend callback → `/payment-result?transaction_id=...` |
| **Verification** | `PaymentProcessing` countdown ring + `usePaymentVerification` (polling every 3s) |
| **Terminal States** | `PaymentResult` renders Success, Failed, or Timeout |
| **Time Limit** | 20-second countdown, auto-close on success after 3s |

### Module Scope
- **PaymentModal**: Order summary and upgrade initiation.
- **PaymentProcessing**: Visual countdown ring and gateway verification polling.
- **PaymentResult**: Terminal result display (success, failure, timeout).
- **usePaymentVerification**: Orchestrates timer, polling, and state transitions.
- **Upgrade Mutation**: `POST /api/user/subscription/upgrade`.

---

## 2. Business Rules

### 2.1 Payment Flow Rules
1. **Single Currency**: All prices are displayed in USD (backend-controlled).
2. **Billing Cycle Display**: The UI currently hardcodes "Monthly" as the billing cycle label (based on `duration_months = 1`).
3. **No Retry from Result Page**: On payment failure, the user must navigate back to `/plans` to re-initiate the upgrade.
4. **Auto-Close on Success**: The success result screen auto-dismisses after 3 seconds and redirects to `/dashboard`.

---

## 3. Frontend

### 3.1 Component Architecture

#### PaymentModal
**Responsibility:** Order summary overlay that initiates the payment session.

**Behavior:**
- Displays plan name, hardcoded "Monthly" billing cycle, and total price.
- Calls `upgradeMutation.mutateAsync({ plan_slug })` on proceed.
- On success, performs `window.location.href = result.payment_url` (full page redirect to Paymenter HPP).
- Overlay and close button are disabled while `isUpgrading` is true to prevent accidental dismissal.
- Errors are surfaced via `alert()` (to be replaced with toast system in production).

#### PaymentProcessing
**Responsibility:** Visual feedback during gateway verification with a countdown ring.

**Visual Elements:**
- SVG circle with `stroke-dashoffset` animation representing remaining time.
- Countdown text (`timeLeft` in seconds).
- Warning: "Please do not close this window."

**Props Interface:**
```typescript
interface PaymentProcessingProps {
  transactionId: number;
  onSuccess: () => void;
  onFailure: () => void;
  onTimeout: () => void;
}
```

#### PaymentResult
**Responsibility:** Terminal state renderer for success, failure, and timeout.

**States:**
- **Success**: Checkmark SVG, auto-dismiss after 3 seconds via `useEffect` timer.
- **Failed**: Error icon, optional retry button (navigates to `/plans`), close button.
- **Timeout**: Hourglass icon, reassuring message that verification will complete asynchronously, close button.

### 3.2 Hooks Architecture

#### usePaymentVerification
**Responsibility:** Orchestrates the polling countdown and gateway verification.

**Timer Logic:**
- Countdown starts at `timeoutSeconds` (default 20) and decrements every second.
- When `timeLeft <= 0`, calls `onTimeout()` and stops polling.
- **⚠️ Known Issue:** The `setInterval` timer is not properly synchronized with the `isDone` state. If `data` resolves and `isDone` becomes `true` simultaneously with a timer tick, a race condition may occur where `onTimeout` fires after `onSuccess`.

**Polling Logic:**
- Uses `useQuery` with `refetchInterval: 3000` (3 seconds).
- Polling stops when `isDone === true`.
- Status mapping:
  - `confirmed` / `already_confirmed` → `onSuccess()`
  - `failed` → `onFailure()`
  - `pending` → Continue polling

**Visual Math:**
```typescript
const radius = 54;
const circumference = 2 * Math.PI * radius;
const offset = circumference - (timeLeft / timeoutSeconds) * circumference;
```

#### useSubscription (relevant mutation)
| Mutation | Endpoint | OnSuccess |
|----------|----------|-----------|
| `upgrade` | `POST /api/user/subscription/upgrade` | Invalidates `['currentSubscription']` |

### 3.3 Service Layer

| Method | HTTP | Endpoint | Response |
|--------|------|----------|----------|
| `upgrade(payload)` | POST | `/api/user/subscription/upgrade` | `{ payment_url: string }` |
| `verifyPayment(id)` | GET | `/api/user/subscription/verify/{id}` | `VerifyPaymentResponse` |

### 3.4 Routing

#### Route Definition (App.tsx)
```typescript
<Route path="/payment-result" element={<ProtectedRoute><PaymentResultPage /></ProtectedRoute>} />
```
**⚠️ Critical Issue:** `/payment-result` is protected. If a user's session expires while at the payment gateway, the callback redirect loses the `transaction_id` query parameter when `ProtectedRoute` redirects to `/login`.

#### Navigation Flow
```
/plans → PaymentModal → window.location.href = payment_url
                          │
                          ▼
                Paymenter Hosted Page
                          │
                          ▼
                /payment/callback?ref=...&transaction_id=... (backend)
                          │
                          ▼
                Redirect to /payment-result?transaction_id=...
                          │
                          ▼
                PaymentResultPage → PaymentProcessing (polls verify)
                          │
                          ├── Success → /dashboard
                          ├── Failed  → /plans
                          └── Timeout → /plans
```

---

## 4. API Contract

### 4.1 Upgrade Subscription (Initiate Payment)
```http
POST /api/user/subscription/upgrade
Authorization: Bearer (session cookie)
Content-Type: application/json

{ "plan_slug": "expert" }
```
**Response 202:**
```json
{
  "success": true,
  "message": "Redirecting to secure payment gateway.",
  "data": { "payment_url": "https://paymenter.com/pay/session/abc123" }
}
```

### 4.2 Verify Payment (Polling)
```http
GET /api/user/subscription/verify/{transactionId}
Authorization: Bearer (session cookie)
```
**Response 200 (Confirmed):**
```json
{
  "success": true,
  "data": {
    "status": "confirmed",
    "subscription": { /* SubscriptionResource */ },
    "payment": {
      "gateway_transaction_id": 12345,
      "status": "success",
      "amount": "9.99",
      "paid_at": "2026-06-25T14:30:00Z"
    }
  }
}
```
**Other statuses:** `already_confirmed`, `pending`, `failed`.

---

## 5. Flows

### 5.1 Upgrade Initiation (from Plan Selection)
```
User clicks "Upgrade" on PlanCard
   └── handleSelectPlan(plan)
         └── setSelectedPlan(plan) → setIsPaymentModalOpen(true)

PaymentModal renders:
   ├── Plan name, "Monthly" (hardcoded), price
   └── User clicks "Proceed to Secure Payment"
         └── handleProceedToPayment()
               ├── upgradeMutation.mutateAsync({ plan_slug })
               ├── Backend creates pending subscription + payment
               ├── Returns { payment_url }
               └── window.location.href = payment_url
```

### 5.2 Payment Verification (Frontend Polling)
```
User returns from Paymenter → /payment-result?transaction_id=...
   │
   ├── PaymentResultPage extracts transaction_id from URL
   ├── If missing → shows Failed state
   └── If present → renders PaymentProcessing
         │
         ├── Starts 20-second countdown (SVG ring)
         ├── useQuery polls /verify/{transactionId} every 3s
         │
         ├── If confirmed/already_confirmed:
         │      ├── onSuccess → invalidateQueries
         │      ├── PaymentResult renders Success
         │      └── Auto-redirect to /dashboard after 3s
         │
         ├── If failed:
         │      └── onFailure → PaymentResult renders Failed
         │
         └── If timeout (20s elapsed):
                └── onTimeout → PaymentResult renders Timeout
```

---

## 6. Edge Cases

### 6.1 Session Expiry During Payment (Critical)
**Scenario:** User is at Paymenter HPP. Their Laravel Sanctum session expires. The gateway redirects back to `/payment-result?transaction_id=123`.
**Current Behavior:** `ProtectedRoute` detects `!isAuthenticated` and redirects to `/login`, **stripping the query parameters**.
**Impact:** After re-login, the user lands on `/dashboard` with no knowledge of the pending verification. The subscription may remain `PENDING_PAYMENT` until the cron cancels it.
**Severity:** **Critical** — will cause lost revenue and support tickets.
**Mitigation:** Make `/payment-result` a public route. Store `transaction_id` in `sessionStorage` before redirecting to login. Resume verification after re-authentication.

### 6.2 Race Condition in usePaymentVerification Timer
**Scenario:** The payment is confirmed at exactly `timeLeft = 1`. The `useQuery` data update and the `setInterval` tick fire in the same render cycle.
**Current Behavior:** `isDone` may be set to `true` by the data effect, but the timer effect may still call `onTimeout()` before React processes the state update.
**Impact:** User sees "Timeout" UI briefly before "Success", or gets stuck on timeout.
**Mitigation:** Use a single `useEffect` that coordinates both data and timer state, or use `useRef` to track completion status and prevent `onTimeout` from firing after success.

### 6.3 Double-Click on "Proceed to Payment"
**Scenario:** User double-clicks the proceed button in `PaymentModal`.
**Current Behavior:** `disabled={isUpgrading}` prevents the second click, but the `alert()` error handler on the first request may fire asynchronously and confuse the user.
**Impact:** Minor UX friction.
**Mitigation:** Replace `alert()` with a toast notification system. Ensure the button remains disabled until the redirect completes.

### 6.4 Browser Back Button from HPP
**Scenario:** User clicks "Back" in the browser while on the Paymenter HPP instead of completing payment.
**Current Behavior:** User returns to `/plans`. The subscription remains `PENDING_PAYMENT` with no `gateway_transaction_id`. The `SubscriptionStatusBanner` shows "Payment Incomplete" with a retry button.
**Impact:** Correct behavior — user is informed and can retry.

### 6.5 Network Loss During Polling
**Scenario:** User returns from the bank but loses Wi-Fi during the `PaymentProcessing` polling phase.
**Current Behavior:** `useQuery` will retry once (default config), then call `onFailure` if the network remains down. The user sees "Payment Failed" even though the bank may have processed the charge.
**Impact:** False failure state. User may retry and be double-charged.
**Mitigation:** Increase retry count for the verify query specifically, or implement offline detection that pauses polling instead of failing.

---

## 7. Notes & Recommendations

### 7.1 Critical Fixes

#### A. Fix `/payment-result` Authentication Trap
1. Remove `<ProtectedRoute>` from `/payment-result` in `App.tsx`.
2. In `PaymentResultPage`, wrap the initial logic in a try-catch. On `401`, store `transaction_id` in `sessionStorage` and redirect to `/login?redirect=/payment-result`.
3. In post-login flow, read the `redirect` param and navigate back, then resume verification.

#### B. Fix Race Condition in `usePaymentVerification`
```typescript
const isCompletedRef = useRef(false);

useEffect(() => {
  if (isCompletedRef.current) return;
  if (timeLeft <= 0) {
    isCompletedRef.current = true;
    setIsDone(true);
    onTimeout();
  }
}, [timeLeft, onTimeout]);

useEffect(() => {
  if (isCompletedRef.current || !data) return;
  if (data.status === 'confirmed' || data.status === 'already_confirmed') {
    isCompletedRef.current = true;
    setIsDone(true);
    onSuccess();
  } else if (data.status === 'failed') {
    isCompletedRef.current = true;
    setIsDone(true);
    onFailure();
  }
}, [data, onSuccess, onFailure]);
```

### 7.2 Architectural Improvements
- **Dynamic Billing Cycle**: Replace hardcoded `<span>Monthly</span>` with logic based on `plan.duration_months`.
- **Toast Notifications**: Replace `alert()` with a proper toast system.
- **Offline Detection**: Pause polling when `navigator.onLine` is false; treat network errors differently from payment failures.
- **Idempotency**: Set `isUpgrading = true` immediately on click to prevent double requests.