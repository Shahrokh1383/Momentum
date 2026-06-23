import { HabitFormData } from '@/validation/habitSchema';
import { HabitPayload } from '@/types/habit';

/**
 * Transforms the validated form data into the exact payload structure required by the API.
 * Strips out empty strings, handles timezone, and formats checklist items.
 */
export const transformFormDataToPayload = (
  data: HabitFormData, 
  canUseReminders: boolean
): HabitPayload => {
  const payload: HabitPayload = {
    ...data,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    due_days_of_week: data.frequency !== 'daily' && data.due_days_of_week?.length 
      ? data.due_days_of_week.join(',') 
      : undefined,
    reminder_time: canUseReminders ? (data.reminder_time || null) : null,
  };

  // Reset numeric/timer specific fields if the type doesn't support them
  if (data.type !== 'numeric' && data.type !== 'timer') {
    payload.target_value = null;
    payload.unit = null;
  }

  // Format checklist items for the backend
  if (data.type === 'checklist') {
    payload.checklist_items = (data.checklist_items || []).map((item, index) => ({
      title: item.title,
      sort_order: index,
    }));
  } else {
    payload.checklist_items = undefined;
  }
  
  // Convert empty strings to null to satisfy backend DB constraints
  if (payload.description === '') payload.description = null;
  if (payload.unit === '') payload.unit = null;

  return payload;
};