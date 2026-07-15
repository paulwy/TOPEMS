import { useMediaQuery, useTheme } from '@mui/material';

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * 响应式断点配置常量
 * 参考 Material Design 断点规范，添加精确的 Tablet 断点
 */
export const BREAKPOINTS = {
  xs: 0,
  sm: 600,
  md: 768,
  tablet: 768,
  tabletMax: 1024,
  lg: 900,
  xl: 1200,
};

/**
 * 响应式 Hook
 * 提供设备断点检测和响应式状态管理
 */
export const useResponsive = () => {
  const theme = useTheme();

  // 断点检测
  const isXs = useMediaQuery(theme.breakpoints.only('xs'));
  const isSm = useMediaQuery(theme.breakpoints.only('sm'));
  const isMd = useMediaQuery(theme.breakpoints.only('md'));
  const isLg = useMediaQuery(theme.breakpoints.only('lg'));
  const isXl = useMediaQuery(theme.breakpoints.up('xl'));

  // 精确的 Tablet 断点检测（768px - 1024px）
  const isTabletNarrow = useMediaQuery('(min-width:768px) and (max-width:899px)');
  const isTabletWide = useMediaQuery('(min-width:900px) and (max-width:1024px)');
  const isTablet = useMediaQuery('(min-width:768px) and (max-width:1024px)');

  // 设备类型检测
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));

  // 方向检测
  const isLandscape = useMediaQuery('(orientation: landscape)');
  const isPortrait = useMediaQuery('(orientation: portrait)');

  // 获取当前断点
  const getCurrentBreakpoint = (): Breakpoint => {
    if (isXl) return 'xl';
    if (isLg) return 'lg';
    if (isMd) return 'md';
    if (isSm) return 'sm';
    return 'xs';
  };

  const breakpoint = getCurrentBreakpoint();

  return {
    // 断点检测
    isXs,
    isSm,
    isMd,
    isLg,
    isXl,

    // 设备类型
    isMobile,
    isTablet,
    isTabletNarrow,
    isTabletWide,
    isDesktop,

    // 方向
    isLandscape,
    isPortrait,

    // 当前断点
    breakpoint,

    // 主题断点值（方便使用）
    breakpoints: {
      xs: theme.breakpoints.values.xs,
      sm: theme.breakpoints.values.sm,
      md: theme.breakpoints.values.md,
      lg: theme.breakpoints.values.lg,
      xl: theme.breakpoints.values.xl,
      tablet: BREAKPOINTS.tablet,
      tabletMax: BREAKPOINTS.tabletMax,
    },

    // 断点常量
    breakpointValues: BREAKPOINTS,
  };
};

export default useResponsive;
