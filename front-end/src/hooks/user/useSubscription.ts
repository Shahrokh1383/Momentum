import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { subscriptionService } from '@/services/user/subscriptionService';
import { UpgradePayload } from '@/types/subscription';

export const useSubscription = () => {
  const queryClient = useQueryClient();

  const { data: plans, isLoading: isLoadingPlans, error: plansError } = useQuery({
    queryKey: ['plans'],
    queryFn: subscriptionService.getPlans,
    staleTime: 1000 * 60 * 5,
  });

  const { data: currentSubscription, isLoading: isLoadingSubscription, error: subscriptionError } = useQuery({
    queryKey: ['currentSubscription'],
    queryFn: subscriptionService.getCurrent,
    retry: false,
  });

  const upgradeMutation = useMutation({
    mutationFn: (payload: UpgradePayload) => subscriptionService.upgrade(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentSubscription'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: subscriptionService.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentSubscription'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });

  return {
    plans,
    isLoadingPlans,
    plansError,
    
    currentSubscription,
    isLoadingSubscription,
    subscriptionError,
    
    upgrade: upgradeMutation.mutateAsync,
    isUpgrading: upgradeMutation.isPending,
    upgradeError: upgradeMutation.error,
    
    cancel: cancelMutation.mutateAsync,
    isCancelling: cancelMutation.isPending,
    cancelError: cancelMutation.error,
  };
};