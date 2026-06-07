import React from 'react';

interface PremiumBadgeProps {
  planSlug?: string | null;
}

const PremiumBadge: React.FC<PremiumBadgeProps> = ({ planSlug }) => {
  if (!planSlug) return null;
  if (planSlug === 'free') return <span className="premium-badge premium-badge--free">Free</span>;
  if (planSlug === 'lifetime') return <span className="premium-badge premium-badge--lifetime">Lifetime</span>;
  return <span className="premium-badge premium-badge--premium">Premium</span>;
};

export default PremiumBadge;