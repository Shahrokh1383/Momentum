import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { subscriptionService } from '@/services/user/subscriptionService';
import { UpgradePayload } from '@/types/subscription';

export const useSubscription = () => {
  const queryClient = useQueryClient();

  const { data: plans, isLoading: isLoadingPlans, error: plansError } = useQuery({
    queryKey: ['plans'],
    queryFn: subscriptionService.getPlans,
    staleTime: 1000 * 60 * 5, // 5 minutes
    // Pro-tip: If plans also causes 'undefined' type issues downstream, 
    // you can add initialData: [] here as well.
  });

  const { data: currentSubscription, isLoading: isLoadingSubscription, error: subscriptionError } = useQuery({
    queryKey: ['currentSubscription'],
    queryFn: subscriptionService.getCurrent,
    retry: false,
    initialData: null,
  });

  const upgradeMutation = useMutation({
    mutationFn: (payload: UpgradePayload) => subscriptionService.upgrade(payload),
    onSuccess: () => {
      // We don't invalidate currentSubscription here immediately because 
      // the payment is still PENDING. It will be invalidated when verification succeeds.
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

    verifyPayment: subscriptionService.verifyPayment,
  };
};