import React from 'react';
import Modal from '@/components/ui/Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading: boolean;
  habitTitle: string | null;
  errorMessage?: string | null;
}

const DeleteHabitModal: React.FC<Props> = ({ 
  isOpen, onClose, onConfirm, isLoading, habitTitle, errorMessage 
}) => {
  const footer = (
    <div className="d-flex gap-2 w-100 justify-content-end">
      <button 
        type="button" 
        className="modal-btn modal-btn--secondary" 
        onClick={onClose} 
        disabled={isLoading}
      >
        Cancel
      </button>
      <button 
        type="button" 
        className="modal-btn modal-btn--danger" 
        onClick={onConfirm} 
        disabled={isLoading}
      >
        {isLoading ? (
          <><span className="spinner-border spinner-border-sm me-2" /> Deleting...</>
        ) : (
          <><i className="fas fa-trash-alt me-2"></i> Yes, Delete</>
        )}
      </button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Habit" footer={footer}>
      <div style={{ textAlign: 'center', padding: '1rem 0' }}>
        <div style={{ 
          width: '64px', 
          height: '64px', 
          borderRadius: '50%', 
          background: 'rgba(220, 53, 69, 0.1)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          margin: '0 auto 1.5rem',
          color: '#dc3545',
          fontSize: '1.5rem'
        }}>
          <i className="fas fa-exclamation-triangle"></i>
        </div>
        
        <p style={{ color: 'var(--text-main)', marginBottom: '0.5rem', fontSize: '1.05rem' }}>
          Are you sure you want to permanently delete
        </p>
        <h4 style={{ color: 'var(--text-main)', fontWeight: 700, marginBottom: '1rem' }}>
          "{habitTitle}"?
        </h4>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
          This action cannot be undone. All logs and streaks associated with this habit will be lost.
        </p>
      </div>

      {errorMessage && (
        <div className="category-form__api-error" style={{ marginTop: '1.5rem' }}>
          <i className="fas fa-exclamation-circle me-2"></i>
          {errorMessage}
        </div>
      )}
    </Modal>
  );
};

export default DeleteHabitModal;