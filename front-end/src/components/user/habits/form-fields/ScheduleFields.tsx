import React from 'react';
import { Controller, Control, UseFormSetValue, UseFormRegister, FieldErrors } from 'react-hook-form';
import { HabitFormData } from '@/validation/habitSchema';

interface Props {
  control: Control<HabitFormData>;
  register: UseFormRegister<HabitFormData>;
  setValue: UseFormSetValue<HabitFormData>;
  errors: FieldErrors<HabitFormData>;
  canUseReminders: boolean;
  watchedFreq: string;
}

const DAYS_OF_WEEK = [
  { iso: 1, label: 'Mon' }, { iso: 2, label: 'Tue' }, { iso: 3, label: 'Wed' },
  { iso: 4, label: 'Thu' }, { iso: 5, label: 'Fri' }, { iso: 6, label: 'Sat' }, { iso: 7, label: 'Sun' }
];

const ScheduleFields: React.FC<Props> = ({ 
  control, register, setValue, errors, canUseReminders, watchedFreq 
}) => {
  return (
    <>
      <div className="settings-form__group mb-0">
        <label className="settings-form__label">Frequency</label>
        <div className="d-flex gap-2 mb-2">
          <button 
              type="button" 
              className={`habit-form__freq-btn ${watchedFreq === 'daily' ? 'active' : ''}`} 
              onClick={() => {
                  setValue('frequency', 'daily');
                  setValue('due_days_of_week', []);
              }}
          >
              Daily
          </button>
          <button 
              type="button" 
              className={`habit-form__freq-btn ${watchedFreq === 'weekly' ? 'active' : ''}`} 
              onClick={() => setValue('frequency', 'weekly')}
          >
              Weekly
          </button>
        </div>
        
        {watchedFreq !== 'daily' && (
          <Controller
            name="due_days_of_week"
            control={control}
            render={({ field }) => (
              <div className="habit-form__days-picker">
                {DAYS_OF_WEEK.map(day => {
                  const isSelected = field.value?.includes(day.iso);
                  return (
                    <button
                      key={day.iso}
                      type="button"
                      className={`habit-form__day-btn ${isSelected ? 'active' : ''}`}
                      onClick={() => {
                        const newValue = isSelected 
                          ? field.value?.filter((d: number) => d !== day.iso) 
                          : [...(field.value || []), day.iso];
                        field.onChange(newValue);
                      }}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            )}
          />
        )}
      </div>

      <div className="settings-form__group mb-0">
        <label className="settings-form__label">Basic Reminder Time</label>
        {canUseReminders ? (
          <input type="time" className={`settings-form__input ${errors.reminder_time ? 'is-invalid' : ''}`} {...register('reminder_time')} />
        ) : (
          <div className="habit-form__locked-field">
            <input 
              type="text" 
              className="settings-form__input" 
              value="Upgrade to unlock reminders" 
              disabled 
              readOnly 
            />
            <a href="/plans" className="habit-form__upgrade-link">
              <i className="fas fa-crown me-1"></i> Upgrade Plan
            </a>
          </div>
        )}
        {errors.reminder_time && <p className="category-form__error">{String(errors.reminder_time.message)}</p>}
      </div>
    </>
  );
};

export default ScheduleFields;