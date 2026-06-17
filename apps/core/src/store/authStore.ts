import { create } from 'zustand';
import type { User, AuthState } from '@topems/shared-types';
import { setStorage, getStorage, removeStorage } from '@topems/shared-utils';

const STORAGE_KEY = 'topems-auth';

interface AuthStore extends AuthState {
  login: (token: string, refreshToken: string, user: User) => void;
  logout: () => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  ...getStorage<AuthState>(STORAGE_KEY) ?? {
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    loading: false,
  },
  login: (token, refreshToken, user) => {
    const state: AuthState = {
      user,
      token,
      refreshToken,
      isAuthenticated: true,
      loading: false,
    };
    set(state);
    setStorage(STORAGE_KEY, state);
  },
  logout: () => {
    const state: AuthState = {
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      loading: false,
    };
    set(state);
    removeStorage(STORAGE_KEY);
  },
  setUser: (user) => {
    set((prev) => {
      const newState = { ...prev, user };
      setStorage(STORAGE_KEY, newState);
      return newState;
    });
  },
  setToken: (token) => {
    set((prev) => {
      const newState = { ...prev, token };
      setStorage(STORAGE_KEY, newState);
      return newState;
    });
  },
}));
