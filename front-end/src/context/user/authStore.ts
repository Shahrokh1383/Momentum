import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AuthState, User } from '@/types/user';

interface AuthStoreState extends AuthState {
  avatarVersion: number;
  bustAvatarCache: () => void;
}

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      pendingEmail: null,
      avatarVersion: Date.now(),

      setUser: (user: User | null) => {
        set({
          user,
          isAuthenticated: !!user,
        });
      },

      setPendingEmail: (email: string | null) => set({ pendingEmail: email }),

      bustAvatarCache: () => set({ avatarVersion: Date.now() }),

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          pendingEmail: null,
          avatarVersion: Date.now(),
        }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ pendingEmail: state.pendingEmail }), 
    }
  )
);