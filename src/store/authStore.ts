import { create } from 'zustand';
import api from '../api/index.ts';
import { User } from '../types.ts';

interface AuthState {
  user: User | null;
  loading: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  
  // Custom JWT Actions
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { email: string; password?: string; displayName: string; avatar?: string; bio?: string }) => Promise<void>;
  
  // Universal actions
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  accessToken: null,
  refreshToken: null,

  setUser: (user) => set({ user }),

  login: async (email, password) => {
    set({ loading: true });
    try {
      const response = await api.post('/api/auth/login', { email, password });
      const { user, accessToken, refreshToken } = response.data;
      
      localStorage.setItem('larptubex_access_token', accessToken);
      localStorage.setItem('larptubex_refresh_token', refreshToken);
      localStorage.setItem('larptubex_user_payload', JSON.stringify(user));
      
      set({ user, accessToken, refreshToken, loading: false });
    } catch (error: any) {
      set({ loading: false });
      throw new Error(error.response?.data?.error || 'Неверные авторизационные данные');
    }
  },

  register: async (payload) => {
    set({ loading: true });
    try {
      const response = await api.post('/api/auth/register', payload);
      const { user, accessToken, refreshToken } = response.data;
      
      localStorage.setItem('larptubex_access_token', accessToken);
      localStorage.setItem('larptubex_refresh_token', refreshToken);
      localStorage.setItem('larptubex_user_payload', JSON.stringify(user));
      
      set({ user, accessToken, refreshToken, loading: false });
    } catch (error: any) {
      set({ loading: false });
      throw new Error(error.response?.data?.error || 'Ошибка при регистрации');
    }
  },

  logout: async () => {
    set({ loading: true });
    localStorage.removeItem('larptubex_access_token');
    localStorage.removeItem('larptubex_refresh_token');
    localStorage.removeItem('larptubex_user_payload');
    
    set({ user: null, accessToken: null, refreshToken: null, loading: false });
  },

  initialize: async () => {
    set({ loading: true });
    
    const savedToken = localStorage.getItem('larptubex_access_token');
    const savedUser = localStorage.getItem('larptubex_user_payload');
    
    if (savedToken && savedUser) {
      try {
        set({
          accessToken: savedToken,
          refreshToken: localStorage.getItem('larptubex_refresh_token'),
          user: JSON.parse(savedUser),
          loading: false,
        });
        
        // Silently sync state with server
        try {
          const res = await api.get('/api/user/profile');
          set({ user: res.data.user, loading: false });
          localStorage.setItem('larptubex_user_payload', JSON.stringify(res.data.user));
        } catch {
          get().logout();
        }
        return;
      } catch {
        get().logout();
      }
    } else {
      set({ user: null, loading: false });
    }
  }
}));
