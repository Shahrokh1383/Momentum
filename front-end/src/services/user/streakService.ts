import api from '@/services/api';
import { Streak, StreakFreezePayload } from '@/types/habit';

export const streakService = {
  applyFreeze: async (habitId: number, payload: StreakFreezePayload): Promise<Streak> => {
    const { data } = await api.post(`/api/user/habits/${habitId}/freezes`, payload);
    return data.data;
  },
};