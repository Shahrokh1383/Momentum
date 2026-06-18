import React from 'react';
import { useSubscription } from '@/hooks/user/useSubscription';

interface Props {
  onAddClick: () => void;
}

const CategoryQuotaBanner: React.FC<Props> = ({ onAddClick }) => {
  const { quotas, isLoadingQuotas } = useSubscription();

  if (isLoadingQuotas || !quotas) {
    return (
      <div className="glass-panel quota-banner">
        <div className="d-flex align-items-center gap-2 text-muted">
          <span className="spinner-border spinner-border-sm" /> Loading quotas...
        </div>
      </div>
    );
  }

  const used = quotas.usage?.categories ?? 0;
  const limit = quotas.limits.max_categories;
  const isUnlimited = limit === -1;
  const isAtLimit = !isUnlimited && used >= limit;
  
  const percentage = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
  const isDangerZone = !isUnlimited && percentage >= 80;

  return (
    <div className="glass-panel quota-banner">
      <div className="quota-banner__info">
        <div className="quota-banner__label">
          <i className="fas fa-chart-pie"></i>
          <span>
            {isUnlimited ? (
              <>Unlimited Categories <i className="fas fa-infinity ms-1" style={{ color: 'var(--primary)' }}></i></>
            ) : (
              <>Categories Usage: <strong className="ms-1">{used} / {limit}</strong></>
            )}
          </span>
        </div>
        
        {!isUnlimited && (
          <div className="quota-banner__progress-track">
            <div 
              className={`quota-banner__progress-bar ${isDangerZone ? 'quota-banner__progress-bar--danger' : ''}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        )}
      </div>

      <div className="quota-banner__actions">
        <button 
          className="btn-add-category" 
          onClick={onAddClick}
          disabled={isAtLimit}
        >
          <i className="fas fa-plus"></i> Add Category
        </button>
        
        {isAtLimit && (
          <div className="quota-banner__upsell">
            <i className="fas fa-crown me-2"></i> Upgrade to Expert for more categories
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryQuotaBanner;