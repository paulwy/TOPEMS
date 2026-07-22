'use client';

import * as React from 'react';
import { ThemeProvider as MuiThemeProvider, useColorScheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { useThemeStore } from '@/store';
import { createCustomTheme } from '@/theme';
import { injectCyberpunkStyles } from '@/theme/animations/cyberpunk.css';

// 模块级别创建一次主题（CSS Variables 模式下无需根据 mode 重建）
const theme = createCustomTheme();

type ThemeProviderProps = {
  children: React.ReactNode;
};

function ThemeSync({ children }: ThemeProviderProps) {
  const storeTheme = useThemeStore((state) => state.theme);
  const { setMode, setColorScheme } = useColorScheme();

  // 注入赛博朋克样式（幂等，仅注入一次）
  React.useEffect(() => {
    injectCyberpunkStyles();
  }, []);

  React.useEffect(() => {
    if (storeTheme === 'system') {
      setMode('system');
    } else if (storeTheme === 'cyberpunk') {
      // cyberpunk 是自定义色彩方案，使用 setColorScheme 切换
      // MUI 会在 <html> 上添加 .cyberpunk class 并应用对应 CSS 变量
      setColorScheme('cyberpunk' as 'light' | 'dark');
    } else {
      setMode(storeTheme);
    }
  }, [storeTheme, setMode, setColorScheme]);

  // 当切换到/切出 cyberpunk 主题时，同步 body class（用于组件样式覆盖）
  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    const body = document.body;

    // 切换主题时添加过渡动画 class
    body.classList.add('cyber-theme-transition');
    const transitionTimer = setTimeout(() => {
      body.classList.remove('cyber-theme-transition');
    }, 300);

    if (storeTheme === 'cyberpunk') {
      body.classList.add('cyberpunk-mode');
    } else {
      body.classList.remove('cyberpunk-mode');
    }

    return () => clearTimeout(transitionTimer);
  }, [storeTheme]);

  return <>{children}</>;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <MuiThemeProvider
      theme={theme}
      defaultMode='system'
      disableTransitionOnChange
    >
      <CssBaseline />
      <ThemeSync>{children}</ThemeSync>
    </MuiThemeProvider>
  );
}
