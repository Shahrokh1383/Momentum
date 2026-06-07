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
    return value === -1 ? 'unlimited' : value.toString();
  };

  const limits = [
    { label: 'Active Habits', value: formatLimit(plan.limits.max_active_habits) },
    { label: 'Groups', value: formatLimit(plan.limits.max_groups) },
    { label: 'Freezes/Week', value: formatLimit(plan.limits.max_freezes_per_week) },
    { label: 'Photos/Log', value: formatLimit(plan.limits.max_photos_per_log) },
    { label: 'PDFs/Month', value: formatLimit(plan.limits.max_pdfs_per_month) },
  ];

  const booleanFeatures = [
    { label: 'Advanced Analytics', active: plan.features.has_advanced_analytics },
    { label: 'AI Insights', active: plan.features.has_insights },
    { label: 'XP Booster', active: plan.features.has_xp_booster },
    { label: 'Unlimited Photos', active: plan.features.has_unlimited_photos },
  ];

  const getPriceDisplay = () => {
    if (plan.slug === 'free') return 'Free';
    if (plan.pricing.monthly) return `$${plan.pricing.monthly}/month`;
    if (plan.pricing.lifetime) return `$${plan.pricing.lifetime} one-time`;
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
        {booleanFeatures.map((feature) => (
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