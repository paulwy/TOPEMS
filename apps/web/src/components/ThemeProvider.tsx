'use client';

import * as React from 'react';
import { ThemeProvider as MuiThemeProvider, useColorScheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '@/store';
import { createCustomTheme } from '@/theme';

/**
 * Theme 状态与 MUI colorScheme 的映射
 *
 * P2 重构后：
 * - light/dark 走 MUI 原生 mode（使用 colorSchemes.dark / .light）
 * - system 走 setMode('system')，由系统暗/亮决定
 */
type ResolvedThemeScheme = 'light' | 'dark';

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
  // colorScheme 是 useColorScheme 解析后的实际生效方案（system 模式下即系统偏好解析结果）
  const { setMode, setColorScheme, colorScheme: resolvedScheme } = useExtendedColorScheme();

  React.useEffect(() => {
    if (storeTheme === 'system') {
      // system: 交给操作系统暗/亮偏好，MUI 会在 light/dark 间自动切换
      setMode('system');
    } else {
      // light / dark: MUI 原生 mode
      setMode(storeTheme as 'light' | 'dark');
    }
  }, [storeTheme, setMode, setColorScheme]);

  // 同步 <html> data-theme 属性 & 过渡 class
  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    const body = document.body;

    // 切换主题时添加过渡动画 class（全局过渡 300ms）
    body.classList.add('theme-transition');
    const transitionTimer = setTimeout(() => {
      body.classList.remove('theme-transition');
    }, 300);

    // 同步 data-theme 到 <html>
    // 关键：system 模式必须落到「解析后的实际方案」，不能删掉属性。
    // MUI 只写自己的色彩方案标记（CSS 走 @media (prefers-color-scheme)），
    // 并不会写 data-theme；一旦缺这个属性，[data-theme='light'] 的令牌覆盖就失效，
    // 设计令牌会停在深色默认值，而 MUI 组件已切到 light —— 文字与背景同色看不见。
    const effectiveTheme: ResolvedThemeScheme =
      storeTheme === 'system' ? (resolvedScheme === 'dark' ? 'dark' : 'light') : storeTheme;
    html.dataset.theme = effectiveTheme;

    return () => clearTimeout(transitionTimer);
  }, [storeTheme, resolvedScheme]);

  return <>{children}</>;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // 订阅语言变化：切语言时重建主题，使 MUI 组件 locale（分页/日期等默认文案）跟随语言
  const { i18n: _i18n } = useTranslation();
  const theme = React.useMemo(() => createCustomTheme(), [_i18n.language]);

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
