import React, { useState } from 'react';
import { Habit } from '@/types/habit';
import { useSubscription } from '@/hooks/useSubscription';
import { useStreakFreezes } from '@/hooks/habits/useStreakFreezes';
import { useNavigate } from 'react-router-dom';
import FreezeStreakModal from './FreezeStreakModal';

interface Props { habit: Habit; }

const FreezeButton: React.FC<Props> = ({ habit }) => {
  const navigate = useNavigate();
  const { quotas } = useSubscription();
  const { applyFreeze, isFreezing } = useStreakFreezes();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const hasStreak = (habit.streak?.current_streak || 0) > 0;
  const isCompletedToday = !!habit.today_log;

  const freezeLimit = quotas?.freezes?.limit || 0;
  const freezeUsed = quotas?.freezes?.used || 0;
  const isUnlimited = quotas?.freezes?.unlimited || false;
  const isQuotaFull = !isUnlimited && freezeUsed >= freezeLimit;

  if (!hasStreak || isCompletedToday) return null;

  const handleOpenModal = () => {
    if (isQuotaFull) { navigate('/plans'); return; }
    setIsModalOpen(true);
  };

  const handleConfirmFreeze = async (reason: string) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    try {
      await applyFreeze({
        habitId: habit.id,
        payload: { frozen_date: yesterday.toISOString().split('T')[0], reason },
      });
      setIsModalOpen(false);
    } catch (_err) { /* Handled by React Query error state */ }
  };

  return (
    <>
      <button
        className={`freeze-button ${isQuotaFull ? 'freeze-button--locked' : ''}`}
        onClick={handleOpenModal}
        disabled={isFreezing}
        title={isQuotaFull ? 'Freeze limit reached. Upgrade to unlock more.' : 'Freeze streak for yesterday'}
      >
        {isFreezing
          ? <span className="spinner-border spinner-border-sm" role="status"></span>
          : <i className={`fas ${isQuotaFull ? 'fa-lock' : 'fa-snowflake'}`}></i>
        }
      </button>

      <FreezeStreakModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmFreeze}
        isFreezing={isFreezing}
        currentStreak={habit.streak?.current_streak || 0}
      />
    </>
  );
};

export default FreezeButton;