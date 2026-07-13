import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserInfo } from '../api/iam';
import { iamApi, apiClient } from '../api';

interface AuthState {
  token: string | null;
  user: UserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  fetchUserInfo: () => Promise<void>;
  reset: () => void;
}

const mockUser: UserInfo = {
  id: '1',
  username: 'admin',
  email: 'admin@topems.com',
  name: '管理员',
  role: 'admin',
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: async (username, password) => {
        set({ isLoading: true });
        try {
          if (username === 'admin' && password === 'admin') {
            const mockToken = 'mock-token-' + Date.now();
            apiClient.defaults.headers.Authorization = `Bearer ${mockToken}`;
            set({ token: mockToken, user: mockUser, isAuthenticated: true });
          } else {
            const response = await iamApi.login({ username, password });
            const { token, user } = response.data;
            apiClient.defaults.headers.Authorization = `Bearer ${token}`;
            set({ token, user, isAuthenticated: true });
            await get().fetchUserInfo();
          }
        } catch {
          throw new Error('登录失败，请检查用户名和密码');
        } finally {
          set({ isLoading: false });
        }
      },
      logout: () => {
        delete apiClient.defaults.headers.Authorization;
        set({ token: null, user: null, isAuthenticated: false });
      },
      fetchUserInfo: async () => {
        try {
          const response = await iamApi.getUserInfo();
          set({ user: response.data });
        } catch {
          get().logout();
        }
      },
      reset: () => {
        delete apiClient.defaults.headers.Authorization;
        set({ token: null, user: null, isAuthenticated: false, isLoading: false });
      },
    }),
    {
      name: 'topems-auth',
    }
  )
);