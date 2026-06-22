import api from '@/services/api';
import { HabitLog, HabitLogPayload } from '@/types/habit';

export const habitLogService = {
  log: async (habitId: number, payload: HabitLogPayload): Promise<HabitLog> => {
    const { data } = await api.post(`/api/user/habits/${habitId}/logs`, payload);
    return data.data;
  },

  update: async (logId: number, payload: Partial<HabitLogPayload>): Promise<HabitLog> => {
    const { data } = await api.put(`/api/user/habit-logs/${logId}`, payload);
    return data.data;
  },

  delete: async (logId: number): Promise<void> => {
    await api.delete(`/api/user/habit-logs/${logId}`);
  },
};