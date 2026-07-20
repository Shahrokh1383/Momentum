import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { subscriptionService } from '@/services/user/subscriptionService';
import { UpgradePayload, SubscriptionDetail, QuotasData } from '@/types/subscription';

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
    quotas,
    isLoadingQuotas,
    quotasError,
  };
};