import React from 'react';
import { useFieldArray, Control, FieldErrors } from 'react-hook-form';
import { HabitFormData } from '@/validation/habitSchema';

interface Props {
  control: Control<HabitFormData>;
  errors: FieldErrors<HabitFormData>;
}

const ChecklistFields: React.FC<Props> = ({ control, errors }) => {
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'checklist_items',
  });

  // Handle nested array errors from Zod superRefine (RHF v7 compatibility)
  const checklistError = errors.checklist_items?.message || errors.checklist_items?.root?.message;

  return (
    <div className={`habit-form__checklist-panel ${checklistError ? 'has-error' : ''}`}>
      <div className="habit-form__checklist-header">
        <label className="settings-form__label mb-0">
          Checklist Items
        </label>
        <span className="habit-form__checklist-count">
          {fields.length} {fields.length === 1 ? 'Item' : 'Items'}
        </span>
      </div>

      <div className="habit-form__checklist-list">
        {fields.map((field, index) => (
          <div key={field.id} className="habit-form__checklist-item">
            <div className="habit-form__checklist-sort">
              <button 
                type="button" 
                className="habit-form__sort-btn" 
                onClick={() => move(index, index - 1)}
                disabled={index === 0}
                title="Move Up"
              >
                <i className="fas fa-chevron-up"></i>
              </button>
              <button 
                type="button" 
                className="habit-form__sort-btn" 
                onClick={() => move(index, index + 1)}
                disabled={index === fields.length - 1}
                title="Move Down"
              >
                <i className="fas fa-chevron-down"></i>
              </button>
            </div>

            <input
              type="text"
              className="habit-form__checklist-input"
              placeholder={`Item ${index + 1}`}
              {...control.register(`checklist_items.${index}.title`)}
            />

            <button 
              type="button" 
              className="habit-form__checklist-remove" 
              onClick={() => remove(index)}
              title="Remove Item"
            >
              <i className="fas fa-trash-alt"></i>
            </button>
          </div>
        ))}
      </div>

      <button 
        type="button" 
        className="habit-form__checklist-add" 
        onClick={() => append({ title: '', sort_order: fields.length })}
      >
        <i className="fas fa-plus-circle me-2"></i> Add Item
      </button>

      {checklistError && (
        <p className="category-form__error mt-2">
          <i className="fas fa-exclamation-circle me-1"></i> {String(checklistError)}
        </p>
      )}
    </div>
  );
};

export default ChecklistFields;