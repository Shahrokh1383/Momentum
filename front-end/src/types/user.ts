export interface User {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  role: 'user' | 'admin';
  email_verified_at: string | null;
  profile_visibility: 'public' | 'friends_only' | 'private';
  active_plan: 'free' | 'expert' | 'premium';
  subscription: Subscription | null;
  created_at: string;
}

export interface PlanLimits {
  max_active_habits: number;
  max_groups: number;
  max_categories: number;
  max_freezes_per_week: number;
  max_photos_per_log: number;
  max_pdfs_per_month: number;
  allowed_habit_types: string[];
}

export interface PlanFeatures {
  has_advanced_analytics: boolean;
  has_insights: boolean;
  has_predictive_insights: boolean;
  has_smart_reminders: boolean;
  has_xp_booster: boolean;
  xp_multiplier: number;
}

export interface PlanPricing {
  monthly: number | null;
  yearly: number | null;
}

export interface Plan {
  id: number;
  name: string;
  slug: 'free' | 'expert' | 'premium';
  duration_months: number;
  limits: PlanLimits;
  features: PlanFeatures;
  pricing: PlanPricing;
  created_at: string;
}

export interface Subscription {
  id: number;
  plan: Plan | null;
  plan_slug: 'free' | 'expert' | 'premium';
  status: 'pending_payment' | 'active' | 'cancelled' | 'expired';
  starts_at: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
  transaction_ref: string;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  pendingEmail: string | null;
  activePlan: 'free' | 'expert' | 'premium';
  isExpert: boolean;
  isPremium: boolean;
  hasInitiallyLoaded: boolean;
  setUser: (user: User | null) => void;
  setPendingEmail: (email: string | null) => void;
  logout: () => void;
}

export interface LoginPayload {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface ResetPasswordPayload {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface VerifyEmailPayload {
  id: string;
  hash: string;
  expires: string;
  signature: string;
}