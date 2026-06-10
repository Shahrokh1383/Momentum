import { create } from 'zustand';
import { AuthState, User } from '@/types/user';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  activePlan: 'free',
  isExpert: false,
  isPremium: false,
  hasInitiallyLoaded: false,
  
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
    
  logout: () => 
    set({ 
      user: null, 
      isAuthenticated: false, 
      activePlan: 'free',
      isExpert: false,
      isPremium: false,
      hasInitiallyLoaded: true,
    }),
}));