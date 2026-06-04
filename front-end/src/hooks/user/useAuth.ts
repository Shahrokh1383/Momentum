import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/user/authService';
import { useAuthStore } from '@/context/user/authStore';
import { useNavigate } from 'react-router-dom';

export const useAuth = () => {
  const { user, isAuthenticated, isPremium, setUser, logout: clearStore } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch current user on app boot
  const { isLoading: isFetchingUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const user = await authService.getMe();
      setUser(user);
      return user;
    },
    retry: false,
    enabled: !user && isAuthenticated === false, 
  });

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (user) => {
      setUser(user);
      navigate('/dashboard');
    },
  });

  const registerMutation = useMutation({
    mutationFn: authService.register,
    onSuccess: (user) => {
      setUser(user);
      navigate('/verify-email');
    },
  });

  const logoutMutation = useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
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

  const oauthCallbackMutation = useMutation({
    mutationFn: ({ provider, code }: { provider: string; code: string }) => 
      authService.handleOAuthCallback(provider, code),
    onSuccess: (user) => {
      setUser(user);
      navigate('/dashboard');
    },
  });

  const devVerifyEmailMutation = useMutation({
    mutationFn: async () => {
      if (!user?.email) throw new Error("User email not found");
      // 1. Fetch the latest token for the authenticated user
      const token = await authService.getLatestVerificationToken(user.email);
      // 2. Verify the email using the fetched token
      return authService.verifyEmail(token);
    },
    onSuccess: () => {
      // Refetch the current user to update `email_verified_at` in the global state
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      navigate('/dashboard');
    },
  });

  return {
    user,
    isAuthenticated,
    isPremium,
    isFetchingUser,
    
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    
    // Fixed: Renamed to registerUser to match component usage and avoid naming conflicts
    registerUser: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    registerError: registerMutation.error,

    logout: logoutMutation.mutateAsync,
    
    forgotPassword: forgotPasswordMutation.mutateAsync,
    isForgotPasswordLoading: forgotPasswordMutation.isPending,
    
    resetPassword: resetPasswordMutation.mutateAsync,
    isResetPasswordLoading: resetPasswordMutation.isPending,
    
    handleOAuthCallback: oauthCallbackMutation.mutateAsync,

    // Fixed: Added missing resendVerification mutation
    resendVerification: resendVerificationMutation.mutateAsync,
    isResendingVerification: resendVerificationMutation.isPending,
    devVerifyEmail: devVerifyEmailMutation.mutateAsync,
    isDevVerifying: devVerifyEmailMutation.isPending,
    devVerifyError: devVerifyEmailMutation.error,
  };
};