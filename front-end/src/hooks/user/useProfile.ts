import { useMutation, useQueryClient } from '@tanstack/react-query';
import { profileService, UpdateProfilePayload, UpdatePreferencesPayload } from '@/services/user/profileService';
import { useAuthStore } from '@/context/user/authStore';

export const useProfile = () => {
  const queryClient = useQueryClient();
  const { setUser } = useAuthStore();

  const updateProfileMutation = useMutation({
    mutationFn: (payload: UpdateProfilePayload) => profileService.updateProfile(payload),
    onSuccess: (user) => {
      setUser(user);
      queryClient.setQueryData(['currentUser'], user);
    },
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: (payload: UpdatePreferencesPayload) => profileService.updatePreferences(payload),
    onSuccess: (user) => {
      setUser(user);
      queryClient.setQueryData(['currentUser'], user);
    },
  });

  return {
    updateProfile: updateProfileMutation.mutateAsync,
    isUpdatingProfile: updateProfileMutation.isPending,
    profileError: updateProfileMutation.error,

    updatePreferences: updatePreferencesMutation.mutateAsync,
    isUpdatingPreferences: updatePreferencesMutation.isPending,
    preferencesError: updatePreferencesMutation.error,
  };
};