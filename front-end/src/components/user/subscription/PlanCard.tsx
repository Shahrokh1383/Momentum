import React from 'react';
import { Plan } from '@/types/subscription';

interface PlanCardProps {
  plan: Plan;
  isCurrent?: boolean;
  isFeatured?: boolean;
  isAuthenticated?: boolean;
  onSelect?: (plan: Plan) => void;
  disabled?: boolean;
}

const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  isCurrent = false,
  isFeatured = false,
  isAuthenticated = false,
  onSelect,
  disabled = false,
}) => {
  const formatLimit = (value: number): string => {
    return value === -1 ? 'Unlimited' : value.toString();
  };

  const limits = [
    { label: 'Active Habits', value: formatLimit(plan.limits.max_active_habits) },
    { label: 'Groups', value: formatLimit(plan.limits.max_groups) },
    { label: 'Categories', value: formatLimit(plan.limits.max_categories) },
    { label: 'Freezes/Week', value: formatLimit(plan.limits.max_freezes_per_week) },
    { label: 'Photos/Log', value: formatLimit(plan.limits.max_photos_per_log) },
    { label: 'PDFs/Month', value: formatLimit(plan.limits.max_pdfs_per_month) },
  ];

  // Dynamic feature mapping based on the agreed matrix
  const getFeatures = () => {
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

  const features = getFeatures();

  const getPriceDisplay = () => {
    if (plan.slug === 'free') return 'Free';
    if (plan.pricing.monthly) return `$${plan.pricing.monthly}/month`;
    if (plan.pricing.yearly) return `$${plan.pricing.yearly}/year`;
    return 'Contact us';
  };

  const getCtaText = () => {
    if (isCurrent) return 'Current Plan';
    if (!isAuthenticated) return 'Get Started';
    return 'Upgrade';
  };

  const handleClick = () => {
    if (!isCurrent && onSelect) {
      onSelect(plan);
    }
  };

  return (
    <div className={`plan-card ${isFeatured ? 'plan-card--featured' : ''} ${isCurrent ? 'plan-card--current' : ''}`}>
      <div className="plan-card__header">
        <h3 className="plan-card__name">{plan.name}</h3>
        <div className="plan-card__price">{getPriceDisplay()}</div>
      </div>

      <ul className="plan-card__limits">
        {limits.map((item) => (
          <li key={item.label} className="plan-card__limit-item">
            <span className="plan-card__limit-label">{item.label}</span>
            <span className="plan-card__limit-value">{item.value}</span>
          </li>
        ))}
      </ul>

      <ul className="plan-card__features">
        {features.map((feature) => (
          <li key={feature.label} className={`plan-card__feature-item ${feature.active ? 'plan-card__feature-item--active' : 'plan-card__feature-item--inactive'}`}>
            <i className={`fas ${feature.active ? 'fa-check' : 'fa-times'}`}></i>
            <span>{feature.label}</span>
          </li>
        ))}
      </ul>

      <button
        className={`plan-card__cta ${isCurrent ? 'plan-card__cta--current' : ''}`}
        onClick={handleClick}
        disabled={disabled || isCurrent}
      >
        {getCtaText()}
      </button>
    </div>
  );
};

export default PlanCard;