import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { categoryService } from '@/services/user/categoryService';
import { CategoryPayload } from '@/types/category';

export const useCategories = () => {
  const queryClient = useQueryClient();

  // Helper to invalidate both active and trashed lists (DRY)
  const invalidateCategoryCaches = () => {
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    queryClient.invalidateQueries({ queryKey: ['trashedCategories'] });
    queryClient.invalidateQueries({ queryKey: ['quotas'] });
  };

  // Removed unused `error` export (Dead Code elimination)
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryService.getAll,
  });

  const { data: trashedCategories = [], isLoading: isTrashedLoading } = useQuery({
    queryKey: ['trashedCategories'],
    queryFn: categoryService.getTrashed,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CategoryPayload) => categoryService.create(payload),
    onSuccess: invalidateCategoryCaches,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CategoryPayload> }) => 
      categoryService.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => categoryService.delete(id),
    onSuccess: invalidateCategoryCaches,
  });

  const restoreMutation = useMutation({
    mutationFn: (id: number) => categoryService.restore(id),
    onSuccess: invalidateCategoryCaches,
  });

  const forceDeleteMutation = useMutation({
    mutationFn: (id: number) => categoryService.forceDelete(id),
    onSuccess: invalidateCategoryCaches,
  });

  return {
    categories,
    isLoading,
    trashedCategories,
    isTrashedLoading,
    
    createCategory: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error,
    
    updateCategory: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,
    
    deleteCategory: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error,

    restoreCategory: restoreMutation.mutateAsync,
    isRestoring: restoreMutation.isPending,
    restoreError: restoreMutation.error,

    forceDeleteCategory: forceDeleteMutation.mutateAsync,
    isForceDeleting: forceDeleteMutation.isPending,
    forceDeleteError: forceDeleteMutation.error,
  };
};