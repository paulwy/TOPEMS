// BI Chart Color Palette
// A cohesive, professional color scheme for business intelligence dashboards

import { useTheme } from '@mui/material/styles';
import { useThemeStore } from '@/store';

// ── Chart type enum for future MUI X Charts migration ──────────────────────

export enum ChartType {
  Bar = 'bar',
  Line = 'line',
  Pie = 'pie',
  Area = 'area',
  Radar = 'radar',
  Scatter = 'scatter',
  Composed = 'composed',
}

// ── Concrete hex color palette (safe for recharts / canvas) ───────────────

export const BIChartColors = {
  series: [
    '#3b82f6', // Blue (primary.main)
    '#22c55e', // Emerald (success.main)
    '#f59e0b', // Amber (warning.main)
    '#ef4444', // Red (error.main)
    '#8B5CF6', // Violet
    '#06B6D4', // Cyan
    '#EC4899', // Pink
    '#84CC16', // Lime
  ],
  dark: {
    series: [
      '#60a5fa', // Blue (lighter for dark bg)
      '#4ade80', // Emerald
      '#fbbf24', // Amber
      '#f87171', // Red
      '#a78bfa', // Violet
      '#22d3ee', // Cyan
      '#f472b6', // Pink
      '#a3e635', // Lime
    ],
    grid: '#334155',
    text: '#94A3B8',
    background: 'rgba(30, 41, 59, 0.95)',
    border: '#475569',
  },
  // 赛博朋克霓虹色板 — 高饱和度发光色，适配深空背景
  cyberpunk: {
    series: [
      '#00FFFF', // 霓虹青
      '#FF00FF', // 霓虹品红
      '#FFD700', // 霓虹金
      '#00FF88', // 霓虹绿
      '#FF4444', // 霓虹红
      '#00AAFF', // 电光蓝
      '#FF8800', // 霓虹橙
      '#AA00FF', // 紫电
    ],
    grid: 'rgba(0, 255, 255, 0.10)',
    text: '#8892B0',
    background: 'rgba(26, 26, 46, 0.95)',
    border: 'rgba(0, 255, 255, 0.30)',
  },
  neutral: {
    grid: '#E2E8F0',
    gridDark: '#334155',
    text: '#64748B',
    textDark: '#94A3B8',
    background: 'rgba(255, 255, 255, 0.95)',
    backgroundDark: 'rgba(30, 41, 59, 0.95)',
  },
  // Primary palette (kept for backward-compatible reference)
  primary: {
    blue: '#3b82f6',
    cyan: '#06B6D4',
    indigo: '#6366F1',
  },
  // Semantic colors
  semantic: {
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#0EA5E9',
  },
  // Gradient definitions
  gradients: {
    blue: ['#3b82f6', '#06B6D4'],
    emerald: ['#22c55e', '#14B8A6'],
    violet: ['#8B5CF6', '#A855F7'],
    rose: ['#F43F5E', '#FB7185'],
    amber: ['#f59e0b', '#FBBF24'],
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
  return luminance > 0.5 ? '#1E293B' : 'white';
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
      primary: '#00FFFF',
      secondary: '#FF00FF',
      success: '#00FF88',
      warning: '#FFD700',
      error: '#FF4444',
      info: '#00AAFF',
      series: BIChartColors.cyberpunk.series,
    };
  }

  return {
    gridColor: isDark ? BIChartColors.neutral.gridDark : BIChartColors.neutral.grid,
    textColor: isDark ? BIChartColors.neutral.textDark : BIChartColors.neutral.text,
    tooltipBg: isDark ? BIChartColors.neutral.backgroundDark : BIChartColors.neutral.background,
    borderColor: isDark ? '#475569' : '#E2E8F0',
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
