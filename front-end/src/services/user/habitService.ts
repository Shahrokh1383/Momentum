import api from '@/services/api';
import { Habit, HabitPayload } from '@/types/habit';

export const habitService = {
  getActive: async (): Promise<Habit[]> => {
    const { data } = await api.get('/api/user/habits');
    return data.data;
  },

  getArchived: async (): Promise<Habit[]> => {
    const { data } = await api.get('/api/user/habits/archived');
    return data.data;
  },

  create: async (payload: HabitPayload): Promise<Habit> => {
    const { data } = await api.post('/api/user/habits', payload);
    return data.data;
  },

  update: async (id: number, payload: Partial<HabitPayload>): Promise<Habit> => {
    const { data } = await api.put(`/api/user/habits/${id}`, payload);
    return data.data;
  },

  archive: async (id: number): Promise<Habit> => {
    const { data } = await api.post(`/api/user/habits/${id}/archive`);
    return data.data;
  },

  restore: async (id: number): Promise<Habit> => {
    const { data } = await api.post(`/api/user/habits/${id}/restore`);
    return data.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/user/habits/${id}`);
  },
};