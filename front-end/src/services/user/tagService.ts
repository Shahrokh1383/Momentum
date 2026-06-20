import api from '@/services/api';
import { Tag } from '@/types/tag';

export const tagService = {
  getAll: async (): Promise<Tag[]> => {
    const { data } = await api.get('/api/user/tags');
    return data.data;
  },

  autocomplete: async (query: string): Promise<Tag[]> => {
    if (!query.trim()) return [];
    const { data } = await api.get(`/api/user/tags/autocomplete?q=${encodeURIComponent(query)}`);
    return data.data;
  },
};