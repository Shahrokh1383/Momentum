import React from 'react';

interface PremiumBadgeProps {
  planSlug: 'free' | 'premium' | 'lifetime';
  className?: string;
}

const PremiumBadge: React.FC<PremiumBadgeProps> = ({ planSlug, className = '' }) => {
  const getLabel = () => {
    switch (planSlug) {
      case 'premium': return 'Premium';
      case 'lifetime': return 'Lifetime';
      default: return 'Free';
    }
  };

  return (
    <span className={`premium-badge premium-badge--${planSlug} ${className}`}>
      {getLabel()}
    </span>
  );
};

export default PremiumBadge;