'use client';

import * as React from 'react';
import { ThemeProvider as MuiThemeProvider, useColorScheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { useThemeStore } from '@/store';
import { createCustomTheme } from '@/theme';

// 模块级别创建一次主题（CSS Variables 模式下无需根据 mode 重建）
const theme = createCustomTheme();

type ThemeProviderProps = {
  children: React.ReactNode;
};

function ThemeSync({ children }: ThemeProviderProps) {
  const storeTheme = useThemeStore((state) => state.theme);
  const { setMode } = useColorScheme();

  React.useEffect(() => {
    if (storeTheme === 'system') {
      setMode('system');
    } else {
      setMode(storeTheme);
    }
  }, [storeTheme, setMode]);

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
