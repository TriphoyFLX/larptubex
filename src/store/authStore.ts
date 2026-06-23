import { create } from 'zustand';
import api from '../api/index.ts';
import { User } from '../types.ts';

interface AuthState {
  user: User | null;
  initializing: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  
  // Custom JWT Actions
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { email: string; password?: string; displayName: string; avatar?: string; bio?: string }) => Promise<void>;
  
  // Universal actions
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  updateProfile: (payload: Partial<Pick<User, 'displayName' | 'handle' | 'avatar' | 'banner' | 'bio'>>) => Promise<User>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  initializing: true,
  accessToken: null,
  refreshToken: null,

  setUser: (user) => set({ user }),

  updateProfile: async (payload) => {
    const response = await api.put('/api/user/profile', payload);
    const updated = response.data as User;
    localStorage.setItem('larptubex_user_payload', JSON.stringify(updated));
    set({ user: updated });
    return updated;
  },

  login: async (email, password) => {
    try {
      const response = await api.post('/api/auth/login', { email, password });
      const { user, accessToken, refreshToken } = response.data;

      localStorage.setItem('larptubex_access_token', accessToken);
      localStorage.setItem('larptubex_refresh_token', refreshToken);
      localStorage.setItem('larptubex_user_payload', JSON.stringify(user));

      set({ user, accessToken, refreshToken });
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Неверные авторизационные данные');
    }
  },

  register: async (payload) => {
    try {
      const response = await api.post('/api/auth/register', payload);
      const { user, accessToken, refreshToken } = response.data;

      localStorage.setItem('larptubex_access_token', accessToken);
      localStorage.setItem('larptubex_refresh_token', refreshToken);
      localStorage.setItem('larptubex_user_payload', JSON.stringify(user));

      set({ user, accessToken, refreshToken });
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Ошибка при регистрации');
    }
  },

  logout: async () => {
    localStorage.removeItem('larptubex_access_token');
    localStorage.removeItem('larptubex_refresh_token');
    localStorage.removeItem('larptubex_user_payload');

    set({ user: null, accessToken: null, refreshToken: null });
  },

  initialize: async () => {
    set({ initializing: true });

    const savedToken = localStorage.getItem('larptubex_access_token');
    const savedUser = localStorage.getItem('larptubex_user_payload');

    if (savedToken && savedUser) {
      try {
        set({
          accessToken: savedToken,
          refreshToken: localStorage.getItem('larptubex_refresh_token'),
          user: JSON.parse(savedUser),
        });

        try {
          const res = await api.get('/api/user/profile');
          set({ user: res.data.user });
          localStorage.setItem('larptubex_user_payload', JSON.stringify(res.data.user));
        } catch {
          get().logout();
        }
      } catch {
        get().logout();
      }
    } else {
      set({ user: null });
    }

    set({ initializing: false });
  }
}));
