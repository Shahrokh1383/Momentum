import { useMutation, useQueryClient } from '@tanstack/react-query';
import { habitLogService } from '@/services/user/habitLogService';
import { Habit, HabitLog, HabitLogPayload } from '@/types/habit';

type LogStatus = HabitLog['status'];

/**
 * Derive the correct optimistic status for a checklist habit log.
 * Only returns 'completed' when every single checklist item is checked.
 */
const deriveChecklistStatus = (
  habit: Habit,
  checklistLogs: HabitLogPayload['checklist_logs']
): LogStatus => {
  const totalItems = habit.checklist_items?.length || 0;
  if (totalItems === 0) return 'pending';
  const checkedCount = checklistLogs?.filter(cl => cl.is_checked).length || 0;
  return checkedCount >= totalItems ? 'completed' : 'pending';
};

export const useHabitLogs = () => {
  const queryClient = useQueryClient();

  const logMutation = useMutation({
    mutationFn: ({ habitId, payload }: { habitId: number; payload: HabitLogPayload }) =>
      habitLogService.log(habitId, payload),
    onMutate: async ({ habitId, payload }) => {
      await queryClient.cancelQueries({ queryKey: ['habits'] });
      const previousHabits = queryClient.getQueryData(['habits']);

      queryClient.setQueryData(['habits'], (oldData: Habit[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(h => {
          if (h.id === habitId) {
            const optimisticStatus: LogStatus = h.type === 'checklist'
              ? deriveChecklistStatus(h, payload.checklist_logs)
              : (payload.status || 'completed');

            const optimisticLog: HabitLog = {
              id: Math.random(),
              habit_id: habitId,
              logged_date: payload.logged_date,
              status: optimisticStatus,
              notes: payload.notes || null,
              value: payload.value,
              duration_seconds: payload.duration_seconds,
              checklist_logs: payload.checklist_logs?.map(cl => ({
                ...cl,
                title: h.checklist_items?.find(ci => ci.id === cl.checklist_item_id)?.title || '',
                sort_order: h.checklist_items?.find(ci => ci.id === cl.checklist_item_id)?.sort_order || 0,
              })),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            return { ...h, today_log: optimisticLog };
          }
          return h;
        });
      });
      return { previousHabits };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousHabits) queryClient.setQueryData(['habits'], context.previousHabits);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ logId, payload }: { logId: number; payload: Partial<HabitLogPayload> }) =>
      habitLogService.update(logId, payload),
    onMutate: async ({ logId, payload }) => {
      await queryClient.cancelQueries({ queryKey: ['habits'] });
      const previousHabits = queryClient.getQueryData(['habits']);

      queryClient.setQueryData(['habits'], (oldData: Habit[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(h => {
          if (h.today_log?.id === logId) {
            const updatedLog = { ...h.today_log, ...payload };

            // For checklist type, derive status from item completion
            if (h.type === 'checklist' && payload.checklist_logs) {
              updatedLog.status = deriveChecklistStatus(h, payload.checklist_logs);
            }

            return { ...h, today_log: updatedLog };
          }
          return h;
        });
      });
      return { previousHabits };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousHabits) queryClient.setQueryData(['habits'], context.previousHabits);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['habits'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (logId: number) => habitLogService.delete(logId),
    onMutate: async (logId) => {
      await queryClient.cancelQueries({ queryKey: ['habits'] });
      const previousHabits = queryClient.getQueryData(['habits']);

      queryClient.setQueryData(['habits'], (oldData: Habit[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(h => h.today_log?.id === logId ? { ...h, today_log: null } : h);
      });
      return { previousHabits };
    },
    onError: (_err, _logId, context) => {
      if (context?.previousHabits) queryClient.setQueryData(['habits'], context.previousHabits);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['habits'] }),
  });

  return {
    logHabit: logMutation.mutateAsync,
    updateLog: updateMutation.mutateAsync,
    deleteLog: deleteMutation.mutateAsync,
    isProcessing: logMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
  };
};