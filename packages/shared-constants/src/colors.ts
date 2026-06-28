/**
 * TOPEMS Design Tokens — Color Constants
 *
 * Single source of truth derived from apps/web/src/theme/tokens.ts
 * Provides both light and dark mode colors for runtime use outside of CSS/MUI.
 *
 * Usage:
 *   import { COLORS, DARK_COLORS, BACKGROUNDS, DARK_BACKGROUNDS } from "@topems/shared-constants";
 */

// ========== Theme Colors (Light Mode) ==========
export const COLORS = {
  primary: {
    DEFAULT: '#3b82f6',
    hover: '#2563eb',
    light: '#60a5fa',
    foreground: '#ffffff',
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  secondary: {
    DEFAULT: '#8b5cf6',
    hover: '#7c3aed',
    light: '#a78bfa',
    foreground: '#ffffff',
  },
  success: {
    DEFAULT: '#22c55e',
    hover: '#16a34a',
    light: '#86efac',
    foreground: '#ffffff',
  },
  warning: {
    DEFAULT: '#f59e0b',
    hover: '#d97706',
    light: '#fde68a',
    foreground: '#0f172a',
  },
  error: {
    DEFAULT: '#ef4444',
    hover: '#dc2626',
    light: '#fca5a5',
    foreground: '#ffffff',
  },
  info: {
    DEFAULT: '#0ea5e9',
    hover: '#0284c7',
    light: '#7dd3fc',
    foreground: '#ffffff',
  },
} as const;

// ========== Theme Colors (Dark Mode) ==========
export const DARK_COLORS = {
  primary: {
    DEFAULT: '#60a5fa',
    hover: '#3b82f6',
    light: '#93c5fd',
    foreground: '#0f172a',
  },
  secondary: {
    DEFAULT: '#a78bfa',
    hover: '#8b5cf6',
    light: '#c4b5fd',
    foreground: '#0f172a',
  },
  success: {
    DEFAULT: '#4ade80',
    hover: '#22c55e',
    light: '#bbf7d0',
    foreground: '#0f172a',
  },
  warning: {
    DEFAULT: '#fbbf24',
    hover: '#f59e0b',
    light: '#fde68a',
    foreground: '#0f172a',
  },
  error: {
    DEFAULT: '#f87171',
    hover: '#ef4444',
    light: '#fecaca',
    foreground: '#ffffff',
  },
  info: {
    DEFAULT: '#38bdf8',
    hover: '#0ea5e9',
    light: '#bae6fd',
    foreground: '#0f172a',
  },
} as const;

// ========== Background & Surface (Light) ==========
export const BACKGROUNDS = {
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceLight: '#f1f5f9',
  surfaceHover: '#e2e8f0',
  card: '#ffffff',
  cardHover: '#f1f5f9',
} as const;

// ========== Background & Surface (Dark) ==========
export const DARK_BACKGROUNDS = {
  background: '#0f172a',
  surface: '#1e293b',
  surfaceLight: '#334155',
  surfaceHover: '#475569',
  card: '#1e293b',
  cardHover: '#334155',
} as const;

// ========== Text Colors ==========
export const TEXT = {
  primary: '#1e293b',
  secondary: '#64748b',
  muted: '#94a3b8',
  disabled: '#cbd5e1',
} as const;

export const DARK_TEXT = {
  primary: '#f8fafc',
  secondary: '#94a3b8',
  muted: '#64748b',
  disabled: '#64748b',
} as const;

// ========== Border Colors ==========
export const BORDERS = {
  DEFAULT: '#e2e8f0',
  light: '#f1f5f9',
  input: '#e2e8f0',
  ring: '#3b82f6',
} as const;

export const DARK_BORDERS = {
  DEFAULT: '#334155',
  light: '#475569',
  input: '#334155',
  ring: '#60a5fa',
} as const;

// ========== Status Colors (for badges, unchanged) ==========
export const STATUS_COLORS = {
  pending: {
    bgcolor: '#f1f5f9',
    color: '#475569',
  },
  inProgress: {
    bgcolor: '#dbeafe',
    color: '#1d4ed8',
  },
  completed: {
    bgcolor: '#dcfce7',
    color: '#15803d',
  },
  failed: {
    bgcolor: '#fee2e2',
    color: '#b91c1c',
  },
  warning: {
    bgcolor: '#fef3c7',
    color: '#b45309',
  },
} as const;

// ========== Module Gradients — synced with gradients.ts ==========
export const MODULE_GRADIENTS = {
  hrm: 'linear-gradient(135deg, #22C55E 0%, #15803D 100%)',
  crm: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
  pm: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
  finance: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
  mes: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
  scm: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
  wms: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
  bi: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
  gis: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
  im: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
  ai: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
  qms: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
  flow: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
} as const;

// ========== Common Gradients ==========
export const GRADIENTS = {
  primary: 'linear-gradient(135deg, #3b82f6, #2563eb)',
  secondary: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
  brand: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
  text: 'linear-gradient(135deg, #60a5fa, #a78bfa, #f472b6)',
  success: 'linear-gradient(135deg, #22c55e, #16a34a)',
  warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
  error: 'linear-gradient(135deg, #ef4444, #dc2626)',
  info: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
} as const;

// ========== Sidebar Colors ==========
export const SIDEBAR = {
  active: {
    color: '#3b82f6',
    bgcolor: 'rgba(59, 130, 246, 0.08)',
  },
  default: {
    color: '#64748b',
    bgcolor: 'transparent',
    hover: {
      color: '#1e293b',
      bgcolor: '#f1f5f9',
    },
  },
} as const;

export const DARK_SIDEBAR = {
  active: {
    color: '#60a5fa',
    bgcolor: 'rgba(96, 165, 250, 0.15)',
  },
  default: {
    color: '#94a3b8',
    bgcolor: 'transparent',
    hover: {
      color: '#f8fafc',
      bgcolor: 'rgba(255, 255, 255, 0.05)',
    },
  },
} as const;

// ========== Helper Functions ==========

/**
 * Get status color configuration for badges
 */
export function getStatusColorConfig(status?: string): {
  bgcolor: string;
  color: string;
} {
  if (!status) {
    return STATUS_COLORS.pending;
  }

  const statusLower = status.toLowerCase();

  if (
    statusLower.includes('完成') ||
    statusLower.includes('成功') ||
    statusLower === 'active' ||
    statusLower === 'completed'
  ) {
    return STATUS_COLORS.completed;
  }

  if (
    statusLower.includes('失败') ||
    statusLower.includes('错误') ||
    statusLower === 'failed' ||
    statusLower === 'error'
  ) {
    return STATUS_COLORS.failed;
  }

  if (
    statusLower.includes('进行') ||
    statusLower.includes('处理') ||
    statusLower === 'processing' ||
    statusLower === 'in_progress'
  ) {
    return STATUS_COLORS.inProgress;
  }

  if (
    statusLower.includes('待') ||
    statusLower.includes('等待') ||
    statusLower === 'pending' ||
    statusLower === 'waiting'
  ) {
    return STATUS_COLORS.pending;
  }

  if (statusLower.includes('警告') || statusLower === 'warning') {
    return STATUS_COLORS.warning;
  }

  return STATUS_COLORS.pending;
}

/**
 * Get MUI sx prop format status colors
 */
export function getStatusSxProps(status?: string) {
  const config = getStatusColorConfig(status);
  return {
    bgcolor: config.bgcolor,
    color: config.color,
  };
}
