import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { Category } from '@/types/category';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  trashedCategories: Category[];
  isLoading: boolean;
  onRestore: (id: number) => Promise<unknown>; // Changed from Promise<void>
  onForceDelete: (id: number) => Promise<unknown>; // Changed from Promise<void>
  isRestoring: boolean;
  isForceDeleting: boolean;
}

const TrashedCategoriesModal: React.FC<Props> = ({ 
  isOpen, onClose, trashedCategories, isLoading, onRestore, onForceDelete, isRestoring, isForceDeleting 
}) => {
  const [confirmForceDeleteId, setConfirmForceDeleteId] = useState<number | null>(null);

  const handleClose = () => {
    setConfirmForceDeleteId(null);
    onClose();
  };

  const handleRestore = async (id: number) => {
    try {
      await onRestore(id);
    } catch (err) {
      console.error('Restore failed', err);
    }
  };

  const handleForceDeleteClick = (id: number) => {
    if (confirmForceDeleteId === id) {
      onForceDelete(id).catch(console.error);
      setConfirmForceDeleteId(null);
    } else {
      setConfirmForceDeleteId(id);
    }
  };

  const handleCancelForceDelete = () => {
    setConfirmForceDeleteId(null);
  };

  const footer = (
    <div className="w-100 d-flex justify-content-end">
      <button type="button" className="modal-btn modal-btn--secondary" onClick={handleClose}>
        Close
      </button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Trashed Categories" footer={footer}>
      {isLoading ? (
        <div className="d-flex justify-content-center py-4">
          <div className="spinner-border text-primary"></div>
        </div>
      ) : trashedCategories.length === 0 ? (
        <div className="d-flex flex-column align-items-center justify-content-center py-5" style={{ color: 'var(--text-muted)' }}>
          <i className="fas fa-trash-can fa-3x mb-3" style={{ opacity: 0.3 }}></i>
          <p className="mb-0">No trashed categories found.</p>
        </div>
      ) : (
        <div className="trashed-list">
          {trashedCategories.map((cat) => (
            <div 
              key={cat.id} 
              className="trashed-list__item"
              onClick={handleCancelForceDelete}
            >
              <div className="trashed-list__info">
                <div className="trashed-list__icon" style={{ color: cat.color, background: `${cat.color}15` }}>
                  <i className={cat.icon}></i>
                </div>
                <div>
                  <div className="trashed-list__name">{cat.name}</div>
                  <div className="trashed-list__date">
                    Deleted {new Date(cat.deleted_at!).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="trashed-list__actions" onClick={(e) => e.stopPropagation()}>
                <button 
                  className="modal-btn modal-btn--secondary btn-sm"
                  onClick={() => handleRestore(cat.id)}
                  disabled={isRestoring || isForceDeleting}
                  title="Restore Category"
                >
                  <i className="fas fa-rotate-left me-1"></i> Restore
                </button>

                <button 
                  className={`modal-btn btn-sm ${confirmForceDeleteId === cat.id ? 'modal-btn--danger' : 'modal-btn--secondary'}`}
                  onClick={() => handleForceDeleteClick(cat.id)}
                  disabled={isRestoring || (isForceDeleting && confirmForceDeleteId !== cat.id)}
                  title={confirmForceDeleteId === cat.id ? "Click again to confirm permanent delete" : "Permanent Delete"}
                >
                  {isForceDeleting && confirmForceDeleteId === cat.id ? (
                    <span className="spinner-border spinner-border-sm" />
                  ) : confirmForceDeleteId === cat.id ? (
                    <>Confirm?</>
                  ) : (
                    <i className="fas fa-fire"></i>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};

export default TrashedCategoriesModal;