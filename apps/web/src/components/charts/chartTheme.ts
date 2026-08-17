// BI Chart Color Palette
// A cohesive, professional color scheme for business intelligence dashboards

import { useTheme } from '@mui/material/styles';
import { useThemeStore } from '@/store';
import { designTokens, semanticTokens } from '@topems/tokens';

// ── Chart type enum for future MUI X Charts migration ──────────────────────

export enum ChartType {
  BAR = 'bar',
  LINE = 'line',
  PIE = 'pie',
  AREA = 'area',
  RADAR = 'radar',
  SCATTER = 'scatter',
  COMPOSED = 'composed',
}

// ── Concrete hex color palette (safe for recharts / canvas) ───────────────

export const BIChartColors = {
  series: [
    designTokens.colors.primary.main, // Blue (primary.main)
    'colors.success.main', // Emerald (success.main)
    designTokens.colors.warning.main, // Amber (warning.main)
    designTokens.colors.error.main, // Red (error.main)
    designTokens.colors.secondary.main, // Violet
    'colors.cyan.500', // Cyan
    designTokens.colors.pink.main, // Pink
    designTokens.colors.neon.lime[500], // Lime
  ],
  dark: {
    series: [
      'colors.primary.400', // Blue (lighter for dark bg)
      'var(--color-success-400, #4ade80)', // Emerald
      'colors.warning.400', // Amber
      'var(--color-error-400, #f87171)', // Red
      'colors.secondary.light', // Violet
      'colors.cyan.400', // Cyan
      'colors.pink.400', // Pink
      designTokens.colors.neon.lime[400], // Lime
    ],
    grid: designTokens.colors.grey[700],
    text: designTokens.colors.grey['400'],
    background: 'common.white',
    border: 'colors.grey.600',
  },
  // 赛博朋克霓虹色板 — 高饱和度发光色，适配深空背景
  cyberpunk: {
    series: [
      'var(--cyber-color-cyan, var(--cyber-color-cyan, #00ffff))', // 霓虹青
      'var(--cyber-color-magenta, var(--cyber-color-magenta, #ff00ff))', // 霓虹品红
      'var(--cyber-color-gold, var(--cyber-color-gold, #ffd700))', // 霓虹金
      'var(--cyber-color-green, var(--cyber-color-green, #00ff88))', // 霓虹绿
      'var(--cyber-color-danger, var(--cyber-color-danger, #ff4444))', // 霓虹红
      'var(--cyber-color-blue, var(--cyber-color-blue, #00aaff))', // 电光蓝
      'var(--color-warning, #f59e0b)', // 霓虹橙
      'var(--color-fallback-ant-purple, #aa00ff)', // 紫电
    ],
    grid: 'rgba(0, 255, 255, 0.10)',
    text: 'var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0))',
    background: 'common.white',
    border: 'rgba(0, 255, 255, 0.30)',
  },
  neutral: {
    grid: designTokens.colors.border.default,
    gridDark: designTokens.colors.grey[700],
    text: 'colors.grey.500',
    textDark: designTokens.colors.grey['400'],
    background: 'common.white',
    backgroundDark: 'common.white',
  },
  // Primary palette (kept for backward-compatible reference)
  primary: {
    blue: designTokens.colors.primary.main,
    cyan: 'colors.cyan.500',
    indigo: designTokens.colors.secondary.dark,
  },
  // Semantic colors
  semantic: {
    success: 'colors.success.main',
    warning: designTokens.colors.warning.main,
    error: designTokens.colors.error.main,
    info: 'colors.info.main',
  },
  // Gradient definitions
  gradients: {
    blue: [designTokens.colors.primary.main, 'colors.cyan.500'],
    emerald: ['colors.success.main', 'colors.teal.500'],
    violet: [designTokens.colors.secondary.main, 'colors.purple.500'],
    rose: [designTokens.colors.error[500], 'var(--color-error-400, #f87171)'],
    amber: [designTokens.colors.warning.main, 'colors.warning.400'],
  },
} as const;

export type ChartColor = (typeof BIChartColors.series)[number];

/** Get color by index (cycles through palette) */
export const getChartColor = (index: number): string =>
  BIChartColors.series[index % BIChartColors.series.length];

/** Get contrasting text color for a given hex background */
export const getContrastingColor = (hexColor: string): string => {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? 'colors.grey.800' : 'var(--color-primary-foreground, #ffffff)';
};

/** Create gradient ID for SVG defs */
export const createGradientId = (prefix: string, index: number): string =>
  `${prefix}-gradient-${index}`;

// ── Hook: dark-mode-aware chart theme resolved at runtime ──────────────────

export interface ChartThemeColors {
  /** Grid / axis line color */
  gridColor: string;
  /** Tick / label text color */
  textColor: string;
  /** Tooltip background */
  tooltipBg: string;
  /** Tooltip / card border color */
  borderColor: string;
  /** MUI primary, resolved to hex */
  primary: string;
  /** MUI secondary, resolved to hex */
  secondary: string;
  /** MUI success, resolved to hex */
  success: string;
  /** MUI warning, resolved to hex */
  warning: string;
  /** MUI error, resolved to hex */
  error: string;
  /** MUI info, resolved to hex */
  info: string;
  /** Series color palette (dark-aware) */
  series: readonly string[];
}

export const useChartTheme = (): ChartThemeColors => {
  const theme = useTheme();
  const storeTheme = useThemeStore((state) => state.theme);
  const isDark = theme.palette.mode === 'dark';
  const isCyberpunk = storeTheme === 'cyberpunk';

  // 赛博朋克模式优先级最高
  if (isCyberpunk) {
    return {
      gridColor: BIChartColors.cyberpunk.grid,
      textColor: BIChartColors.cyberpunk.text,
      tooltipBg: BIChartColors.cyberpunk.background,
      borderColor: BIChartColors.cyberpunk.border,
      primary: 'var(--cyber-color-cyan, var(--cyber-color-cyan, #00ffff))',
      secondary: 'var(--cyber-color-magenta, var(--cyber-color-magenta, #ff00ff))',
      success: 'var(--cyber-color-green, var(--cyber-color-green, #00ff88))',
      warning: 'var(--cyber-color-gold, var(--cyber-color-gold, #ffd700))',
      error: 'var(--cyber-color-danger, var(--cyber-color-danger, #ff4444))',
      info: 'var(--cyber-color-blue, var(--cyber-color-blue, #00aaff))',
      series: BIChartColors.cyberpunk.series,
    };
  }

  return {
    gridColor: isDark ? BIChartColors.neutral.gridDark : BIChartColors.neutral.grid,
    textColor: isDark ? BIChartColors.neutral.textDark : BIChartColors.neutral.text,
    tooltipBg: isDark ? BIChartColors.neutral.backgroundDark : BIChartColors.neutral.background,
    borderColor: isDark ? 'colors.grey.600' : designTokens.colors.border.default,
    primary: theme.palette.primary.main,
    secondary: theme.palette.secondary.main,
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
    info: theme.palette.info.main,
    series: isDark ? BIChartColors.dark.series : BIChartColors.series,
  };
};

export default BIChartColors;
