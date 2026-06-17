export type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl";
/**
 * 响应式 Hook
 * 提供设备断点检测和响应式状态管理
 */
export declare const useResponsive: () => {
    isXs: boolean;
    isSm: boolean;
    isMd: boolean;
    isLg: boolean;
    isXl: boolean;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    isLandscape: boolean;
    isPortrait: boolean;
    breakpoint: Breakpoint;
    breakpoints: {
        xs: number;
        sm: number;
        md: number;
        lg: number;
        xl: number;
    };
};
export default useResponsive;
