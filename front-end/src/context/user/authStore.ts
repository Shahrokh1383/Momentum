import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AuthState, User } from '@/types/user';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      activePlan: 'free',
      isExpert: false,
      isPremium: false,
      hasInitiallyLoaded: false,
      pendingEmail: null,

      setUser: (user: User | null) => {
        const activePlan = user?.active_plan || 'free';
        set({
          user,
          isAuthenticated: !!user,
          activePlan,
          isExpert: activePlan === 'expert' || activePlan === 'premium',
          isPremium: activePlan === 'premium',
          hasInitiallyLoaded: true,
        });
      },

      setPendingEmail: (email: string | null) => set({ pendingEmail: email }),

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          activePlan: 'free',
          isExpert: false,
          isPremium: false,
          hasInitiallyLoaded: true,
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