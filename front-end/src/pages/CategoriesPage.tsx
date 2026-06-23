import React, { useState } from 'react';
import { useCategories } from '@/hooks/useCategories';
import { Category, CategoryPayload } from '@/types/category';
import CategoryQuotaBanner from '@/components/user/categories/CategoryQuotaBanner';
import CategoryGrid from '@/components/user/categories/CategoryGrid';
import CategoryFormModal from '@/components/user/categories/CategoryFormModal';
import DeleteCategoryModal from '@/components/user/categories/DeleteCategoryModal';
import TrashedCategoriesModal from '@/components/user/categories/TrashedCategoriesModal';
import '@/styles/categories.css';

const CategoriesPage: React.FC = () => {
  const {
    categories, isLoading,
    trashedCategories, isTrashedLoading,
    createCategory, isCreating, createError,
    updateCategory, isUpdating, updateError,
    deleteCategory, isDeleting, deleteError,
    restoreCategory, isRestoring,
    forceDeleteCategory, isForceDeleting,
  } = useCategories();

  // Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  // Trashed Modal State
  const [isTrashedModalOpen, setIsTrashedModalOpen] = useState(false);

  const handleOpenCreate = () => { setEditingCategory(null); setIsModalOpen(true); };
  const handleOpenEdit = (category: Category) => { setEditingCategory(category); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setEditingCategory(null); };

  const handleFormSubmit = async (data: CategoryPayload) => {
    if (editingCategory) {
      await updateCategory({ id: editingCategory.id, payload: data });
    } else {
      await createCategory(data);
    }
  };

  // Soft Delete Handlers
  const handleOpenDelete = (category: Category) => { setDeletingCategory(category); setIsDeleteModalOpen(true); };
  const handleCloseDeleteModal = () => { setIsDeleteModalOpen(false); setDeletingCategory(null); };
  
  const handleConfirmDelete = async () => {
    if (deletingCategory) {
      try {
        await deleteCategory(deletingCategory.id);
        handleCloseDeleteModal();
      } catch (err) {}
    }
  };

  const getFormErrorMessage = () => {
    const err: any = createError || updateError;
    if (err?.response?.data?.error === 'quota_exceeded') {
      return `You have reached your total limit of ${err.response.data.limit} categories. Please permanently delete from trash or upgrade your plan.`;
    }
    return err?.response?.data?.message || err?.message || 'An unexpected error occurred.';
  };

  const getDeleteErrorMessage = () => {
    const err: any = deleteError;
    if (err?.response?.data?.error === 'category_in_use') {
      return 'Cannot delete this category because it contains active habits.';
    }
    return err?.response?.data?.message || err?.message || 'Failed to delete category.';
  };

  return (
    <div className="categories-page">
      <div className="categories-page__header d-flex justify-content-between align-items-start flex-wrap gap-3">
        <div>
          <h1 className="categories-page__title mb-2">Categories</h1>
          <p className="text-muted-custom mb-0">Organize your habits into meaningful groups.</p>
        </div>
        <button 
          className="btn btn-outline-secondary d-flex align-items-center gap-2"
          onClick={() => setIsTrashedModalOpen(true)}
        >
          <i className="fas fa-trash-can"></i> View Trash
        </button>
      </div>

      {/* FIX: Pass the trashed count so the banner knows how to instruct the user */}
      <CategoryQuotaBanner 
        onAddClick={handleOpenCreate} 
        trashCount={trashedCategories.length} 
      />

      <CategoryGrid
        categories={categories}
        isLoading={isLoading}
        onEdit={handleOpenEdit}
        onDeleteRequest={handleOpenDelete}
        onAddClick={handleOpenCreate}
      />

      <CategoryFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleFormSubmit}
        isLoading={isCreating || isUpdating}
        initialData={editingCategory}
        errorMessage={(createError || updateError) ? getFormErrorMessage() : null}
      />

      <DeleteCategoryModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        categoryName={deletingCategory?.name || null}
        errorMessage={deleteError ? getDeleteErrorMessage() : null}
      />

      <TrashedCategoriesModal
        isOpen={isTrashedModalOpen}
        onClose={() => setIsTrashedModalOpen(false)}
        trashedCategories={trashedCategories}
        isLoading={isTrashedLoading}
        onRestore={restoreCategory}
        onForceDelete={forceDeleteCategory}
        isRestoring={isRestoring}
        isForceDeleting={isForceDeleting}
      />
    </div>
  );
};

export default CategoriesPage;