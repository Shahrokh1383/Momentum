import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import '@/styles/modal.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, [isOpen]);

  // Handle Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  // Senior Fix: Use createPortal to render the modal outside the CSS stacking context 
  // of parent elements (like .glass-panel) that use backdrop-filter or transforms.
  return createPortal(
    <div 
      className={`modal-backdrop ${isOpen ? 'modal-backdrop--open' : ''}`} 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className="modal-container" 
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        <div className="modal-header">
          <h3 id="modal-title" className="modal-title">{title}</h3>
          <button 
            className="modal-close-btn" 
            onClick={onClose} 
            aria-label="Close modal"
          >
            <i className="fas fa-times" />
          </button>
        </div>
        
        <div className="modal-body">
          {children}
        </div>

        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default Modal;