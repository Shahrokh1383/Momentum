import { create } from 'zustand';
import { AuthState, User } from '@/types/user';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isPremium: false,
  
  setUser: (user: User | null) => 
    set({ 
      user, 
      isAuthenticated: !!user, 
      isPremium: user?.is_premium || false 
    }),
    
  logout: () => 
    set({ 
      user: null, 
      isAuthenticated: false, 
      isPremium: false 
    }),
}));