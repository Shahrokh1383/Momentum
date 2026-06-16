import api from '@/services/api';
import { 
  Plan, 
  SubscriptionDetail, 
  UpgradePayload,
  UpgradeResponse,
  QuotasData,
  VerifyPaymentResponse 
} from '@/types/subscription';

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

  /**
   * Initiates the upgrade. Backend will create a pending subscription,
   * call the gateway, and return the gateway_transaction_id.
   */
  upgrade: async (payload: UpgradePayload): Promise<UpgradeResponse> => {
    const { data } = await api.post('/api/user/subscription/upgrade', payload);
    return data.data;
  },

  /**
   * CRITICAL: Polls the backend to verify the actual status of the transaction 
   * with the payment gateway.
   */
  verifyPayment: async (transactionId: number): Promise<VerifyPaymentResponse> => {
    const { data } = await api.get(`/api/user/subscription/verify/${transactionId}`);
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