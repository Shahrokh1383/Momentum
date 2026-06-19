import React, { useState } from 'react';
import { useCategories } from '@/hooks/user/useCategories';
import { Category, CategoryPayload } from '@/types/category';
import CategoryQuotaBanner from '@/components/user/categories/CategoryQuotaBanner';
import CategoryGrid from '@/components/user/categories/CategoryGrid';
import CategoryFormModal from '@/components/user/categories/CategoryFormModal';
import DeleteCategoryModal from '@/components/user/categories/DeleteCategoryModal';
import '@/styles/categories.css';

const CategoriesPage: React.FC = () => {
  const {
    categories, isLoading,
    createCategory, isCreating, createError,
    updateCategory, isUpdating, updateError,
    deleteCategory, isDeleting, deleteError,
  } = useCategories();

  // Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (category: Category) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const handleFormSubmit = async (data: CategoryPayload) => {
    if (editingCategory) {
      await updateCategory({ id: editingCategory.id, payload: data });
    } else {
      await createCategory(data);
    }
  };

  // Delete Handlers
  const handleOpenDelete = (category: Category) => {
    setDeletingCategory(category);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletingCategory(null);
  };

  const handleConfirmDelete = async () => {
    if (deletingCategory) {
      try {
        await deleteCategory(deletingCategory.id);
        handleCloseDeleteModal(); // Only close on success
      } catch (err) {
        // Error is caught and displayed inside the modal via deleteError prop
      }
    }
  };

  const getFormErrorMessage = () => {
    const err: any = createError || updateError;
    if (err?.response?.data?.error === 'quota_exceeded') {
      return `You have reached your limit of ${err.response.data.limit} categories. Please upgrade your plan.`;
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
      <div className="categories-page__header">
        <h1 className="categories-page__title">Categories</h1>
        <p className="text-muted-custom mb-0">Organize your habits into meaningful groups.</p>
      </div>

      <CategoryQuotaBanner onAddClick={handleOpenCreate} />

      <CategoryGrid
        categories={categories}
        isLoading={isLoading}
        onEdit={handleOpenEdit}
        onDeleteRequest={handleOpenDelete} // Changed prop name for clarity
        onAddClick={handleOpenCreate}
      />

      {/* Create / Edit Modal */}
      <CategoryFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleFormSubmit}
        isLoading={isCreating || isUpdating}
        initialData={editingCategory}
        errorMessage={(createError || updateError) ? getFormErrorMessage() : null}
      />

      {/* Delete Confirmation Modal */}
      <DeleteCategoryModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        categoryName={deletingCategory?.name || null}
        errorMessage={deleteError ? getDeleteErrorMessage() : null}
      />
    </div>
  );
};

export default CategoriesPage;