import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthStoreState {
  pendingEmail: string | null;
  avatarVersion: number;
  setPendingEmail: (email: string | null) => void;
  bustAvatarCache: () => void;
}

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set) => ({
      pendingEmail: null,
      avatarVersion: Date.now(),
      setPendingEmail: (email: string | null) => set({ pendingEmail: email }),
      bustAvatarCache: () => set({ avatarVersion: Date.now() }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ pendingEmail: state.pendingEmail }), 
    }
  )
);