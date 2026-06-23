import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  isFreezing: boolean;
  currentStreak: number;
}

const FreezeStreakModal: React.FC<Props> = ({ isOpen, onClose, onConfirm, isFreezing, currentStreak }) => {
  const [reason, setReason] = useState('');

  const handleClose = () => {
    if (isFreezing) return;
    setReason('');
    onClose();
  };

  const handleConfirm = async () => {
    const trimmed = reason.trim();
    if (trimmed.length < 3) return;
    await onConfirm(trimmed);
    setReason('');
  };

  const footer = (
    <div className="d-flex gap-2 w-100 justify-content-end">
      <button type="button" className="modal-btn modal-btn--secondary" onClick={handleClose} disabled={isFreezing}>
        Cancel
      </button>
      <button type="button" className="modal-btn modal-btn--primary" onClick={handleConfirm} disabled={isFreezing || reason.trim().length < 3}>
        {isFreezing ? (
          <><span className="spinner-border spinner-border-sm me-2" role="status"></span>Freezing...</>
        ) : (
          <><i className="fas fa-snowflake me-2"></i>Apply Freeze</>
        )}
      </button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Freeze Streak" footer={footer}>
      <div style={{ textAlign: 'center', padding: '1rem 0' }}>
        <p className="freeze-modal__desc mb-3">
          Protect your <strong>{currentStreak}-day streak</strong> for <strong>yesterday</strong>.
          Please provide a reason for the freeze.
        </p>

        <div className="freeze-modal__field text-start">
          <textarea
            className="freeze-modal__textarea settings-form__input"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g., Was sick, family emergency, travel..."
            rows={3}
            maxLength={255}
            autoFocus
          />
          {reason.trim().length > 0 && reason.trim().length < 3 && (
            <small className="freeze-modal__hint text-danger">Reason must be at least 3 characters.</small>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default FreezeStreakModal;