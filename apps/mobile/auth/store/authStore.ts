import { create } from 'zustand';
import { User } from '../../stores/userStore';

export type AuthMode = 'guest' | 'demo' | 'real';

interface AuthState {
  user: User | null;          // SSOT for Identity (UUID is user.id)
  isAuthenticated: boolean;
  isLoading: boolean;
  authMode: AuthMode;
  
  // Actions
  setAuthSession: (user: User, mode?: AuthMode) => void;
  clearSession: () => void;
  hasRole: (role: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  authMode: 'guest',

  setAuthSession: (user, mode = 'real') => {
    set({ user, isAuthenticated: true, isLoading: false, authMode: mode });
  },

  clearSession: () => {
    set({ user: null, isAuthenticated: false, isLoading: false, authMode: 'guest' });
  },

  hasRole: (role) => {
    const { user } = get();
    if (!user || !user.roles) return false;
    return user.roles.includes(role) || user.roles.includes('super_admin');
  }
}));
