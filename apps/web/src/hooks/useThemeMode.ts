/**
 * useThemeMode — 主题模式切换 Hook
 *
 * 封装 useThemeStore，提供：
 * - mode：用户选择的主题（'light' | 'dark' | 'cyberpunk' | 'system'）
 * - resolvedMode：解析后的实际主题（'light' | 'dark'），将 'system' 解析为系统偏好
 * - systemPreference：当前系统偏好（'light' | 'dark'）
 * - setMode / toggleMode：切换主题
 *
 * 监听 `prefers-color-scheme` 媒体查询变化，实时更新 resolvedMode。
 */

import { useEffect, useState } from 'react';
import { useThemeStore, type Theme } from '@/store';

export type ResolvedThemeMode = 'light' | 'dark';

export interface UseThemeModeResult {
  /** 用户选择的主题（含 'system'） */
  mode: Theme;
  /** 解析后的实际主题（'system' 已根据系统偏好解析为 'light' | 'dark'） */
  resolvedMode: ResolvedThemeMode;
  /** 当前系统偏好 */
  systemPreference: ResolvedThemeMode;
  /** 是否为暗色模式（resolvedMode === 'dark'） */
  isDark: boolean;
  /** 设置主题 */
  setMode: (mode: Theme) => void;
  /** 循环切换主题：light → dark → cyberpunk → light */
  toggleMode: () => void;
}

function getSystemPreference(): ResolvedThemeMode {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function useThemeMode(): UseThemeModeResult {
  const mode = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  const [systemPreference, setSystemPreference] = useState<ResolvedThemeMode>(getSystemPreference);

  // 监听系统主题偏好变化
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPreference(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // 将 'system' 解析为实际主题
  const resolvedMode: ResolvedThemeMode =
    mode === 'system'
      ? systemPreference
      : mode === 'cyberpunk'
        ? 'dark' // cyberpunk 基于暗色背景
        : mode;

  return {
    mode,
    resolvedMode,
    systemPreference,
    isDark: resolvedMode === 'dark',
    setMode: setTheme,
    toggleMode: toggleTheme,
  };
}
