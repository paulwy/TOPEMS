import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * 主题类型
 * - light: 亮色主题（默认）
 * - dark: 暗色主题
 * - cyberpunk: 赛博朋克主题（霓虹科技风）
 * - system: 跟随系统（自动在 light/dark 间切换）
 */
export type Theme = 'light' | 'dark' | 'cyberpunk' | 'system';

/** 主题列表（用于主题选择器 UI） */
export const themeList: { value: Theme; label: string; description: string }[] = [
  { value: 'light', label: '亮色', description: '明亮清晰，适合白天使用' },
  { value: 'dark', label: '暗色', description: '深色背景，护眼舒适' },
  { value: 'cyberpunk', label: '赛博朋克', description: '霓虹科技风，深空背景' },
  { value: 'system', label: '跟随系统', description: '自动跟随系统偏好' },
];

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
        // 循环切换：light → dark → cyberpunk → light
        const { theme } = get();
        const next: Theme =
          theme === 'light'
            ? 'dark'
            : theme === 'dark'
              ? 'cyberpunk'
              : theme === 'cyberpunk'
                ? 'light'
                : 'dark';
        set({ theme: next });
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
