export interface VerifyPaymentResponse {
  status: 'success' | 'pending' | 'failed' | 'refunded';
  deadline: string;
  subscription?: {
    id: number;
    plan_slug: string;
    status: string;
    // ...other subscription fields if needed
  };
  payment?: {
    gateway_transaction_id: string;
    status: string;
    amount: string;
    paid_at: string | null;
    created_at: string;
  };
}