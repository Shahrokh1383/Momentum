import React, { useState } from 'react';
import { useCategories } from '@/hooks/user/useCategories';
import { Category, CategoryPayload } from '@/types/category';
import CategoryQuotaBanner from '@/components/user/categories/CategoryQuotaBanner';
import CategoryGrid from '@/components/user/categories/CategoryGrid';
import CategoryFormModal from '@/components/user/categories/CategoryFormModal';
import '@/styles/categories.css';

const CategoriesPage: React.FC = () => {
  const {
    categories, isLoading,
    createCategory, isCreating, createError,
    updateCategory, isUpdating, updateError,
    deleteCategory, isDeleting, deleteError,
  } = useCategories();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

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

  const handleDelete = async (id: number) => {
    try {
      await deleteCategory(id);
    } catch (err) {
      console.error('Failed to delete category', err);
    }
  };

  const getErrorMessage = () => {
    const err: any = createError || updateError || deleteError;
    if (err?.response?.data?.error === 'quota_exceeded') {
      return `You have reached your limit of ${err.response.data.limit} categories. Please upgrade your plan.`;
    }
    if (err?.response?.data?.error === 'category_in_use') {
      return 'Cannot delete this category because it contains active habits.';
    }
    return err?.response?.data?.message || err?.message || 'An unexpected error occurred.';
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
        isDeleting={isDeleting}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
        onAddClick={handleOpenCreate}
      />

      <CategoryFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleFormSubmit}
        isLoading={isCreating || isUpdating}
        initialData={editingCategory}
        errorMessage={(createError || updateError) ? getErrorMessage() : null}
      />
    </div>
  );
};

export default CategoriesPage;