// Derived from @topems/tokens — single source of truth: packages/tokens/src/tokens.ts
import { designTokens, gradients } from '@topems/tokens';

const { colors } = designTokens;

// ========== Theme Colors (Light Mode) ==========
export const COLORS = {
  primary: {
    DEFAULT: colors.primary.main,
    hover: colors.primary.dark,
    light: colors.primary.light,
    foreground: colors.primary.contrastText,
    50: colors.primary[50],
    100: colors.primary[100],
    200: colors.primary[200],
    300: colors.primary[300],
    400: colors.primary[400],
    500: colors.primary[500],
    600: colors.primary[600],
    700: colors.primary[700],
    800: colors.primary[800],
    900: colors.primary[900],
  },
  secondary: {
    DEFAULT: colors.secondary.main,
    hover: colors.secondary.dark,
    light: colors.secondary.light,
    foreground: colors.secondary.contrastText,
  },
  success: {
    DEFAULT: colors.success.main,
    hover: colors.success.dark,
    light: colors.success.light,
    foreground: '#ffffff',
  },
  warning: {
    DEFAULT: colors.warning.main,
    hover: colors.warning.dark,
    light: colors.warning.light,
    foreground: '#0f172a',
  },
  error: {
    DEFAULT: colors.error.main,
    hover: colors.error.dark,
    light: colors.error.light,
    foreground: '#ffffff',
  },
  info: {
    DEFAULT: colors.info.main,
    hover: colors.info.dark,
    light: colors.info.light,
    foreground: '#ffffff',
  },
} as const;

// ========== Theme Colors (Dark Mode) ==========
export const DARK_COLORS = {
  primary: {
    DEFAULT: colors.primary.light,
    hover: colors.primary.main,
    light: colors.primary[300],
    foreground: '#0f172a',
  },
  secondary: {
    DEFAULT: colors.secondary.light,
    hover: colors.secondary.main,
    light: colors.secondary[300],
    foreground: '#0f172a',
  },
  success: {
    DEFAULT: colors.success[400],
    hover: colors.success.main,
    light: colors.success[200],
    foreground: '#0f172a',
  },
  warning: {
    DEFAULT: colors.warning[400],
    hover: colors.warning.main,
    light: colors.warning.light,
    foreground: '#0f172a',
  },
  error: {
    DEFAULT: colors.error[400],
    hover: colors.error.main,
    light: colors.error[100],
    foreground: '#ffffff',
  },
  info: {
    DEFAULT: colors.info[400],
    hover: colors.info.main,
    light: colors.info[200],
    foreground: '#0f172a',
  },
} as const;

// ========== Background & Surface (Light) ==========
export const BACKGROUNDS = {
  background: colors.background.default,
  surface: colors.background.paper,
  surfaceLight: colors.border.light,
  surfaceHover: colors.action.active,
  card: colors.background.paper,
  cardHover: colors.border.light,
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
  primary: colors.text.primary,
  secondary: colors.text.secondary,
  muted: colors.text.muted,
  disabled: colors.text.disabled,
} as const;

export const DARK_TEXT = {
  primary: '#f8fafc',
  secondary: '#94a3b8',
  muted: '#64748b',
  disabled: '#64748b',
} as const;

// ========== Border Colors ==========
export const BORDERS = {
  DEFAULT: colors.border.default,
  light: colors.border.light,
  input: colors.border.default,
  ring: colors.primary.main,
} as const;

export const DARK_BORDERS = {
  DEFAULT: '#334155',
  light: '#475569',
  input: '#334155',
  ring: colors.primary.light,
} as const;

// ========== Status Colors (for badges) ==========
export const STATUS_COLORS = {
  pending: {
    bgcolor: colors.action.hover,
    color: '#475569',
  },
  inProgress: {
    bgcolor: colors.action.selected,
    color: colors.primary[700],
  },
  completed: {
    bgcolor: colors.success[100],
    color: colors.success[700],
  },
  failed: {
    bgcolor: colors.error[100],
    color: colors.error[700],
  },
  warning: {
    bgcolor: colors.warning[100],
    color: colors.warning[700],
  },
} as const;

// ========== Module Gradients — from @topems/tokens ==========
export const MODULE_GRADIENTS = gradients.modules;

// ========== Common Gradients ==========
export const GRADIENTS = {
  primary: gradients.primary,
  secondary: gradients.secondary,
  brand: gradients.brand,
  text: gradients.text,
  success: gradients.success,
  warning: gradients.warning,
  error: gradients.error,
  info: gradients.info,
  accent: gradients.secondary,
} as const;

// ========== Sidebar Colors ==========
export const SIDEBAR = {
  active: {
    color: colors.primary.main,
    bgcolor: 'rgba(59, 130, 246, 0.08)',
  },
  default: {
    color: colors.text.secondary,
    bgcolor: 'transparent',
    hover: {
      color: colors.text.primary,
      bgcolor: colors.action.hover,
    },
  },
} as const;

export const DARK_SIDEBAR = {
  active: {
    color: colors.primary.light,
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
