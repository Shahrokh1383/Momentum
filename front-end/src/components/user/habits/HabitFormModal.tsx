import React, { useEffect } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Modal from '@/components/ui/Modal';
import CreatableTagInput from '@/components/ui/CreatableTagInput';
import { Habit, HabitPayload } from '@/types/habit';
import { Category } from '@/types/category';
import { Tag } from '@/types/tag';
import { habitSchema, HabitFormData } from '@/validation/habitSchema';
import { transformFormDataToPayload } from '@/utils/habit/habitFormUtils';

// Sub-components
import NumericFields from './form-fields/NumericFields';
import TimerFields from './form-fields/TimerFields';
import ChecklistFields from './form-fields/ChecklistFields';
import ScheduleFields from './form-fields/ScheduleFields';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: HabitPayload) => Promise<void>;
  isLoading: boolean;
  initialData?: Habit | null;
  categories: Category[];
  existingTags: Tag[];
  canUseReminders: boolean;
  errorMessage?: string | null;
}

const HabitFormModal: React.FC<Props> = ({ 
  isOpen, onClose, onSubmit, isLoading, initialData, categories, existingTags, canUseReminders, errorMessage 
}) => {
  const { register, handleSubmit, reset, control, setValue, formState: { errors } } = useForm<HabitFormData>({
    resolver: zodResolver(habitSchema),
    defaultValues: {
      title: '', description: '', category_id: null, type: 'boolean',
      frequency: 'daily', due_days_of_week: [], reminder_time: '',
      schedule: { reminders: [] }, target_value: null, unit: '', tags: [],
      checklist_items: [],
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
          reminder_time: canUseReminders ? (initialData.reminder_time || '') : '',
          schedule: initialData.schedule || { reminders: [] },
          target_value: initialData.target_value,
          unit: initialData.unit || '',
          tags: initialData.tags.map(t => t.id),
          checklist_items: initialData.checklist_items || [],
        });
      } else {
        reset({
          title: '', description: '', category_id: null, type: 'boolean',
          frequency: 'daily', due_days_of_week: [], reminder_time: '',
          schedule: { reminders: [] }, target_value: null, unit: '', tags: [], checklist_items: [],
        });
      }
    }
  }, [isOpen, initialData, reset, canUseReminders]);

  const onFormSubmit = async (data: HabitFormData) => {
    try {
      const payload = transformFormDataToPayload(data, canUseReminders);
      await onSubmit(payload);
      onClose();
    } catch (err) {
      console.error('Habit submission error:', err);
    }
  };

  const footer = (
    <div className="d-flex gap-2 w-100 justify-content-end">
      <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={isLoading}>Cancel</button>
      <button type="submit" form="habit-form" className="btn btn-primary" style={{ background: 'var(--gradient-btn)', border: 'none' }} disabled={isLoading}>
        {isLoading ? <><span className="spinner-border spinner-border-sm me-2" /> Saving...</> : (initialData ? 'Update Habit' : 'Create Habit')}
      </button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Edit Habit' : 'New Habit'} footer={footer}>
      <form id="habit-form" onSubmit={handleSubmit(onFormSubmit)} className="d-flex flex-column gap-3 habit-form">
        {errorMessage && (
          <div className="category-form__api-error"><i className="fas fa-exclamation-circle me-2"></i> {errorMessage}</div>
        )}

        <div className="settings-form__group mb-0">
          <label className="settings-form__label">Habit Title</label>
          <input type="text" className={`settings-form__input ${errors.title ? 'is-invalid' : ''}`} {...register('title')} />
          {errors.title && <p className="category-form__error">{String(errors.title.message)}</p>}
        </div>

        <div className="settings-form__group mb-0">
          <label className="settings-form__label">Description (Optional)</label>
          <textarea className="settings-form__input settings-form__textarea" rows={2} {...register('description')} />
        </div>

        <div className="row g-3">
          <div className="col-md-6">
            <div className="settings-form__group mb-0 h-100">
              <label className="settings-form__label">Category</label>
              <select className="settings-form__input" {...register('category_id', { valueAsNumber: true })}>
                <option value="">Uncategorized</option>
                {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
              </select>
            </div>
          </div>

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

        {watchedType === 'numeric' && <NumericFields register={register} errors={errors} />}
        {watchedType === 'timer' && <TimerFields register={register} errors={errors} />}
        {watchedType === 'checklist' && <ChecklistFields control={control} errors={errors} />}

        <ScheduleFields 
          control={control} register={register} setValue={setValue} errors={errors} 
          canUseReminders={canUseReminders} watchedFreq={watchedFreq} 
        />

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