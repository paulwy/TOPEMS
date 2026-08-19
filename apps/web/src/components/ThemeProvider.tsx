'use client';

import * as React from 'react';
import { ThemeProvider as MuiThemeProvider, useColorScheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { useThemeStore } from '@/store';
import { createCustomTheme } from '@/theme';
import { injectCyberpunkStyles } from '@/theme/animations/cyberpunk.css';

/**
 * Theme 状态与 MUI colorScheme 的映射
 *
 * P2 重构后：
 * - light/dark 走 MUI 原生 mode（使用 colorSchemes.dark / .light）
 * - cyberpunk 走 colorSchemes.cyberpunk（mode=dark + 霓虹 palette），与纯 dark 有明显差异
 * - system 走 setMode('system')，由系统暗/亮决定
 *
 * 不再使用 `cyberpunk' as 'light' | 'dark'` 的类型 hack：
 *   MUI createTheme 的 colorSchemes 支持任意字符串键，
 *   useColorScheme().setColorScheme 接受 `keyof typeof colorSchemes`，
 *   但 MUI 类型没有开放扩展，我们用一个局部类型扩展封装。
 */
type ResolvedThemeScheme = 'light' | 'dark' | 'cyberpunk';

// 模块级别创建一次主题（CSS Variables 模式下无需根据 mode 重建）
const theme = createCustomTheme();

type ThemeProviderProps = {
  children: React.ReactNode;
};

/**
 * 扩展 useColorScheme 返回类型，让 setColorScheme 接受 'cyberpunk' 作为合法值
 * 避免使用 `as 'light' | 'dark'` 的强转 hack
 *
 * 注意：必须用 useCallback 稳定返回的包装函数引用，否则：
 *   - 每次渲染都创建新的 setColorScheme 引用
 *   - ThemeSync 中 useEffect([setColorScheme]) 每次渲染都重新执行
 *   - effect 内调用 setMode/setColorScheme 触发 MUI 内部 setState → 再次渲染
 *   - 最终形成「渲染 → 新函数引用 → effect → setState → 渲染」的无限循环
 */
function useExtendedColorScheme() {
  const scheme = useColorScheme();

  const setColorSchemeStable = React.useCallback(
    (next: ResolvedThemeScheme | 'system') => {
      (scheme.setColorScheme as (s: string) => void)(next);
    },
    [scheme.setColorScheme]
  );

  return React.useMemo(
    () => ({
      ...scheme,
      setColorScheme: setColorSchemeStable,
      setMode: scheme.setMode,
    }),
    [scheme, setColorSchemeStable]
  );
}

function ThemeSync({ children }: ThemeProviderProps) {
  const storeTheme = useThemeStore((state) => state.theme);
  const { setMode, setColorScheme } = useExtendedColorScheme();

  // 注入赛博朋克样式（幂等，仅注入一次 cyberpunk.css 中的 global 样式）
  // —— 注意：赛博朋克组件覆盖现在走 colorSchemes.cyberpunk.palette + 组件内 applyStyles，
  //    不再强制依赖 body class；保留 body.cyberpunk-mode 以兼容全局 CSS 中的自定义组件样式。
  React.useEffect(() => {
    injectCyberpunkStyles();
  }, []);

  React.useEffect(() => {
    if (storeTheme === 'system') {
      // system: 交给操作系统暗/亮偏好，MUI 会在 light/dark 间自动切换
      setMode('system');
    } else if (storeTheme === 'cyberpunk') {
      // cyberpunk: 使用自定义 cyberpunk 色彩方案（深空 + 霓虹青/品红）
      // setColorScheme('cyberpunk') 会在 <html> 上添加 data-theme="cyberpunk"
      // colorSchemes.cyberpunk.palette 中 mode=dark，会自动触发 MUI 组件的深色内置样式
      setColorScheme('cyberpunk');
    } else {
      // light / dark: MUI 原生 mode
      setMode(storeTheme as 'light' | 'dark');
    }
  }, [storeTheme, setMode, setColorScheme]);

  // 同步 body data-theme 属性 & 过渡 class（用于组件级自定义 CSS 中 `[data-theme="cyberpunk"]` 选择器）
  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    const body = document.body;

    // 切换主题时添加过渡动画 class（全局过渡 300ms）
    body.classList.add('cyber-theme-transition');
    const transitionTimer = setTimeout(() => {
      body.classList.remove('cyber-theme-transition');
    }, 300);

    // 同步 data-theme 到 <html> 与 <body>（两套选择器兼容）
    if (storeTheme === 'cyberpunk') {
      body.classList.add('cyberpunk-mode');
      html.dataset.theme = 'cyberpunk';
    } else if (storeTheme === 'dark') {
      body.classList.remove('cyberpunk-mode');
      html.dataset.theme = 'dark';
    } else if (storeTheme === 'light') {
      body.classList.remove('cyberpunk-mode');
      html.dataset.theme = 'light';
    } else {
      // system: 由 useColorScheme 自动根据系统设置设置 data-theme="light"/"dark"
      body.classList.remove('cyberpunk-mode');
      delete html.dataset.theme;
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
