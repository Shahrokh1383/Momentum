import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { habitService } from '@/services/user/habitService';
import { HabitPayload } from '@/types/habit';

export const useHabits = () => {
  const queryClient = useQueryClient();

  const invalidateHabitCaches = () => {
    queryClient.invalidateQueries({ queryKey: ['habits'] });
    queryClient.invalidateQueries({ queryKey: ['archivedHabits'] });
    queryClient.invalidateQueries({ queryKey: ['quotas'] });
    queryClient.invalidateQueries({ queryKey: ['tags'] });
  };

  const { data: activeHabits = [], isLoading: isActiveLoading } = useQuery({
    queryKey: ['habits'],
    queryFn: habitService.getActive,
  });

  const { data: archivedHabits = [], isLoading: isArchivedLoading } = useQuery({
    queryKey: ['archivedHabits'],
    queryFn: habitService.getArchived,
  });

  const createMutation = useMutation({
    mutationFn: (payload: HabitPayload) => habitService.create(payload),
    onSuccess: invalidateHabitCaches,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<HabitPayload> }) => 
      habitService.update(id, payload),
    onSuccess: invalidateHabitCaches,
  });

  const archiveMutation = useMutation({
    mutationFn: (id: number) => habitService.archive(id),
    onSuccess: invalidateHabitCaches,
  });

  const restoreMutation = useMutation({
    mutationFn: (id: number) => habitService.restore(id),
    onSuccess: invalidateHabitCaches,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => habitService.delete(id),
    onSuccess: invalidateHabitCaches,
  });

  return {
    activeHabits,
    isActiveLoading,
    archivedHabits,
    isArchivedLoading,
    
    createHabit: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error,
    
    updateHabit: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,
    
    archiveHabit: archiveMutation.mutateAsync,
    isArchiving: archiveMutation.isPending,
    archiveError: archiveMutation.error,
    
    restoreHabit: restoreMutation.mutateAsync,
    isRestoring: restoreMutation.isPending,
    restoreError: restoreMutation.error,
    
    deleteHabit: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error,
  };
};