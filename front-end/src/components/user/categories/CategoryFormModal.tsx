import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Modal from '@/components/ui/Modal';
import { Category, CategoryPayload } from '@/types/category';

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Max 255 characters'),
  color: z.string().regex(/^#([0-9A-F]{3}){1,2}$/i, 'Invalid hex color (e.g., #4F46E5)'),
  icon: z.string().min(1, 'Icon class is required').max(50, 'Max 50 characters'),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CategoryPayload) => Promise<void>;
  isLoading: boolean;
  initialData?: Category | null;
  errorMessage?: string | null;
}

const CategoryFormModal: React.FC<Props> = ({ 
  isOpen, onClose, onSubmit, isLoading, initialData, errorMessage 
}) => {
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      color: '#4F46E5',
      icon: 'fa-solid fa-folder',
    },
  });

  const watchedColor = watch('color');
  const watchedIcon = watch('icon');
  const isValidHex = /^#([0-9A-F]{3}){1,2}$/i.test(watchedColor || '');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({
          name: initialData.name,
          color: initialData.color,
          icon: initialData.icon,
        });
      } else {
        reset({ name: '', color: '#4F46E5', icon: 'fa-solid fa-folder' });
      }
    }
  }, [isOpen, initialData, reset]);

  const onFormSubmit = async (data: CategoryFormData) => {
    try {
      await onSubmit(data);
      onClose();
    } catch (err) {
      // Error is handled by parent via errorMessage prop
    }
  };

  const footer = (
    <div className="d-flex gap-2 w-100 justify-content-end">
      <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={isLoading}>
        Cancel
      </button>
      <button 
        type="submit" 
        form="category-form" 
        className="btn btn-primary" 
        style={{ background: 'var(--gradient-btn)', border: 'none' }}
        disabled={isLoading}
      >
        {isLoading ? (
          <><span className="spinner-border spinner-border-sm me-2" /> Saving...</>
        ) : (
          initialData ? 'Update Category' : 'Create Category'
        )}
      </button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Edit Category' : 'New Category'} footer={footer}>
      <form id="category-form" onSubmit={handleSubmit(onFormSubmit)} className="d-flex flex-column gap-3">
        {errorMessage && (
          <div className="category-form__api-error">
            <i className="fas fa-exclamation-circle me-2"></i>
            {errorMessage}
          </div>
        )}

        <div className="settings-form__group mb-0">
          <label className="settings-form__label">Category Name</label>
          <input 
            type="text" 
            className={`settings-form__input ${errors.name ? 'is-invalid' : ''}`}
            placeholder="e.g., Health & Fitness"
            {...register('name')} 
          />
          {errors.name && <p className="category-form__error">{errors.name.message}</p>}
        </div>

        <div className="category-form__preview-group">
          <div className="settings-form__group mb-0 flex-grow-1">
            <label className="settings-form__label">Hex Color</label>
            <input 
              type="text" 
              className={`settings-form__input ${errors.color ? 'is-invalid' : ''}`}
              placeholder="#4F46E5"
              {...register('color')} 
            />
            {errors.color && <p className="category-form__error">{errors.color.message}</p>}
          </div>
          <div 
            className="category-form__color-preview" 
            style={{ backgroundColor: isValidHex ? watchedColor : '#cbd5e1' }}
          />
        </div>

        <div className="category-form__preview-group">
          <div className="settings-form__group mb-0 flex-grow-1">
            <label className="settings-form__label">Icon Class</label>
            <input 
              type="text" 
              className={`settings-form__input ${errors.icon ? 'is-invalid' : ''}`}
              placeholder="fa-solid fa-heart"
              {...register('icon')} 
            />
            {errors.icon && <p className="category-form__error">{errors.icon.message}</p>}
          </div>
          <div className="category-form__icon-preview" style={{ color: isValidHex ? watchedColor : 'var(--text-main)' }}>
            <i className={watchedIcon || 'fa-solid fa-folder'}></i>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default CategoryFormModal;