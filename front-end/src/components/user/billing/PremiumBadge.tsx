import React from 'react';

interface PremiumBadgeProps {
  planSlug: 'free' | 'expert' | 'premium';
  className?: string;
}

const PremiumBadge: React.FC<PremiumBadgeProps> = ({ planSlug, className = '' }) => {
  const getIcon = () => {
    switch (planSlug) {
      case 'expert':
        return <i className="fas fa-star" style={{ color: '#C0C0C0', marginRight: '0.35rem' }} />;
      case 'premium':
        return <i className="fas fa-crown" style={{ color: '#FFD700', marginRight: '0.35rem' }} />;
      default:
        return null;
    }
  };

  const getLabel = () => {
    switch (planSlug) {
      case 'expert': return 'Expert';
      case 'premium': return 'Premium';
      default: return '';
    }
  };

  if (planSlug === 'free') {
    return <span className={`premium-badge premium-badge--free ${className}`}>Free</span>;
  }

  return (
    <span className={`premium-badge premium-badge--${planSlug} ${className}`}>
      {getIcon()}
      {getLabel()}
    </span>
  );
};

export default PremiumBadge;