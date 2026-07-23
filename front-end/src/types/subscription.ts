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

export interface LatestPayment {
  status: string;
  gateway_transaction_id: string | null;
  amount: string;
}

export interface SubscriptionDetail {
  id: number;
  plan: Plan | null;
  plan_slug: 'free' | 'expert' | 'premium';
  status: 'pending_payment' | 'active' | 'cancelled' | 'expired' | 'payment_failed';
  starts_at: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
  transaction_ref: string | null;
  created_at: string;
  latest_payment?: LatestPayment | null;
}

export interface UpgradePayload {
  plan_slug: string;
}

export interface UpgradeResponse {
  payment_url: string;
}

export interface VerifyPaymentResponse {
  status: 'success' | 'pending' | 'failed' | 'refunded';
  deadline: string;
  subscription?: SubscriptionDetail;
  payment?: {
    gateway_transaction_id: string;
    status: string;
    amount: string;
    paid_at: string | null;
    created_at: string;
  };
}

export interface QuotasData {
  plan: Plan | null;
  limits: Record<string, number>;
  usage: Record<string, number>;
  features: Record<string, boolean>;
  freezes: {
    used: number;
    limit: number;
    unlimited: boolean;
  };
  allowed_habit_types: string[];
}