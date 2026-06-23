import { useState } from 'react';
import { Category, CategoryPayload } from '@/types/category';
import { useCategories } from './useCategories';
import { getFormErrorMessage, getDeleteErrorMessage } from '@/utils/category/categoryErrors';

export const useCategoriesPageActions = () => {
  const {
    createCategory, isCreating, createError,
    updateCategory, isUpdating, updateError,
    deleteCategory, isDeleting, deleteError,
    restoreCategory, isRestoring,
    forceDeleteCategory, isForceDeleting,
  } = useCategories();

  // Form Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  // Trashed Modal State
  const [isTrashedModalOpen, setIsTrashedModalOpen] = useState(false);

  const handleOpenCreate = () => { setEditingCategory(null); setIsFormModalOpen(true); };
  const handleOpenEdit = (category: Category) => { setEditingCategory(category); setIsFormModalOpen(true); };
  const handleCloseFormModal = () => { setIsFormModalOpen(false); setEditingCategory(null); };

  const handleFormSubmit = async (data: CategoryPayload) => {
    if (editingCategory) {
      await updateCategory({ id: editingCategory.id, payload: data });
    } else {
      await createCategory(data);
    }
  };

  const handleOpenDelete = (category: Category) => { setDeletingCategory(category); setIsDeleteModalOpen(true); };
  const handleCloseDeleteModal = () => { setIsDeleteModalOpen(false); setDeletingCategory(null); };
  
  const handleConfirmDelete = async () => {
    if (deletingCategory) {
      try {
        await deleteCategory(deletingCategory.id);
        handleCloseDeleteModal();
      } catch (err) { /* Handled by React Query */ }
    }
  };

  return {
    // Form Modal
    isFormModalOpen, handleCloseFormModal, editingCategory, handleOpenCreate, handleFormSubmit,
    isSubmittingForm: isCreating || isUpdating,
    formError: (createError || updateError) ? getFormErrorMessage(createError || updateError) : null,

    // Delete Modal
    isDeleteModalOpen, handleCloseDeleteModal, deletingCategory, handleOpenDelete, handleConfirmDelete,
    isDeleting,
    deleteError: deleteError ? getDeleteErrorMessage(deleteError) : null,

    // Trashed Modal
    isTrashedModalOpen, setIsTrashedModalOpen,
    restoreCategory, isRestoring, forceDeleteCategory, isForceDeleting,

    // Bundled Actions for Child Components (Fixes Prop Drilling)
    categoryActions: { onEdit: handleOpenEdit, onDeleteRequest: handleOpenDelete }
  };
};