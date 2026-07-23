## 3. Module: Payment Processing

# Payment Processing — Technical Documentation

> **Project:** Momentum Application  
> **Backend:** Laravel (PHP 8.2+)  
> **Pattern:** Domain-Driven Design (DDD) with Service Layer  
> **Last Updated:** 2026-06-25

---

## 1. Overview

The **Payment Processing** module handles all interactions with the external **Paymenter** gateway. It encapsulates the creation of hosted payment sessions, transaction verification, refunds, and the storage of payment records. It is the only module that directly communicates with the payment gateway.

### Key Characteristics
| Aspect | Implementation |
|--------|----------------|
| **Gateway** | Paymenter (external REST API) |
| **Model** | `Payment` records every transaction |
| **Callbacks** | Gateway redirect handled by `PaymentCallbackController` |
| **Currency** | Single-currency, config-based |
| **Refunds** | Full refund only; prorated not implemented |

### Module Scope
- **Paymenter Integration**: Thin HTTP client wrapper (`PaymenterService`).
- **Payment Lifecycle**: Pending → Success/Failed/Refunded.
- **Callback Handling**: Stateless redirect to capture gateway transaction ID.
- **Refund Execution**: Initiated by Subscription Lifecycle, executed here.
- **Security**: UUID-based callback references, no authentication on callback.

---

## 2. Business Rules

### 2.1 Payment Rules
1. **Full Refund**: Cancellation triggers a full refund of the latest successful payment. Prorated refunds are **not** implemented.
2. **Single Currency**: All transactions use the currency defined in `config('services.paymenter.currency')`.

---

## 3. Backend

### 3.1 Domain Model

#### Payment (`App\Models\Billing\Payment`)
| Field | Type | Purpose |
|-------|------|---------|
| `user_id` | FK | Owner |
| `subscription_id` | FK | Linked subscription |
| `amount` | decimal(10,2) | Charged amount |
| `currency` | string | Transaction currency |
| `status` | PaymentStatus enum | `pending`, `success`, `failed`, `refunded` |
| `gateway_transaction_id` | integer | Paymenter external ID |
| `card_number_masked` | string | Last 4 digits for receipts |
| `gateway_response` | JSON | Raw gateway response snapshot |
| `paid_at` | datetime | Confirmation timestamp |
| `refunded_at` | datetime | Refund timestamp |

### 3.2 Enums

#### `PaymentStatus` (enum `App\Enums\Billing\PaymentStatus`)
```php
enum PaymentStatus: string {
    case PENDING = 'pending';
    case SUCCESS = 'success';
    case FAILED = 'failed';
    case REFUNDED = 'refunded';
}
```

### 3.3 Service Layer

#### `PaymenterService`
Thin HTTP client wrapper around the Paymenter gateway.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `createSession(float, string, string, string)` | `POST /pay` | Creates hosted payment page session. Returns `payment_url`. |
| `verify(int)` | `GET /verify/{id}` | Confirms transaction status with gateway. |
| `refund(int)` | `POST /refund` | Initiates full refund for a transaction. |

**Configuration:**
```php
config('services.paymenter.url');  // Base API URL
config('services.paymenter.key');  // x-api-key header
config('services.paymenter.currency'); // Default currency code
```

### 3.4 Controllers

#### `PaymentCallbackController`
- `GET /payment/callback?ref={transaction_ref}&transaction_id={int}` → Gateway redirect endpoint.
  1. Validates `ref` and `transaction_id`.
  2. Finds subscription by `transaction_ref`.
  3. Updates pending `Payment` record with `gateway_transaction_id`.
  4. Redirects to frontend (`/payment-result?transaction_id={id}`) for polling.

### 3.5 Database Schema

#### `payments` Table
- `gateway_response` is JSON to store raw gateway payloads for audit trails.
- `gateway_transaction_id` is nullable until the user returns from the bank.

---

## 4. API Contract

