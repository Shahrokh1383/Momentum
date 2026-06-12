import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { authService } from '@/services/user/authService';
import { useAuthStore } from '@/context/user/authStore';
import { useNavigate } from 'react-router-dom';
import { VerifyEmailPayload, User } from '@/types/user';

export const useAuth = () => {
  const {
    user,
    isAuthenticated,
    activePlan,
    isExpert,
    isPremium,
    hasInitiallyLoaded,
    setUser,
    logout: clearStore,
  } = useAuthStore();

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // ─── currentUser query ──────────────────────────────────────
  const {
    data: fetchedUser,
    isLoading: isFetchingUser,
    isError,
  } = useQuery<User | null>({
    queryKey: ['currentUser'],
    queryFn: authService.getMe,
    retry: false,
  });

  // ─── Sync React Query → Zustand ─────────────────────────────
  useEffect(() => {
    if (fetchedUser) {
      setUser(fetchedUser);
    } else if (isError) {
      clearStore();
    }
  }, [fetchedUser, isError, setUser, clearStore]);

  // ─── Mutations ──────────────────────────────────────────────
  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (user) => { setUser(user); navigate('/dashboard'); },
  });

  const registerMutation = useMutation({
    mutationFn: authService.register,
    onSuccess: (user) => { setUser(user); navigate('/verify-email'); },
  });

  const logoutMutation = useMutation({
    mutationFn: authService.logout,
    onSettled: () => {
      clearStore();
      queryClient.clear();
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
    mutationFn: ({ provider, code }: { provider: string; code: string }) =>
      authService.handleOAuthCallback(provider, code),
    onSuccess: (user) => { setUser(user); navigate('/dashboard'); },
  });

  return {
    user,
    isAuthenticated,
    activePlan,
    isExpert,
    isPremium,
    
    // Show loading spinner only while resolving and not initially loaded
    isFetchingUser: isFetchingUser && !hasInitiallyLoaded,

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