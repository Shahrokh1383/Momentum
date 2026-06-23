import { Habit, HabitLog, HabitLogPayload, HabitLogChecklistLog } from '@/types/habit';

type LogStatus = HabitLog['status'];

export const deriveChecklistStatus = (
  habit: Habit,
  checklistLogs: HabitLogPayload['checklist_logs']
): LogStatus => {
  const totalItems = habit.checklist_items?.length || 0;
  if (totalItems === 0) return 'pending';
  const checkedCount = checklistLogs?.filter(cl => cl.is_checked).length || 0;
  return checkedCount >= totalItems ? 'completed' : 'pending';
};

export const deriveNumericStatus = (
  habit: Habit,
  value: number | null | undefined
): LogStatus => {
  const target = habit.target_value || 0;
  if (target <= 0) return 'pending';
  const numValue = value ?? 0;
  return numValue >= target ? 'completed' : 'pending';
};

export const deriveOptimisticStatus = (
  habit: Habit,
  payload: HabitLogPayload
): LogStatus => {
  switch (habit.type) {
    case 'checklist':
      return deriveChecklistStatus(habit, payload.checklist_logs);
    case 'numeric':
      return deriveNumericStatus(habit, payload.value);
    default:
      return payload.status || 'completed';
  }
};

export const buildOptimisticLog = (
  habitId: number,
  habit: Habit,
  payload: HabitLogPayload
): HabitLog => {
  // Explicitly map and type to satisfy HabitLogChecklistLog requirements
  const checklistLogs: HabitLogChecklistLog[] | undefined = payload.checklist_logs
    ? payload.checklist_logs.map(cl => ({
        checklist_item_id: cl.checklist_item_id,
        is_checked: cl.is_checked,
        title: habit.checklist_items?.find(ci => ci.id === cl.checklist_item_id)?.title || '',
        sort_order: habit.checklist_items?.find(ci => ci.id === cl.checklist_item_id)?.sort_order || 0,
      }))
    : undefined;

  return {
    id: Math.random(), // Temporary ID for optimistic rendering
    habit_id: habitId,
    logged_date: payload.logged_date,
    status: deriveOptimisticStatus(habit, payload),
    notes: payload.notes || null,
    value: payload.value,
    duration_seconds: payload.duration_seconds,
    checklist_logs: checklistLogs,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};

/**
 * Safely merges a partial payload into an existing HabitLog, ensuring 
 * checklist_logs retain required UI properties (title, sort_order).
 */
export const mergePayloadIntoLog = (
  habit: Habit,
  existingLog: HabitLog,
  payload: Partial<HabitLogPayload>
): HabitLog => {
  const updatedLog: HabitLog = {
    ...existingLog,
    ...payload,
    checklist_logs: payload.checklist_logs
      ? payload.checklist_logs.map(cl => ({
          checklist_item_id: cl.checklist_item_id,
          is_checked: cl.is_checked,
          title: habit.checklist_items?.find(ci => ci.id === cl.checklist_item_id)?.title || '',
          sort_order: habit.checklist_items?.find(ci => ci.id === cl.checklist_item_id)?.sort_order || 0,
        }))
      : existingLog.checklist_logs,
  };

  // Derive status for types where it's calculated, not explicitly set
  if (habit.type === 'checklist' && payload.checklist_logs) {
    updatedLog.status = deriveChecklistStatus(habit, payload.checklist_logs);
  } else if (habit.type === 'numeric' && payload.value !== undefined) {
    updatedLog.status = deriveNumericStatus(habit, payload.value);
  } else if (payload.status) {
    updatedLog.status = payload.status;
  }

  return updatedLog;
};