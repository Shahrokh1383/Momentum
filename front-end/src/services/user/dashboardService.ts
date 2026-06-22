import api from '@/services/api';
import { DashboardData } from '@/types/habit';

export const dashboardService = {
  getDashboard: async (): Promise<DashboardData> => {
    const { data } = await api.get('/api/user/dashboard');
    return data.data;
  },
};