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

/** 主题 i18n key 映射（懒翻译，组件渲染时才调用 t） */
const THEME_LABEL_KEYS: Record<Theme, { labelKey: string; descriptionKey: string }> = {
  light: { labelKey: 'store.theme_store.k0', descriptionKey: 'store.theme_store.k1' },
  dark: { labelKey: 'store.theme_store.k2', descriptionKey: 'store.theme_store.k3' },
  cyberpunk: { labelKey: 'store.theme_store.k4', descriptionKey: 'store.theme_store.k5' },
  system: { labelKey: 'store.theme_store.k6', descriptionKey: 'store.theme_store.k7' },
};

/**
 * 获取主题列表（组件渲染时才懒调用 i18n.t，避免模块加载期 i18n 尚未初始化导致 key 透传）
 */
export const getThemeList = (
  t: (key: string, fallback?: string) => string
): { value: Theme; label: string; description: string }[] => {
  return (['light', 'dark', 'cyberpunk', 'system'] as Theme[]).map((value) => ({
    value,
    label: t(THEME_LABEL_KEYS[value].labelKey),
    description: t(THEME_LABEL_KEYS[value].descriptionKey),
  }));
};

/** 主题图标 key（供 ThemeSelector 等 UI 使用） */
export type ThemeIconKey = 'Sun' | 'Moon' | 'Sparkles' | 'Monitor';
export const THEME_ICON_KEYS: Record<Theme, ThemeIconKey> = {
  light: 'Sun',
  dark: 'Moon',
  cyberpunk: 'Sparkles',
  system: 'Monitor',
};

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
        // 循环切换：light → dark → cyberpunk → system → light
        const { theme } = get();
        const next: Theme =
          theme === 'light'
            ? 'dark'
            : theme === 'dark'
              ? 'cyberpunk'
              : theme === 'cyberpunk'
                ? 'system'
                : 'light';
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

/** 兼容旧导出：themeList 改为函数（保留同名引用，避免破坏下游） */
import i18n from '@/i18n';
export const themeList = (() => {
  try {
    return getThemeList((key) => i18n.t(key));
  } catch {
    return (['light', 'dark', 'cyberpunk', 'system'] as Theme[]).map((value) => ({
      value,
      label: THEME_LABEL_KEYS[value].labelKey,
      description: THEME_LABEL_KEYS[value].description,
    }));
  }
})();
