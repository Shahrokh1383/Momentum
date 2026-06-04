export interface User {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  role: 'user' | 'admin';
  email_verified_at: string | null;
  profile_visibility: 'public' | 'friends_only' | 'private';
  is_premium: boolean;
  subscription: Subscription | null;
  created_at: string;
}

export interface Subscription {
  plan: 'free' | 'premium' | 'lifetime';
  status: 'active' | 'cancelled' | 'expired';
  expires_at: string | null;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isPremium: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}