import api from '@/services/api';
import { User, LoginPayload, RegisterPayload, ResetPasswordPayload } from '@/types/user';

export const authService = {
  login: async (payload: LoginPayload): Promise<User> => {
    // SRP: Fetch CSRF explicitly before the authentication attempt
    await api.get('/sanctum/csrf-cookie');
    
    const { data } = await api.post('/api/auth/login', payload);
    return data.data;
  },

  register: async (payload: RegisterPayload): Promise<User> => {
    // Also needed for registration if your endpoint is protected by CSRF
    await api.get('/sanctum/csrf-cookie');
    
    const { data } = await api.post('/api/auth/register', payload);
    return data.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/api/user/logout');
  },

  getMe: async (): Promise<User | null> => {
    try {
      const { data } = await api.get('/api/user/me');
      return data.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        // Not authenticated → treat as “no user”
        return null;
      }
      throw error; // re-throw other errors
    }
  },

  forgotPassword: async (email: string): Promise<void> => {
    await api.post('/api/auth/forgot-password', { email });
  },

  resetPassword: async (payload: ResetPasswordPayload): Promise<void> => {
    await api.post('/api/auth/reset-password', payload);
  },

  verifyEmail: async (token: string): Promise<void> => {
    await api.get(`/api/auth/verify-email/${token}`);
  },

  resendVerification: async (email: string): Promise<void> => {
    await api.post('/api/auth/verify-email/resend', { email });
  },

  getOAuthRedirect: async (provider: string): Promise<string> => {
    const { data } = await api.get(`/api/auth/oauth/${provider}`);
    return data.data.url;
  },

  handleOAuthCallback: async (provider: string, code: string): Promise<User> => {
    const { data } = await api.post(`/api/auth/oauth/${provider}/callback`, { code });
    return data.data;
  },
};