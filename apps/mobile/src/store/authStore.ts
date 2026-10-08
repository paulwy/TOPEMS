import { create } from 'zustand';
import type { User, LoginCredentials } from '@/types';
import { authApi } from '@/api/auth';
import { storage } from '@/utils/storage';
import { zh } from '../i18n/zh';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login(credentials);
      if (response.success && response.data) {
        const user = response.data.user;
        const token = response.data.token || response.data.access_token;
        if (token) {
          await storage.setToken(token);
          await storage.setUser(user);
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          set({ error: zh['auth.noTokenError'], isLoading: false });
        }
      } else {
        set({ error: response.message || zh['auth.loginFailed'], isLoading: false });
      }
    } catch {
      set({ error: zh['auth.networkError'], isLoading: false });
    }
  },

  logout: async () => {
    await storage.removeToken();
    await storage.removeUser();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },

  checkAuth: async () => {
    const token = await storage.getToken();
    const user = await storage.getUser<User>();
    if (token) {
      set({ token, user, isAuthenticated: true });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
