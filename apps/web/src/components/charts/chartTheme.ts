// BI Chart Color Palette
// A cohesive, professional color scheme for business intelligence dashboards

import { alpha, useTheme } from '@mui/material/styles';
import { designTokens } from '@topems/tokens';

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
    designTokens.colors.success.main, // Emerald (success.main)
    designTokens.colors.warning.main, // Amber (warning.main)
    designTokens.colors.error.main, // Red (error.main)
    designTokens.colors.secondary.main, // Violet
    designTokens.colors.cyan[500], // Cyan
    designTokens.colors.pink.main, // Pink
    designTokens.colors.neon.lime[500], // Lime
  ],
  dark: {
    series: [
      designTokens.colors.primary[400], // Blue (lighter for dark bg)
      'var(--color-success-400)', // Emerald
      designTokens.colors.warning[400], // Amber
      'var(--color-error-400)', // Red
      designTokens.colors.secondary.light, // Violet
      designTokens.colors.cyan[400], // Cyan
      designTokens.colors.pink[400], // Pink
      designTokens.colors.neon.lime[400], // Lime
    ],
    grid: designTokens.colors.grey[700],
    text: designTokens.colors.grey['400'],
    background: 'common.white',
    border: designTokens.colors.grey[600],
  },
  // 赛博朋克霓虹色板 — 高饱和度发光色，适配深空背景
  cyberpunk: {
    series: [
      'var(--cyber-color-cyan)', // 霓虹青
      'var(--cyber-color-magenta)', // 霓虹品红
      'var(--cyber-color-gold)', // 霓虹金
      'var(--cyber-color-green)', // 霓虹绿
      'var(--cyber-color-danger)', // 霓虹红
      'var(--cyber-color-blue)', // 电光蓝
      'var(--color-warning)', // 霓虹橙
      'var(--color-fallback-ant-purple)', // 紫电
    ],
    grid: alpha(designTokens.colors.cyan[500], 0.1),
    text: 'var(--cyber-color-text-muted, var(--cyber-color-text-muted))',
    background: 'common.white',
    border: alpha(designTokens.colors.cyan[500], 0.3),
  },
  neutral: {
    grid: designTokens.colors.border.default,
    gridDark: designTokens.colors.grey[700],
    text: designTokens.colors.grey[500],
    textDark: designTokens.colors.grey['400'],
    background: 'common.white',
    backgroundDark: 'common.white',
  },
  // Primary palette (kept for backward-compatible reference)
  primary: {
    blue: designTokens.colors.primary.main,
    cyan: designTokens.colors.cyan[500],
    indigo: designTokens.colors.secondary.dark,
  },
  // Semantic colors
  semantic: {
    success: designTokens.colors.success.main,
    warning: designTokens.colors.warning.main,
    error: designTokens.colors.error.main,
    info: designTokens.colors.info.main,
  },
  // Gradient definitions
  gradients: {
    blue: [designTokens.colors.primary.main, designTokens.colors.cyan[500]],
    emerald: [designTokens.colors.success.main, designTokens.colors.teal[500]],
    violet: [designTokens.colors.secondary.main, designTokens.colors.purple[500]],
    rose: [designTokens.colors.error[500], 'var(--color-error-400)'],
    amber: [designTokens.colors.warning.main, designTokens.colors.warning[400]],
  },
} as const;

/** Get color by index (cycles through palette) */
export const getChartColor = (index: number): string =>
  BIChartColors.series[index % BIChartColors.series.length];

/** Get contrasting text color for a given hex background */

/** Create gradient ID for SVG defs */

// ── Hook: dark-mode-aware chart theme resolved at runtime ──────────────────

interface ChartThemeColors {
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
  const isDark = theme.palette.mode === 'dark';
  const p = theme.palette;

  // 图表拿不到 sx 的令牌解析，只能取实际色值：这里统一从当前 palette 现算，
  // 暗色下网格/浮层/文字跟着主题走（原先写死亮色常量，暗色里网格线近白、浮层发白）。
  return {
    gridColor: p.divider,
    textColor: p.text.secondary,
    tooltipBg: p.background.paper,
    borderColor: p.divider,
    primary: p.primary.main,
    secondary: p.secondary.main,
    success: p.success.main,
    warning: p.warning.main,
    error: p.error.main,
    info: p.info.main,
    // 暗色用各语义色的 light 变体，深底上才够亮；亮色沿用既定色板
    series: isDark
      ? [
          p.primary.light,
          p.success.light,
          p.warning.light,
          p.error.light,
          p.secondary.light,
          p.cyan[400],
          p.pink[400],
          designTokens.colors.neon.lime[400],
        ]
      : BIChartColors.series,
  };
};

export default BIChartColors;
