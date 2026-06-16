import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { authService } from '@/services/user/authService';
import { useAuthStore } from '@/context/user/authStore';
import { useNavigate } from 'react-router-dom';
import { VerifyEmailPayload, User } from '@/types/user';
import { SubscriptionDetail } from '@/types/subscription';

export const useAuth = () => {
  const {
    user: storedUser,
    isAuthenticated: storedIsAuthenticated,
    setUser,
    logout: clearStore,
  } = useAuthStore();

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const {
    data: fetchedUser,
    isLoading: isFetchingUser,
  } = useQuery<User | null>({
    queryKey: ['currentUser'],
    queryFn: authService.getMe,
    retry: false,
    // SMART POLLING: Automatically refetch user data every 5 seconds 
    // if there is a pending payment in the cache. Stops automatically when resolved.
    refetchInterval: () => {
      const sub = queryClient.getQueryData<SubscriptionDetail | null>(['currentSubscription']);
      return sub?.status === 'pending_payment' ? 5000 : false;
    },
  });

  // Sync React Query → Zustand for other components that might read from the store directly.
  useEffect(() => {
    if (fetchedUser) {
      setUser(fetchedUser);
    } else if (fetchedUser === null) {
      clearStore();
    }
  }, [fetchedUser, setUser, clearStore]);

  // ─── DERIVED STATE (Prevents Race Conditions) ───────────────────────────────
  const user = fetchedUser !== undefined ? fetchedUser : storedUser;
  const isAuthenticated = fetchedUser !== undefined ? !!fetchedUser : storedIsAuthenticated;
  
  // Compute derived plan properties on the fly (DRY & SRP)
  const activePlan = user?.active_plan || 'free';
  const isExpert = activePlan === 'expert' || activePlan === 'premium';
  const isPremium = activePlan === 'premium';
  // ────────────────────────────────────────────────────────────────────────────

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (user) => {
      setUser(user);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      navigate('/dashboard');
    }
  });

  const registerMutation = useMutation({
    mutationFn: authService.register,
    onSuccess: ({ email }) => {
      useAuthStore.getState().setPendingEmail(email);
      navigate('/verify-email');
    }
  });

  const logoutMutation = useMutation({
    mutationFn: authService.logout,
    onSettled: () => {
      clearStore();
      queryClient.cancelQueries();
      queryClient.removeQueries({ queryKey: ['currentUser'] });
      navigate('/login');
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: authService.forgotPassword,
  });

  const resetPasswordMutation = useMutation({
    mutationFn: authService.resetPassword,
    onSuccess: () => navigate('/login'),
  });

  const resendVerificationMutation = useMutation({
    mutationFn: authService.resendVerification,
  });

  const verifyEmailMutation = useMutation({
    mutationFn: (payload: VerifyEmailPayload) => authService.verifyEmail(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      navigate('/dashboard');
    },
  });

  const oauthCallbackMutation = useMutation({
    mutationFn: ({ provider, code, state }: { provider: string, code: string, state: string }) =>
      authService.handleOAuthCallback(provider, code, state),
    onSuccess: (user) => { setUser(user); navigate('/dashboard'); },
  });

  return {
    user,
    isAuthenticated,
    activePlan,
    isExpert,
    isPremium,
    isFetchingUser,

    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,

    registerUser: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    registerError: registerMutation.error,

    logout: logoutMutation.mutateAsync,

    forgotPassword: forgotPasswordMutation.mutateAsync,
    isForgotPasswordLoading: forgotPasswordMutation.isPending,

    resetPassword: resetPasswordMutation.mutateAsync,
    isResetPasswordLoading: resetPasswordMutation.isPending,

    verifyEmail: verifyEmailMutation.mutateAsync,
    isVerifyingEmail: verifyEmailMutation.isPending,
    verifyEmailError: verifyEmailMutation.error,

    resendVerification: resendVerificationMutation.mutateAsync,
    isResendingVerification: resendVerificationMutation.isPending,

    handleOAuthCallback: oauthCallbackMutation.mutateAsync,
  };
};