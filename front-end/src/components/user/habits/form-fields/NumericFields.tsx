import React from 'react';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { HabitFormData } from '@/validation/habitSchema';

interface Props {
  register: UseFormRegister<HabitFormData>;
  errors: FieldErrors<HabitFormData>;
}

const NumericFields: React.FC<Props> = ({ register, errors }) => {
  return (
    <div className="row g-3 habit-form__dynamic-fields">
      <div className="col-6">
        <label className="settings-form__label">Target Value</label>
        <input 
          type="number" 
          step="0.01" 
          className={`settings-form__input ${errors.target_value ? 'is-invalid' : ''}`} 
          {...register('target_value', { valueAsNumber: true })} 
        />
        {errors.target_value && <p className="category-form__error">{String(errors.target_value.message)}</p>}
      </div>
      <div className="col-6">
        <label className="settings-form__label">Unit</label>
        <input 
          type="text" 
          className="settings-form__input" 
          placeholder="e.g., km, pages" 
          {...register('unit')} 
        />
      </div>
    </div>
  );
};

export default NumericFields;