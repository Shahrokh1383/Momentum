import { useMutation, useQueryClient } from '@tanstack/react-query';
import { habitLogService } from '@/services/user/habitLogService';
import { Habit, HabitLogPayload } from '@/types/habit';
import { buildOptimisticLog, mergePayloadIntoLog } from '@/utils/habit/habitLogOptimistic';

export const useHabitLogs = () => {
  const queryClient = useQueryClient();

  const logMutation = useMutation({
    mutationFn: ({ habitId, payload }: { habitId: number; payload: HabitLogPayload }) =>
      habitLogService.log(habitId, payload),
    onMutate: async ({ habitId, payload }) => {
      await queryClient.cancelQueries({ queryKey: ['habits'] });
      const previousHabits = queryClient.getQueryData<Habit[]>(['habits']);

      queryClient.setQueryData<Habit[]>(['habits'], (oldData) => {
        if (!oldData) return oldData;
        return oldData.map(h => {
          if (h.id === habitId) {
            // Explicitly type as Habit to satisfy React Query Updater constraints
            const updatedHabit: Habit = {
              ...h,
              today_log: buildOptimisticLog(habitId, h, payload),
            };
            return updatedHabit;
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
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ logId, payload }: { logId: number; payload: Partial<HabitLogPayload> }) =>
      habitLogService.update(logId, payload),
    onMutate: async ({ logId, payload }) => {
      await queryClient.cancelQueries({ queryKey: ['habits'] });
      const previousHabits = queryClient.getQueryData<Habit[]>(['habits']);

      queryClient.setQueryData<Habit[]>(['habits'], (oldData) => {
        if (!oldData) return oldData;
        return oldData.map(h => {
          if (h.today_log?.id === logId) {
            const updatedHabit: Habit = {
              ...h,
              today_log: mergePayloadIntoLog(h, h.today_log, payload),
            };
            return updatedHabit;
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
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (logId: number) => habitLogService.delete(logId),
    onMutate: async (logId) => {
      await queryClient.cancelQueries({ queryKey: ['habits'] });
      const previousHabits = queryClient.getQueryData<Habit[]>(['habits']);

      queryClient.setQueryData<Habit[]>(['habits'], (oldData) => {
        if (!oldData) return oldData;
        return oldData.map(h => {
          if (h.today_log?.id === logId) {
            const updatedHabit: Habit = { ...h, today_log: null };
            return updatedHabit;
          }
          return h;
        });
      });
      return { previousHabits };
    },
    onError: (_err, _logId, context) => {
      if (context?.previousHabits) queryClient.setQueryData(['habits'], context.previousHabits);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });

  return {
    logHabit: logMutation.mutateAsync,
    updateLog: updateMutation.mutateAsync,
    deleteLog: deleteMutation.mutateAsync,
    isProcessing: logMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
  };
};