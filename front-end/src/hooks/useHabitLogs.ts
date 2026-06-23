import { useMutation, useQueryClient } from '@tanstack/react-query';
import { habitLogService } from '@/services/user/habitLogService';
import { Habit, HabitLog, HabitLogPayload } from '@/types/habit';

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
            const optimisticLog: HabitLog = {
              id: Math.random(), // Temporary UI ID
              habit_id: habitId,
              logged_date: payload.logged_date,
              status: payload.status || 'completed',
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
            return {
              ...h,
              today_log: { ...h.today_log, ...payload }
            };
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