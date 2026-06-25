import api from '@/services/api';
import {
  User,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
  VerifyEmailPayload,
} from '@/types/user';

export const authService = {
  login: async (payload: LoginPayload): Promise<User> => {
    const { data } = await api.post('/api/auth/login', payload);
    return data.data;
  },
  register: async (payload: RegisterPayload): Promise<{ email: string }> => {
    const { data } = await api.post('/api/auth/register', payload);
    return { email: data.data.email };
  },
  logout: async (): Promise<void> => {
    try {
      await api.post('/api/user/logout');
    } catch (error) {
      console.error('Logout API failed, forcing local logout:', error);
    }
  },
  getMe: async (): Promise<User | null> => {
    try {
      const { data } = await api.get('/api/user/me');
      return data.data;
    } catch (error: any) {
      if (error.response?.status === 401) return null;
      throw error;
    }
  },
  forgotPassword: async (email: string): Promise<void> => {
    await api.post('/api/auth/forgot-password', { email });
  },
  resetPassword: async (payload: ResetPasswordPayload): Promise<void> => {
    await api.post('/api/auth/reset-password', payload);
  },
  verifyEmail: async (payload: VerifyEmailPayload): Promise<void> => {
    await api.post('/api/auth/verify-email', payload);
  },
  resendVerification: async (email: string): Promise<void> => {
    await api.post('/api/auth/verify-email/resend', { email });
  },
  getOAuthRedirect: async (provider: string): Promise<{ url: string, state: string }> => {
    const { data } = await api.get(`/api/auth/oauth/${provider}`);
    return data.data;
  },
  handleOAuthCallback: async (provider: string, code: string, state: string): Promise<User> => {
    const { data } = await api.post(`/api/auth/oauth/${provider}/callback`, { code, state });
    return data.data;
  },
};