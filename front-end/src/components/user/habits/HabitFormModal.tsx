import React, { useEffect } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Modal from '@/components/ui/Modal';
import CreatableTagInput from '@/components/ui/CreatableTagInput';
import { Habit, HabitPayload } from '@/types/habit';
import { Category } from '@/types/category';
import { Tag } from '@/types/tag';

const habitSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().nullable().optional(),
  category_id: z.number().nullable().optional(),
  type: z.enum(['boolean', 'numeric', 'timer', 'checklist']),
  frequency: z.enum(['daily', 'weekly', 'custom']),
  due_days_of_week: z.array(z.number()).optional(),
  reminder_time: z.string().nullable().optional(),
  schedule: z.object({
    reminders: z.array(z.string()).optional()
  }).optional(),
  target_value: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
  tags: z.array(z.union([z.number(), z.string()])).optional(),
});

type HabitFormData = z.infer<typeof habitSchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: HabitPayload) => Promise<void>;
  isLoading: boolean;
  initialData?: Habit | null;
  categories: Category[];
  existingTags: Tag[];
  errorMessage?: string | null;
}

const DAYS_OF_WEEK = [
  { iso: 1, label: 'Mon' }, { iso: 2, label: 'Tue' }, { iso: 3, label: 'Wed' },
  { iso: 4, label: 'Thu' }, { iso: 5, label: 'Fri' }, { iso: 6, label: 'Sat' }, { iso: 7, label: 'Sun' }
];

const HabitFormModal: React.FC<Props> = ({ 
  isOpen, onClose, onSubmit, isLoading, initialData, categories, existingTags, errorMessage 
}) => {
  const { register, handleSubmit, reset, control, setValue, formState: { errors } } = useForm<HabitFormData>({
    resolver: zodResolver(habitSchema),
    defaultValues: {
      title: '',
      description: '',
      category_id: null,
      type: 'boolean',
      frequency: 'daily',
      due_days_of_week: [],
      reminder_time: '',
      schedule: { reminders: [] },
      target_value: null,
      unit: '',
      tags: [],
    },
  });

  const watchedType = useWatch({ control, name: 'type' });
  const watchedFreq = useWatch({ control, name: 'frequency' });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({
          title: initialData.title,
          description: initialData.description || '',
          category_id: initialData.category?.id || null,
          type: initialData.type,
          frequency: initialData.frequency,
          due_days_of_week: initialData.due_days_of_week?.map(Number) || [],
          reminder_time: initialData.reminder_time || '',
          schedule: initialData.schedule || { reminders: [] },
          target_value: initialData.target_value,
          unit: initialData.unit || '',
          tags: initialData.tags.map(t => t.id),
        });
      } else {
        reset({
          title: '', description: '', category_id: null, type: 'boolean',
          frequency: 'daily', due_days_of_week: [], reminder_time: '',
          schedule: { reminders: [] }, target_value: null, unit: '', tags: [],
        });
      }
    }
  }, [isOpen, initialData, reset]);

  const onFormSubmit = async (data: HabitFormData) => {
    try {
      const payload: HabitPayload = {
        ...data,
        due_days_of_week: data.frequency !== 'daily' && data.due_days_of_week?.length 
          ? data.due_days_of_week.join(',') 
          : undefined,
        reminder_time: data.reminder_time || null,
        target_value: data.type === 'numeric' ? data.target_value : null,
        unit: data.type === 'numeric' ? data.unit : null,
      };
      
      if (payload.description === '') payload.description = null;
      if (payload.unit === '') payload.unit = null;

      await onSubmit(payload);
      onClose();
    } catch (err) {
      // Error handled by parent via mutation error state
    }
  };

  const footer = (
    <div className="d-flex gap-2 w-100 justify-content-end">
      <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={isLoading}>
        Cancel
      </button>
      <button 
        type="submit" 
        form="habit-form" 
        className="btn btn-primary" 
        style={{ background: 'var(--gradient-btn)', border: 'none' }}
        disabled={isLoading}
      >
        {isLoading ? (
          <><span className="spinner-border spinner-border-sm me-2" /> Saving...</>
        ) : (
          initialData ? 'Update Habit' : 'Create Habit'
        )}
      </button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Edit Habit' : 'New Habit'} footer={footer}>
      <form id="habit-form" onSubmit={handleSubmit(onFormSubmit)} className="d-flex flex-column gap-3 habit-form">
        {errorMessage && (
          <div className="category-form__api-error">
            <i className="fas fa-exclamation-circle me-2"></i> {errorMessage}
          </div>
        )}

        {/* Title */}
        <div className="settings-form__group mb-0">
          <label className="settings-form__label">Habit Title</label>
          <input type="text" className={`settings-form__input ${errors.title ? 'is-invalid' : ''}`} {...register('title')} />
          {errors.title && <p className="category-form__error">{errors.title.message}</p>}
        </div>

        {/* Description */}
        <div className="settings-form__group mb-0">
          <label className="settings-form__label">Description (Optional)</label>
          <textarea className="settings-form__input settings-form__textarea" rows={2} {...register('description')} />
        </div>

        <div className="row g-3">
          {/* Category */}
          <div className="col-md-6">
            <div className="settings-form__group mb-0 h-100">
              <label className="settings-form__label">Category</label>
              <select className="settings-form__input" {...register('category_id', { valueAsNumber: true })}>
                <option value="">Uncategorized</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Type */}
          <div className="col-md-6">
            <div className="settings-form__group mb-0 h-100">
              <label className="settings-form__label">Type</label>
              <select className="settings-form__input" {...register('type')}>
                <option value="boolean">Yes / No</option>
                <option value="numeric">Numeric Target</option>
                <option value="timer">Timer</option>
                <option value="checklist">Checklist</option>
              </select>
            </div>
          </div>
        </div>

        {/* Dynamic Fields for Numeric Type */}
        {watchedType === 'numeric' && (
          <div className="row g-3 habit-form__dynamic-fields">
            <div className="col-6">
              <label className="settings-form__label">Target Value</label>
              <input type="number" step="0.01" className="settings-form__input" {...register('target_value', { valueAsNumber: true })} />
            </div>
            <div className="col-6">
              <label className="settings-form__label">Unit</label>
              <input type="text" className="settings-form__input" placeholder="e.g., km, pages" {...register('unit')} />
            </div>
          </div>
        )}

        {/* Frequency & Schedule */}
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
                            ? field.value?.filter(d => d !== day.iso) 
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

        {/* Reminder */}
        <div className="settings-form__group mb-0">
          <label className="settings-form__label">Basic Reminder Time</label>
          <input type="time" className="settings-form__input" {...register('reminder_time')} />
        </div>

        {/* Tags */}
        <div className="settings-form__group mb-0">
          <label className="settings-form__label">Tags</label>
          <Controller
            name="tags"
            control={control}
            render={({ field }) => (
              <CreatableTagInput
                value={field.value || []}
                onChange={field.onChange}
                existingTags={existingTags}
                placeholder="Type to search or create tags..."
              />
            )}
          />
        </div>
      </form>
    </Modal>
  );
};

export default HabitFormModal;