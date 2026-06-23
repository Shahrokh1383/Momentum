import React from 'react';
import { useCategories } from '@/hooks/categories/useCategories';
import CategoryQuotaBanner from '@/components/user/categories/CategoryQuotaBanner';
import CategoryGrid from '@/components/user/categories/CategoryGrid';
import CategoryFormModal from '@/components/user/categories/CategoryFormModal';
import DeleteCategoryModal from '@/components/user/categories/DeleteCategoryModal';
import TrashedCategoriesModal from '@/components/user/categories/TrashedCategoriesModal';
import { useCategoriesPageActions } from '@/hooks/categories/useCategoriesPageActions';
import '@/styles/categories.css';

const CategoriesPage: React.FC = () => {
  const { categories, isLoading, trashedCategories, isTrashedLoading } = useCategories();
  
  const {
    isFormModalOpen, handleCloseFormModal, editingCategory, handleOpenCreate, handleFormSubmit, isSubmittingForm, formError,
    isDeleteModalOpen, handleCloseDeleteModal, deletingCategory, handleConfirmDelete, isDeleting, deleteError,
    isTrashedModalOpen, setIsTrashedModalOpen, restoreCategory, isRestoring, forceDeleteCategory, isForceDeleting,
    categoryActions
  } = useCategoriesPageActions();

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

      <CategoryQuotaBanner 
        onAddClick={handleOpenCreate} 
        trashCount={trashedCategories.length} 
      />

      <CategoryGrid
        categories={categories}
        isLoading={isLoading}
        categoryActions={categoryActions}
        onAddClick={handleOpenCreate}
      />

      <CategoryFormModal
        isOpen={isFormModalOpen}
        onClose={handleCloseFormModal}
        onSubmit={handleFormSubmit}
        isLoading={isSubmittingForm}
        initialData={editingCategory}
        errorMessage={formError}
      />

      <DeleteCategoryModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        categoryName={deletingCategory?.name || null}
        errorMessage={deleteError}
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