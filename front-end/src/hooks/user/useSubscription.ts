import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { subscriptionService } from '@/services/user/subscriptionService';
import { UpgradePayload, SubscriptionDetail } from '@/types/subscription';
import { QuotasData } from '@/types/subscription';

export const useSubscription = () => {
  const queryClient = useQueryClient();

  const { data: plans, isLoading: isLoadingPlans, error: plansError } = useQuery({
    queryKey: ['plans'],
    queryFn: subscriptionService.getPlans,
    staleTime: 1000 * 60 * 5,
  });

  const { data: currentSubscription, isLoading: isLoadingSubscription, error: subscriptionError } = useQuery<SubscriptionDetail | null>({
    queryKey: ['currentSubscription'],
    queryFn: subscriptionService.getCurrent,
    retry: false,
    // SMART POLLING: Only poll if status is 'pending_payment' AND the user has 
    // actually been to the gateway (gateway_transaction_id is not null)
    refetchInterval: (query) => {
      const sub = query.state.data;
      const hasGatewayId = sub?.latest_payment?.gateway_transaction_id;
      return sub?.status === 'pending_payment' && hasGatewayId ? 5000 : false;
    },
  });

  const { data: quotas, isLoading: isLoadingQuotas, error: quotasError } = useQuery<QuotasData>({
    queryKey: ['quotas'],
    queryFn: subscriptionService.getQuotas,
    staleTime: 1000 * 60 * 5,
  });

  const upgradeMutation = useMutation({
    mutationFn: (payload: UpgradePayload) => subscriptionService.upgrade(payload),
    onSuccess: () => {
      // Invalidate immediately so the UI updates with the 'pending_payment' state
      // and waits for the user to come back from the bank
      queryClient.invalidateQueries({ queryKey: ['currentSubscription'] });
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