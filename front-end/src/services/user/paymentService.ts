import api from '@/services/api';
import { VerifyPaymentResponse } from '@/types/payment';

export const paymentService = {
  verifyPayment: async (transactionId: string): Promise<VerifyPaymentResponse> => {
    const { data } = await api.get(`/api/user/payments/verify/${transactionId}`);
    return data.data;
  },
};