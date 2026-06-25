import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/user/authService';
import { User } from '@/types/user';
import { SubscriptionDetail } from '@/types/subscription';

export const useCurrentUser = () => {
  const queryClient = useQueryClient();

  const { data: user, isLoading: isFetchingUser } = useQuery<User | null>({
    queryKey: ['currentUser'],
    queryFn: authService.getMe,
    retry: false,
    refetchInterval: () => {
      const sub = queryClient.getQueryData<SubscriptionDetail | null>(['currentSubscription']);
      return sub?.status === 'pending_payment' ? 5000 : false;
    },
  });

  const isAuthenticated = !!user;
  const activePlan = user?.active_plan || 'free';
  const isExpert = activePlan === 'expert' || activePlan === 'premium';
  const isPremium = activePlan === 'premium';

  return { user, isAuthenticated, isFetchingUser, activePlan, isExpert, isPremium };
};