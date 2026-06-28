import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/user/authService';
import { useAuthStore } from '@/context/authStore';
import { VerifyEmailPayload } from '@/types/user';

export const useLogin = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const mutation = useMutation({
    mutationFn: authService.login,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      navigate('/dashboard');
    }
  });
  return { login: mutation.mutateAsync, isLoggingIn: mutation.isPending, loginError: mutation.error };
};

export const useRegister = () => {
  const navigate = useNavigate();
  const mutation = useMutation({
    mutationFn: authService.register,
    onSuccess: ({ email }) => {
      useAuthStore.getState().setPendingEmail(email);
      navigate('/verify-email');
    }
  });
  return { registerUser: mutation.mutateAsync, isRegistering: mutation.isPending, registerError: mutation.error };
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const mutation = useMutation({
    mutationFn: authService.logout,
    onSettled: () => {
      queryClient.cancelQueries();
      queryClient.removeQueries({ queryKey: ['currentUser'] });
      navigate('/login');
    },
  });
  return { logout: mutation.mutateAsync };
};

export const useForgotPassword = () => {
  const mutation = useMutation({ mutationFn: authService.forgotPassword });
  return { forgotPassword: mutation.mutateAsync, isForgotPasswordLoading: mutation.isPending };
};

export const useResetPassword = () => {
  const navigate = useNavigate();
  const mutation = useMutation({
    mutationFn: authService.resetPassword,
    onSuccess: () => navigate('/login'),
  });
  return { resetPassword: mutation.mutateAsync, isResetPasswordLoading: mutation.isPending };
};

export const useVerifyEmail = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const mutation = useMutation({
    mutationFn: (payload: VerifyEmailPayload) => authService.verifyEmail(payload),
    onSuccess: (user) => {
      queryClient.setQueryData(['currentUser'], user);
      navigate('/dashboard');
    },
  });
  return { verifyEmail: mutation.mutateAsync, isVerifyingEmail: mutation.isPending, verifyEmailError: mutation.error };
};

export const useResendVerification = () => {
  const mutation = useMutation({ mutationFn: authService.resendVerification });
  return { resendVerification: mutation.mutateAsync, isResendingVerification: mutation.isPending };
};

export const useOAuthCallback = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const mutation = useMutation({
    mutationFn: ({ provider, code, state }: { provider: string, code: string, state: string }) =>
      authService.handleOAuthCallback(provider, code, state),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      navigate('/dashboard'); 
    },
  });
  return { handleOAuthCallback: mutation.mutateAsync };
};