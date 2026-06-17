import api from '@/services/api';
import { User } from '@/types/user';

export interface UpdateProfilePayload {
  name?: string;
  bio?: string;
  profile_visibility?: 'public' | 'friends_only' | 'private';
}

export interface UpdatePreferencesPayload {
  timezone?: string;
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  date_format?: string;
}

export const profileService = {
  updateProfile: async (payload: UpdateProfilePayload): Promise<User> => {
    const { data } = await api.put('/api/user/profile', payload);
    return data.data;
  },

  updatePreferences: async (payload: UpdatePreferencesPayload): Promise<User> => {
    const { data } = await api.put('/api/user/profile/preferences', payload);
    return data.data;
  },
};