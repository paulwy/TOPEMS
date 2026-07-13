import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => {
        const { theme } = get();
        set({
          theme: theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light',
        });
      },
    }),
    {
      name: 'topems-theme-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export const useTheme = () => {
  const theme = useThemeStore((state) => state.theme);
  const { setTheme, toggleTheme } = useThemeStore();
  
  return { theme, setTheme, toggleTheme };
};
