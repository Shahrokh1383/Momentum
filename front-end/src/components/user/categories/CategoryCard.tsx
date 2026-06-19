import React from 'react';
import { Category } from '@/types/category';

interface Props {
  category: Category;
  onEdit: (category: Category) => void;
  onDeleteRequest: (category: Category) => void; // Updated signature
}

const CategoryCard: React.FC<Props> = ({ category, onEdit, onDeleteRequest }) => {
  return (
    <div 
      className="category-card" 
      style={{ borderLeftColor: category.color }}
    >
      <div className="category-card__actions">
        <button 
          className="category-card__action-btn category-card__action-btn--edit"
          onClick={() => onEdit(category)}
          title="Edit Category"
          disabled={category.is_default}
        >
          <i className="fas fa-pen"></i>
        </button>
        <button 
          className="category-card__action-btn category-card__action-btn--delete"
          onClick={() => onDeleteRequest(category)} // Simply triggers the parent modal
          disabled={category.is_default}
          title={category.is_default ? 'Default categories cannot be deleted' : 'Delete Category'}
        >
          <i className="fas fa-trash"></i>
        </button>
      </div>

      <div className="category-card__header">
        <div 
          className="category-card__icon-wrapper"
          style={{ color: category.color, background: `${category.color}15` }} 
        >
          <i className={category.icon}></i>
        </div>
        <h3 className="category-card__name">{category.name}</h3>
      </div>

      {category.is_default && (
        <span className="badge bg-light text-muted border" style={{ alignSelf: 'flex-start', fontSize: '0.75rem' }}>
          <i className="fas fa-shield-alt me-1"></i> System Default
        </span>
      )}
    </div>
  );
};

export default CategoryCard;