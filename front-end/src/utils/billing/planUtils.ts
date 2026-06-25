import { Plan } from '@/types/subscription';

export const formatPlanLimit = (value: number): string => {
  return value === -1 ? 'Unlimited' : value.toString();
};

export interface PlanLimitDisplay {
  label: string;
  value: string;
}

export const getPlanLimits = (plan: Plan): PlanLimitDisplay[] => [
  { label: 'Active Habits', value: formatPlanLimit(plan.limits.max_active_habits) },
  { label: 'Groups', value: formatPlanLimit(plan.limits.max_groups) },
  { label: 'Categories', value: formatPlanLimit(plan.limits.max_categories) },
  { label: 'Freezes/Week', value: formatPlanLimit(plan.limits.max_freezes_per_week) },
  { label: 'Photos/Log', value: formatPlanLimit(plan.limits.max_photos_per_log) },
  { label: 'PDFs/Month', value: formatPlanLimit(plan.limits.max_pdfs_per_month) },
];

export interface PlanFeatureDisplay {
  label: string;
  active: boolean;
}

export const getPlanFeatures = (plan: Plan): PlanFeatureDisplay[] => {
  if (plan.slug === 'free') {
    return [
      { label: 'Basic Analytics', active: true },
      { label: '1 Photo/Log', active: plan.limits.max_photos_per_log >= 1 },
      { label: '1 Group', active: plan.limits.max_groups >= 1 },
    ];
  }
  
  if (plan.slug === 'expert') {
    return [
      { label: 'Timers', active: plan.features.has_xp_booster },
      { label: '5 Photos/Log', active: plan.limits.max_photos_per_log >= 5 },
      { label: 'Correlations', active: plan.features.has_insights },
      { label: 'Advanced Analytics', active: plan.features.has_advanced_analytics },
    ];
  }
  
  if (plan.slug === 'premium') {
    return [
      { label: 'Smart Reminders', active: plan.features.has_smart_reminders },
      { label: 'Predictive Insights', active: plan.features.has_predictive_insights },
      { label: 'Unlimited Groups', active: plan.limits.max_groups === -1 },
      { label: 'Unlimited Photos', active: plan.limits.max_photos_per_log === -1 },
      { label: 'XP Booster', active: plan.features.has_xp_booster },
    ];
  }

  return [];
};

export const getPlanPriceDisplay = (plan: Plan): string => {
  if (plan.slug === 'free') return 'Free';
  if (plan.pricing.monthly) return `$${plan.pricing.monthly}/month`;
  if (plan.pricing.yearly) return `$${plan.pricing.yearly}/year`;
  return 'Contact us';
};

export const getPlanCtaText = (isCurrent: boolean, isAuthenticated: boolean): string => {
  if (isCurrent) return 'Current Plan';
  if (!isAuthenticated) return 'Get Started';
  return 'Upgrade';
};