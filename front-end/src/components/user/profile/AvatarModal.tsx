import React, { useRef, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useAuthStore } from '@/context/user/authStore';

interface AvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Updated to Promise<unknown> to accept React Query's mutateAsync return type
  onUpload: (file: File) => Promise<unknown>; 
  onDelete: () => Promise<unknown>;
  isUploading: boolean;
  isDeleting: boolean;
}

const AvatarModal: React.FC<AvatarModalProps> = ({ 
  isOpen, onClose, onUpload, onDelete, isUploading, isDeleting 
}) => {
  const { avatarVersion } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');

  const avatarUrl = `/api/user/profile/avatar?v=${avatarVersion}`;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation (DRY & UX)
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Image size must be less than 2MB.');
      return;
    }

    onUpload(file).finally(() => {
      if (fileInputRef.current) fileInputRef.current.value = '';
    });
  };

  const handleDelete = async () => {
    await onDelete();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Profile Picture">
      <div className="avatar-modal">
        <div className="avatar-modal__preview">
          <img 
            src={avatarUrl} 
            alt="Avatar Preview" 
            className="avatar-modal__image"
          />
        </div>

        {error && <p className="avatar-modal__error">{error}</p>}

        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden-input" 
          accept="image/png, image/jpeg, image/webp" 
          onChange={handleFileSelect}
        />

        <div className="avatar-modal__actions">
          <button 
            className="settings-form__btn" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isDeleting}
          >
            {isUploading ? 'Uploading...' : 'Upload New Photo'}
          </button>
          
          <button 
            className="avatar-modal__btn-delete" 
            onClick={handleDelete}
            disabled={isUploading || isDeleting}
          >
            {isDeleting ? 'Removing...' : 'Remove Photo'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AvatarModal;