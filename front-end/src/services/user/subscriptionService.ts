import api from '@/services/api';
import { Plan, SubscriptionDetail, PaymentInfo, UpgradePayload, QuotasData } from '@/types/subscription';

export const subscriptionService = {
  getPlans: async (): Promise<Plan[]> => {
    const { data } = await api.get('/api/user/plans');
    return data.data;
  },

  getCurrent: async (): Promise<SubscriptionDetail | null> => {
    try {
      const { data } = await api.get('/api/user/subscription');
      return data.data;
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.status === 401) {
        return null;
      }
      throw error;
    }
  },

  upgrade: async (payload: UpgradePayload): Promise<{ subscription: SubscriptionDetail; payment: PaymentInfo }> => {
    const { data } = await api.post('/api/user/subscription/upgrade', payload);
    return data.data;
  },

  cancel: async (): Promise<SubscriptionDetail> => {
    const { data } = await api.delete('/api/user/subscription');
    return data.data;
  },

  getQuotas: async (): Promise<QuotasData> => {
    const { data } = await api.get('/api/user/subscription/quotas');
    return data.data;
  },
};