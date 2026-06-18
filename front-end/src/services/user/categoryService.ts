import api from '@/services/api';
import { Category, CategoryPayload } from '@/types/category';

export const categoryService = {
  getAll: async (): Promise<Category[]> => {
    const { data } = await api.get('/api/user/categories');
    return data.data;
  },

  create: async (payload: CategoryPayload): Promise<Category> => {
    const { data } = await api.post('/api/user/categories', payload);
    return data.data;
  },

  update: async (id: number, payload: Partial<CategoryPayload>): Promise<Category> => {
    const { data } = await api.put(`/api/user/categories/${id}`, payload);
    return data.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/user/categories/${id}`);
  },
};