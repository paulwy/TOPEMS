import { create } from 'zustand';
import { ThemeMode } from '../theme';

interface ThemeStore {
  mode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  reset: () => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  mode: 'light',
  toggleTheme: () => set((state) => ({ mode: state.mode === 'light' ? 'dark' : 'light' })),
  setTheme: (mode) => set({ mode }),
  reset: () => set({ mode: 'light' }),
}));