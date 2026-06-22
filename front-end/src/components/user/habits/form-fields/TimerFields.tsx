import React from 'react';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { HabitFormData } from '@/validation/habitSchema';

interface Props {
  register: UseFormRegister<HabitFormData>;
  errors: FieldErrors<HabitFormData>;
}

const TimerFields: React.FC<Props> = ({ register, errors }) => {
  return (
    <div className="row g-3 habit-form__dynamic-fields">
      <div className="col-6">
        <label className="settings-form__label">Default Duration</label>
        <input 
          type="number" 
          step="1" 
          min="1"
          className={`settings-form__input ${errors.target_value ? 'is-invalid' : ''}`} 
          placeholder="e.g., 25"
          {...register('target_value', { valueAsNumber: true })} 
        />
        {errors.target_value && <p className="category-form__error">{String(errors.target_value.message)}</p>}
      </div>
      <div className="col-6">
        <label className="settings-form__label">Time Unit</label>
        <select className="settings-form__input" {...register('unit')}>
          <option value="minutes">Minutes</option>
          <option value="hours">Hours</option>
          <option value="seconds">Seconds</option>
        </select>
      </div>
      <div className="col-12">
        <small className="text-muted d-block mt-1">
          <i className="fas fa-info-circle me-1"></i>
          This sets the default time when logging your habit.
        </small>
      </div>
    </div>
  );
};

export default TimerFields;