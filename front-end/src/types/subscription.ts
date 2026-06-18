export interface Plan {
  id: number;
  name: string;
  slug: 'free' | 'expert' | 'premium';
  limits: {
    max_active_habits: number;
    max_groups: number;
    max_freezes_per_week: number;
    max_photos_per_log: number;
    max_pdfs_per_month: number;
    max_categories: number;
  };
  features: {
    has_advanced_analytics: boolean;
    has_insights: boolean;
    has_predictive_insights: boolean;
    has_smart_reminders: boolean;
    has_xp_booster: boolean;
    xp_multiplier: number;
  };
  pricing: {
    monthly: string | null;
    yearly: string | null;
  };
  created_at: string;
}

export interface SubscriptionDetail {
  id: number;
  plan: Plan | null;
  plan_slug: 'free' | 'expert' | 'premium';
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

export interface UpgradePayload {
  plan_slug: string;
}

export interface UpgradeResponse {
  payment_url: string;
}

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
  usage: Record<string, number>;
  features: Record<string, boolean>;
}