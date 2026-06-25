import React from 'react';
import { Plan } from '@/types/subscription';
import { 
  getPlanLimits, 
  getPlanFeatures, 
  getPlanPriceDisplay, 
  getPlanCtaText 
} from '@/utils/billing/planUtils';

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
  const limits = getPlanLimits(plan);
  const features = getPlanFeatures(plan);
  const priceDisplay = getPlanPriceDisplay(plan);
  const ctaText = getPlanCtaText(isCurrent, isAuthenticated);

  const handleClick = () => {
    if (!isCurrent && onSelect) {
      onSelect(plan);
    }
  };

  return (
    <div className={`plan-card ${isFeatured ? 'plan-card--featured' : ''} ${isCurrent ? 'plan-card--current' : ''}`}>
      <div className="plan-card__header">
        <h3 className="plan-card__name">{plan.name}</h3>
        <div className="plan-card__price">{priceDisplay}</div>
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
        {ctaText}
      </button>
    </div>
  );
};

export default PlanCard;