import React, { useState } from 'react';
import { Habit } from '@/types/habit';
import { useSubscription } from '@/hooks/useSubscription';
import { useStreakFreezes } from '@/hooks/useStreakFreezes';
import { useNavigate } from 'react-router-dom';

interface Props { habit: Habit; }

const FreezeButton: React.FC<Props> = ({ habit }) => {
  const navigate = useNavigate();
  const { quotas } = useSubscription();
  const { applyFreeze, isFreezing } = useStreakFreezes();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reason, setReason] = useState('');

  const hasStreak = (habit.streak?.current_streak || 0) > 0;
  const isCompletedToday = !!habit.today_log;

  const freezeLimit = quotas?.freezes?.limit || 0;
  const freezeUsed = quotas?.freezes?.used || 0;
  const isUnlimited = quotas?.freezes?.unlimited || false;
  const isQuotaFull = !isUnlimited && freezeUsed >= freezeLimit;

  if (!hasStreak || isCompletedToday) return null;

  const handleOpenModal = () => {
    if (isQuotaFull) { navigate('/plans'); return; }
    setReason('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isFreezing) return;
    setIsModalOpen(false);
    setReason('');
  };

  const handleConfirmFreeze = async () => {
    const trimmed = reason.trim();
    if (trimmed.length < 3) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    try {
      await applyFreeze({
        habitId: habit.id,
        payload: { frozen_date: yesterday.toISOString().split('T')[0], reason: trimmed },
      });
      setIsModalOpen(false);
      setReason('');
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

      {isModalOpen && (
        <div className="freeze-modal-overlay" onClick={handleCloseModal}>
          <div className="freeze-modal" onClick={e => e.stopPropagation()}>
            <div className="freeze-modal__header">
              <h3 className="freeze-modal__title">
                <i className="fas fa-snowflake"></i> Freeze Streak
              </h3>
              <button className="freeze-modal__close" onClick={handleCloseModal} disabled={isFreezing}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <p className="freeze-modal__desc">
              Protect your <strong>{habit.streak?.current_streak || 0}-day streak</strong> for <strong>yesterday</strong>.
              Please provide a reason for the freeze.
            </p>

            <div className="freeze-modal__field">
              <textarea
                className="freeze-modal__textarea"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g., Was sick, family emergency, travel..."
                rows={3}
                maxLength={255}
                autoFocus
              />
              {reason.trim().length > 0 && reason.trim().length < 3 && (
                <small className="freeze-modal__hint">Reason must be at least 3 characters.</small>
              )}
            </div>

            <div className="freeze-modal__actions">
              <button
                className="freeze-modal__btn freeze-modal__btn--cancel"
                onClick={handleCloseModal}
                disabled={isFreezing}
              >
                Cancel
              </button>
              <button
                className="freeze-modal__btn freeze-modal__btn--confirm"
                onClick={handleConfirmFreeze}
                disabled={isFreezing || reason.trim().length < 3}
              >
                {isFreezing ? (
                  <><span className="spinner-border spinner-border-sm me-2" role="status"></span>Freezing...</>
                ) : (
                  <><i className="fas fa-snowflake me-2"></i>Apply Freeze</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FreezeButton;