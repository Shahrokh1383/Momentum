import React from 'react';
import { useSubscription } from '@/hooks/useSubscription';

interface Props {
  onAddClick: () => void;
}

const HabitQuotaBanner: React.FC<Props> = ({ onAddClick }) => {
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

  const used = quotas.usage?.habits ?? 0;
  const limit = quotas.limits.max_active_habits;
  const isUnlimited = limit === -1;
  const isAtLimit = !isUnlimited && used >= limit;
  
  const percentage = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
  const isDangerZone = !isUnlimited && percentage >= 80;

  return (
    <div className="glass-panel quota-banner">
      <div className="quota-banner__info">
        <div className="quota-banner__label">
          <i className="fas fa-bullseye"></i>
          <span>
            {isUnlimited ? (
              <>Unlimited Active Habits <i className="fas fa-infinity ms-1" style={{ color: 'var(--primary)' }}></i></>
            ) : (
              <>Active Habits: <strong className="ms-1">{used} / {limit}</strong></>
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
          className="btn-add-habit" 
          onClick={onAddClick}
          disabled={isAtLimit}
        >
          <i className="fas fa-plus"></i> Add Habit
        </button>
        
        {isAtLimit && (
          <div className="quota-banner__upsell">
            <i className="fas fa-crown me-2"></i> Upgrade to Expert for more habits
          </div>
        )}
      </div>
    </div>
  );
};

export default HabitQuotaBanner;