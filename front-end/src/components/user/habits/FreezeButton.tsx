import React from 'react';
import { Habit } from '@/types/habit';
import { useSubscription } from '@/hooks/user/useSubscription';
import { useStreakFreezes } from '@/hooks/user/useStreakFreezes';
import { useNavigate } from 'react-router-dom';

interface Props { habit: Habit; }

const FreezeButton: React.FC<Props> = ({ habit }) => {
  const navigate = useNavigate();
  const { quotas } = useSubscription();
  const { applyFreeze, isFreezing } = useStreakFreezes();
  
  const hasStreak = (habit.streak?.current_streak || 0) > 0;
  const isCompletedToday = !!habit.today_log;
  
  const freezeLimit = quotas?.freezes?.limit || 0;
  const freezeUsed = quotas?.freezes?.used || 0;
  const isUnlimited = quotas?.freezes?.unlimited || false;
  const isQuotaFull = !isUnlimited && freezeUsed >= freezeLimit;

  if (!hasStreak || isCompletedToday) return null;

  const handleClick = () => {
    if (isQuotaFull) { navigate('/plans'); return; }
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    applyFreeze({ habitId: habit.id, payload: { frozen_date: yesterday.toISOString().split('T')[0] } });
  };

  return (
    <button 
      className={`freeze-button ${isQuotaFull ? 'freeze-button--locked' : ''}`}
      onClick={handleClick}
      disabled={isFreezing}
      title={isQuotaFull ? 'Freeze limit reached. Upgrade to unlock more.' : 'Freeze streak for yesterday'}
    >
      {isFreezing ? <span className="spinner-border spinner-border-sm" role="status"></span> : <i className={`fas ${isQuotaFull ? 'fa-lock' : 'fa-snowflake'}`}></i>}
    </button>
  );
};

export default FreezeButton;