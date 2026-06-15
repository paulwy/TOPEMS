import { useMediaQuery, useTheme } from "@mui/material";

export type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl";

/**
 * 响应式 Hook
 * 提供设备断点检测和响应式状态管理
 */
export const useResponsive = () => {
  const theme = useTheme();

  // 断点检测
  const isXs = useMediaQuery(theme.breakpoints.only("xs"));
  const isSm = useMediaQuery(theme.breakpoints.only("sm"));
  const isMd = useMediaQuery(theme.breakpoints.only("md"));
  const isLg = useMediaQuery(theme.breakpoints.only("lg"));
  const isXl = useMediaQuery(theme.breakpoints.up("xl"));

  // 设备类型检测
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "lg"));
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));

  // 方向检测
  const isLandscape = useMediaQuery("(orientation: landscape)");
  const isPortrait = useMediaQuery("(orientation: portrait)");

  // 获取当前断点
  const getCurrentBreakpoint = (): Breakpoint => {
    if (isXl) return "xl";
    if (isLg) return "lg";
    if (isMd) return "md";
    if (isSm) return "sm";
    return "xs";
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
    },
  };
};

export default useResponsive;
