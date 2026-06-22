import { useMutation, useQueryClient } from '@tanstack/react-query';
import { streakService } from '@/services/user/streakService';
import { StreakFreezePayload } from '@/types/habit';
import { QuotasData } from '@/types/subscription';

export const useStreakFreezes = () => {
  const queryClient = useQueryClient();

  const freezeMutation = useMutation({
    mutationFn: ({ habitId, payload }: { habitId: number; payload: StreakFreezePayload }) => 
      streakService.applyFreeze(habitId, payload),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['quotas'] });
      const previousQuotas = queryClient.getQueryData<QuotasData>(['quotas']);

      // Optimistically increment freeze usage
      if (previousQuotas && !previousQuotas.freezes.unlimited) {
        queryClient.setQueryData<QuotasData>(['quotas'], {
          ...previousQuotas,
          freezes: {
            ...previousQuotas.freezes,
            used: previousQuotas.freezes.used + 1,
          },
        });
      }
      return { previousQuotas };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousQuotas) {
        queryClient.setQueryData(['quotas'], context.previousQuotas);
      }
    },
    onSettled: () => {
      // Sync real data: Quotas, Habits (for streak recalculation), and Dashboard
      queryClient.invalidateQueries({ queryKey: ['quotas'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  return {
    applyFreeze: freezeMutation.mutateAsync,
    isFreezing: freezeMutation.isPending,
    freezeError: freezeMutation.error,
  };
};