'use client';

import * as React from 'react';
import { useAppStore, type Theme } from '@/store';

type ThemeProviderProps = {
  children: React.ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const theme = useAppStore((state) => state.theme);

  // 监听系统主题变化
  React.useEffect(() => {
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        updateDOM(e.matches ? 'dark' : 'light');
      }
    };

    // 初始设置主题
    applyTheme();

    // 监听系统主题变化
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [theme]);

  const applyTheme = () => {
    let activeTheme: 'light' | 'dark';

    if (theme === 'system') {
      activeTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      activeTheme = theme;
    }

    updateDOM(activeTheme);
  };

  const updateDOM = (newTheme: 'light' | 'dark') => {
    const root = window.document.documentElement;

    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // 设置 data-theme 属性（可选，方便调试）
    root.setAttribute('data-theme', newTheme);
  };

  return <>{children}</>;
}
