import { useEffect, useState, useMemo } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
import { designTokens, semanticTokens } from '@topems/tokens';

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'largeDesktop';

export type Orientation = 'portrait' | 'landscape';

export interface ViewportSize {
  width: number;
  height: number;
}

export interface ResponsiveContext {
  breakpoint: Breakpoint;
  deviceType: DeviceType;
  orientation: Orientation;
  viewport: ViewportSize;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeScreen: boolean;
  isTouch: boolean;
  isRetina: boolean;
  isXs: boolean;
  isSm: boolean;
  isMd: boolean;
  isLg: boolean;
  isXl: boolean;
  isXxl: boolean;
  isTabletNarrow: boolean;
  isTabletWide: boolean;
  isLandscape: boolean;
  isPortrait: boolean;
  dpr: number;
  breakpoints: Record<string, number>;
  breakpointValues: Record<string, number> & typeof BREAKPOINTS;
}

/**
 * 响应式断点配置常量
 * 注意：xs/sm/md/lg/xl 的权威来源为 designTokens.breakpoints.values（通过 MUI ThemeProvider 注入）
 * 此处仅保留 theme 未覆盖的补充断点（tablet/tabletMax/xxl）
 * —— P2-10 合规化：移除与 designTokens.values 重复的硬编码值，避免两套体系不一致
 */
export const BREAKPOINTS = {
  tablet: 600,
  tabletMax: 1199,
  xxl: 1920,
} as const;

const getViewportSize = (): ViewportSize => {
  if (typeof window === 'undefined') return { width: 1920, height: 1080 };
  return { width: window.innerWidth, height: window.innerHeight };
};

const getDpr = (): number => {
  if (typeof window === 'undefined') return 1;
  return window.devicePixelRatio || 1;
};

/**
 * 响应式 Hook（V24.0 增强）
 * 提供设备断点检测、设备类型识别、视口尺寸、触摸支持、DPR 等响应式状态管理
 */
export const useResponsive = (): ResponsiveContext => {
  const theme = useTheme();

  // 断点检测
  const isXs = useMediaQuery(theme.breakpoints.only('xs'));
  const isSm = useMediaQuery(theme.breakpoints.only('sm'));
  const isMd = useMediaQuery(theme.breakpoints.only('md'));
  const isLg = useMediaQuery(theme.breakpoints.only('lg'));
  const isXl = useMediaQuery(theme.breakpoints.only('xl'));

  // 精确的 Tablet 断点检测（P2-10：迁移至 MUI theme.breakpoints，无硬编码数值）
  const isTabletNarrow = useMediaQuery(theme.breakpoints.only('sm'));
  const isTabletWide = useMediaQuery(theme.breakpoints.only('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'lg'));

  // 设备类型检测
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('xl'));
  const isXxl = useMediaQuery(theme.breakpoints.up(BREAKPOINTS.xxl));

  // 方向检测
  const isLandscape = useMediaQuery('(orientation: landscape)');
  const isPortrait = useMediaQuery('(orientation: portrait)');

  // 触摸支持检测
  const isTouch = useMediaQuery('(hover: none) and (pointer: coarse)');

  // Retina 屏幕检测
  const isRetina = useMediaQuery('(-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)');

  // 视口尺寸（动态更新）
  const [viewport, setViewport] = useState<ViewportSize>(getViewportSize);
  const [dpr, setDpr] = useState<number>(getDpr);

  useEffect(() => {
    let frameId: number;
    const handleResize = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        setViewport(getViewportSize());
        setDpr(getDpr());
      });
    };
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // 获取当前断点
  const getCurrentBreakpoint = (): Breakpoint => {
    if (isXxl) return 'xxl';
    if (isXl) return 'xl';
    if (isLg) return 'lg';
    if (isMd) return 'md';
    if (isSm) return 'sm';
    return 'xs';
  };

  // 获取设备类型
  const getDeviceType = (): DeviceType => {
    if (isMobile) return 'mobile';
    if (isTablet) return 'tablet';
    if (isLargeScreen) return 'largeDesktop';
    return 'desktop';
  };

  const breakpoint = getCurrentBreakpoint();
  const deviceType = getDeviceType();
  const orientation = isLandscape ? 'landscape' : 'portrait';

  // 用 useMemo 稳定返回对象引用，避免将新对象放入 useEffect dep 数组导致无限循环
  return useMemo(
    () => ({
      // 断点检测
      isXs,
      isSm,
      isMd,
      isLg,
      isXl,
      isXxl,

      // 设备类型
      isMobile,
      isTablet,
      isTabletNarrow,
      isTabletWide,
      isDesktop,
      isLargeScreen,

      // 方向
      isLandscape,
      isPortrait,

      // 增强信息
      breakpoint,
      deviceType,
      orientation,
      viewport,
      isTouch,
      isRetina,
      dpr,

      // 主题断点值（方便使用）
      breakpoints: {
        xs: theme.breakpoints.values.xs,
        sm: theme.breakpoints.values.sm,
        md: theme.breakpoints.values.md,
        lg: theme.breakpoints.values.lg,
        xl: theme.breakpoints.values.xl,
        tablet: BREAKPOINTS.tablet,
        tabletMax: BREAKPOINTS.tabletMax,
        xxl: BREAKPOINTS.xxl,
      },

      // 断点常量（合并 MUI 主题权威值 + 补充 tablet/tabletMax/xxl）
      breakpointValues: {
        ...(theme.breakpoints.values as Record<string, number>),
        ...BREAKPOINTS,
      },
    }),
    [
      isXs,
      isSm,
      isMd,
      isLg,
      isXl,
      isXxl,
      isMobile,
      isTablet,
      isTabletNarrow,
      isTabletWide,
      isDesktop,
      isLargeScreen,
      isLandscape,
      isPortrait,
      breakpoint,
      deviceType,
      orientation,
      viewport,
      isTouch,
      isRetina,
      dpr,
      theme.breakpoints.values.xs,
      theme.breakpoints.values.sm,
      theme.breakpoints.values.md,
      theme.breakpoints.values.lg,
      theme.breakpoints.values.xl,
    ]
  );
};

export default useResponsive;
