import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AuthState, User } from '@/types/user';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      pendingEmail: null,

      setUser: (user: User | null) => {
        set({
          user,
          isAuthenticated: !!user,
        });
      },

      setPendingEmail: (email: string | null) => set({ pendingEmail: email }),

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          pendingEmail: null,
        }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage),
      // Only persist pendingEmail. Do not persist user to avoid stale auth states.
      partialize: (state) => ({ pendingEmail: state.pendingEmail }), 
    }
  )
);