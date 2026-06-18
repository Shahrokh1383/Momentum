import React from 'react';
import { Category } from '@/types/category';
import CategoryCard from './CategoryCard';

interface Props {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (id: number) => void;
  isLoading: boolean;
  isDeleting: boolean;
  onAddClick: () => void;
}

const CategoryGrid: React.FC<Props> = ({ 
  categories, onEdit, onDelete, isLoading, isDeleting, onAddClick 
}) => {
  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">
          <i className="fas fa-folder-plus"></i>
        </div>
        <h3 className="empty-state__title">No Categories Yet</h3>
        <p className="empty-state__text">
          Create your first category to start organizing your habits and tracking your progress.
        </p>
        <button className="btn-add-category mt-4" onClick={onAddClick}>
          <i className="fas fa-plus"></i> Create Category
        </button>
      </div>
    );
  }

  return (
    <div className="category-grid">
      {categories.map((category) => (
        <CategoryCard
          key={category.id}
          category={category}
          onEdit={onEdit}
          onDelete={onDelete}
          isDeleting={isDeleting}
        />
      ))}
    </div>
  );
};

export default CategoryGrid;