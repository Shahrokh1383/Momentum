export interface Plan {
  id: number;
  name: string;
  slug: string;
  limits: {
    max_active_habits: number;
    max_groups: number;
    max_freezes_per_week: number;
    max_photos_per_log: number;
    max_pdfs_per_month: number;
  };
  features: {
    has_advanced_analytics: boolean;
    has_insights: boolean;
    has_xp_booster: boolean;
    has_unlimited_photos: boolean;
  };
  pricing: {
    monthly: string | null;
    lifetime: string | null;
  };
  created_at: string;
}

export interface SubscriptionDetail {
  id: number;
  plan: Plan | null;
  plan_slug: string;
  status: 'pending_payment' | 'active' | 'cancelled' | 'expired';
  starts_at: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
  transaction_ref: string | null;
  created_at: string;
}

/**
 * Matches the backend Payment array returned in SubscriptionController@upgrade
 */
export interface PaymentInfo {
  gateway_transaction_id: number;
  status: string; // 'pending'
  amount: string;
  currency: string;
  card: string; // Masked card number from backend
}

/**
 * Matches UpgradeSubscriptionRequest validation rules:
 * - plan_slug: required, enum
 * - card_number: required, exactly 16 digits
 */
export interface UpgradePayload {
  plan_slug: string;
  card_number: string; 
}

/**
 * Matches the response from SubscriptionController@verify
 */
export interface VerifyPaymentResponse {
  status: 'confirmed' | 'already_confirmed' | 'pending' | 'failed' | 'unknown';
  subscription?: SubscriptionDetail;
  payment?: {
    gateway_transaction_id: number;
    status: string;
    amount: string;
    paid_at: string | null;
  };
}

export interface QuotasData {
  plan: Plan | null;
  limits: Record<string, number>;
  features: Record<string, boolean>;
}