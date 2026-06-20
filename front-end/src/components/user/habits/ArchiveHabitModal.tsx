import React from 'react';
import Modal from '@/components/ui/Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading: boolean;
  habitTitle: string | null;
  isRestoring: boolean; // True if restoring, False if archiving
  errorMessage?: string | null;
}

const ArchiveHabitModal: React.FC<Props> = ({ 
  isOpen, onClose, onConfirm, isLoading, habitTitle, isRestoring, errorMessage 
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
        className={`modal-btn ${isRestoring ? 'modal-btn--primary' : 'modal-btn--danger'}`} 
        onClick={onConfirm} 
        disabled={isLoading}
      >
        {isLoading ? (
          <><span className="spinner-border spinner-border-sm me-2" /> Processing...</>
        ) : (
          <>
            <i className={`fas ${isRestoring ? 'fa-rotate-left' : 'fa-archive'} me-2`}></i> 
            Yes, {isRestoring ? 'Restore' : 'Archive'}
          </>
        )}
      </button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isRestoring ? 'Restore Habit' : 'Archive Habit'} footer={footer}>
      <div style={{ textAlign: 'center', padding: '1rem 0' }}>
        <div style={{ 
          width: '64px', 
          height: '64px', 
          borderRadius: '50%', 
          background: isRestoring ? 'rgba(17, 153, 142, 0.1)' : 'rgba(255, 193, 7, 0.1)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          margin: '0 auto 1.5rem',
          color: isRestoring ? 'var(--primary)' : '#ffc107',
          fontSize: '1.5rem'
        }}>
          <i className={`fas ${isRestoring ? 'fa-rotate-left' : 'fa-box-archive'}`}></i>
        </div>
        
        <p style={{ color: 'var(--text-main)', marginBottom: '0.5rem', fontSize: '1.05rem' }}>
          Are you sure you want to {isRestoring ? 'restore' : 'archive'}
        </p>
        <h4 style={{ color: 'var(--text-main)', fontWeight: 700, marginBottom: '1rem' }}>
          "{habitTitle}"?
        </h4>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
          {isRestoring 
            ? 'This habit will become active again and count towards your quota.' 
            : 'This habit will be hidden from your active dashboard and will not count towards your quota.'}
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

export default ArchiveHabitModal;