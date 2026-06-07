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
  status: string;
  starts_at: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
  payment_method: string | null;
  transaction_ref: string | null;
  created_at: string;
}

export interface PaymentInfo {
  id: number;
  status: string;
  amount: string;
  currency: string;
  provider_ref: string;
}

export interface UpgradePayload {
  plan_slug: string;
  payment_method?: string;
}

export interface QuotasData {
  plan: Plan | null;
  limits: Record<string, number>;
  features: Record<string, boolean>;
  usage: Record<string, number | null>;
}