import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { subscriptionService } from '@/services/user/subscriptionService';
import { UpgradePayload, SubscriptionDetail } from '@/types/subscription';
import { QuotasData } from '@/types/subscription';

export const useSubscription = () => {
  const queryClient = useQueryClient();

  const { data: plans, isLoading: isLoadingPlans, error: plansError } = useQuery({
    queryKey: ['plans'],
    queryFn: subscriptionService.getPlans,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { data: currentSubscription, isLoading: isLoadingSubscription, error: subscriptionError } = useQuery<SubscriptionDetail | null>({
    queryKey: ['currentSubscription'],
    queryFn: subscriptionService.getCurrent,
    retry: false,
    // SMART POLLING: Automatically refetch subscription every 5 seconds 
    // if the status is 'pending_payment'. Stops automatically when resolved.
    refetchInterval: (query) => {
      const sub = query.state.data;
      return sub?.status === 'pending_payment' ? 5000 : false;
    },
  });

  const { data: quotas, isLoading: isLoadingQuotas, error: quotasError } = useQuery<QuotasData>({
    queryKey: ['quotas'],
    queryFn: subscriptionService.getQuotas,
    staleTime: 1000 * 60 * 5, // 5 minutes
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

    quotas,
    isLoadingQuotas,
    quotasError,
  };
};