// BI Chart Color Palette
// A cohesive, professional color scheme for business intelligence dashboards

export const BIChartColors = {
  // Primary palette
  primary: {
    blue: 'primary.main',
    cyan: '#06B6D4',
    indigo: '#6366F1',
  },
  // Semantic colors
  semantic: {
    success: 'success.main',
    warning: 'warning.main',
    error: 'error.main',
    info: '#0EA5E9',
  },
  // Neutral palette
  neutral: {
    slate: '#64748B',
    slateLight: '#94A3B8',
    slateDark: '#475569',
    gray: 'grey.500',
  },
  // Chart series colors (up to 8 series)
  series: [
    'primary.main', // Blue
    'success.main', // Emerald
    'warning.main', // Amber
    'error.main', // Red
    '#8B5CF6', // Violet
    '#06B6D4', // Cyan
    '#EC4899', // Pink
    '#84CC16', // Lime
  ],
  // Gradient definitions
  gradients: {
    blue: ['primary.main', '#06B6D4'],
    emerald: ['success.main', '#14B8A6'],
    violet: ['#8B5CF6', '#A855F7'],
    rose: ['#F43F5E', '#FB7185'],
    amber: ['warning.main', '#FBBF24'],
  },
} as const;

export type ChartColor = (typeof BIChartColors.series)[number];

// Get color by index (cycles through palette)
export const getChartColor = (index: number): string => {
  return BIChartColors.series[index % BIChartColors.series.length];
};

// Get contrasting text color
export const getContrastingColor = (hexColor: string): string => {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1E293B' : 'white';
};

// Create gradient ID for SVG
export const createGradientId = (prefix: string, index: number): string => {
  return `${prefix}-gradient-${index}`;
};

export default BIChartColors;