### 4.1 Payment Gateway Callback (Web Route)
```http
GET /payment/callback?ref={transaction_ref}&transaction_id={gateway_id}
```
**Behavior:** Stateless redirect. Stores `gateway_transaction_id` on the pending payment record, then redirects to:
```
{FRONTEND_URL}/payment-result?transaction_id={gateway_id}
```

> Note: The frontend then polls `GET /api/user/subscription/verify/{transactionId}` to complete activation – that endpoint is documented in the Subscription Lifecycle module.

---

## 5. Flows

### 5.1 Payment Verification Flow (Gateway Callback & Polling)
```
Paymenter Gateway ──► Redirects to /payment/callback?ref=...&transaction_id=...
                        │
                        ▼
              PaymentCallbackController::handle()
                        │
                        ├──► Finds Subscription by transaction_ref
                        ├──► Updates Payment.gateway_transaction_id
                        └──► Redirects to Frontend /payment-result
                        │
                        ▼
              Frontend ──► GET /api/user/subscription/verify/{transactionId}
                        │
                        ▼
              SubscriptionService::verify()
                        │
                        ├──► PaymenterService::verify()  // this module
                        │      └── GET /verify/{id}
                        │
                        ├──► If Success: activateSubscription() (in Subscription Lifecycle)
                        │      ...
                        └──► If Failed: failPayment()
```

### 5.2 Refund Flow (Called by Subscription Cancellation)
```
SubscriptionService::cancel()
      └──► PaymenterService::refund(gateway_transaction_id)
               └── POST /refund
                    └── On success: Payment status → REFUNDED, refunded_at set
```

---

## 6. Edge Cases

### 6.1 User Closes Browser After Payment
**Scenario:** User pays at the gateway but closes the browser before the redirect to the frontend occurs.
**Current Behavior:** The `PaymentCallbackController` never receives the request. `gateway_transaction_id` is never stored. The frontend never polls. After 1 hour, the cron cancels the abandoned subscription.
**Impact:** User is charged but receives no subscription.
**Mitigation:** Implement Server-to-Server (S2S) webhooks from Paymenter to a backend endpoint (e.g., `POST /api/webhooks/paymenter`) that handles activation independently of the frontend.

### 6.2 Refund After Partial Usage
**Scenario:** User cancels after 20 days of a 30-day subscription.
**Current Behavior:** Full refund is issued regardless of usage duration.
**Impact:** Revenue loss.
**Mitigation:** Implement prorated refund calculation: `refund_amount = total_amount * (remaining_days / total_days)`.

---

## 7. Notes & Recommendations

### 7.1 Server-to-Server Webhooks
**Current Issue:** Payment verification relies entirely on frontend polling. If the user closes the browser, the payment is never verified.
**Recommendation:** Implement a `POST /api/webhooks/paymenter` endpoint that Paymenter can call directly. This endpoint should trigger `activateSubscription()` independently of user interaction. Frontend polling should only update UI state.

### 7.2 Idempotency Keys for Gateway Calls
**Recommendation:** Generate an idempotency key (e.g., `transaction_ref`) and pass it to Paymenter during `createSession()`. This prevents duplicate charges if the user retries or if the network times out.

### 7.3 Rate Limiting on Payment Endpoints
**Current Issue:** The upgrade and verify endpoints use the general `api-limiter` (60 req/min). A malicious user could exhaust this limit.
**Recommendation:** Add a dedicated `payment-limiter` (e.g., 5 requests per minute per user) to the upgrade and verify routes.

### 7.4 Prorated Refunds
**Current Issue:** Cancellation always triggers a full refund regardless of usage duration.
**Recommendation:** Calculate prorated refund amount based on remaining days and pass the calculated amount to the gateway refund API.

### 7.5 Security
- `transaction_ref` is a UUID, making enumeration attacks on the callback endpoint statistically infeasible.
- The callback endpoint does not perform authentication (it is hit by the payment gateway), but it does validate the presence of both `ref` and `transaction_id`.
- `gateway_response` is stored as JSON. Ensure sensitive data (full card numbers, CVV) is never logged or stored by the gateway in this field.