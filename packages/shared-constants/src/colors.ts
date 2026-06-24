/**
 * 统一颜色常量
 * 使用纯 RGB 值，不依赖 CSS 变量
 * 使用方法：import { COLORS } from "@topems/shared-constants";
 */

// ========== 主题颜色 ==========
export const COLORS = {
  primary: {
    DEFAULT: 'rgb(96, 165, 250)', // #60a5fa
    hover: 'rgb(59, 130, 246)', // #3b82f6
    foreground: 'rgb(255, 255, 255)', // #ffffff
    rgb: 'rgb(96, 165, 250)', // #60a5fa
  },
  secondary: {
    DEFAULT: 'rgb(148, 163, 184)', // #94a3b8
    hover: 'rgb(100, 116, 139)', // #64748b
    foreground: 'rgb(255, 255, 255)', // #ffffff
    rgb: 'rgb(148, 163, 184)', // #94a3b8
  },
  accent: {
    DEFAULT: 'rgb(167, 139, 250)', // #a78bfa
    hover: 'rgb(139, 92, 246)', // #8b5cf6
    foreground: 'rgb(255, 255, 255)', // #ffffff
    rgb: 'rgb(167, 139, 250)', // #a78bfa
  },
  success: {
    DEFAULT: 'rgb(74, 222, 128)', // #4ade80
    hover: 'rgb(34, 197, 94)', // #22c55e
    foreground: 'rgb(255, 255, 255)', // #ffffff
    rgb: 'rgb(74, 222, 128)', // #4ade80
  },
  warning: {
    DEFAULT: 'rgb(251, 191, 36)', // #fbbf24
    hover: 'rgb(245, 158, 11)', // #f59e0b
    foreground: 'rgb(0, 0, 0)', // #000000
    rgb: 'rgb(251, 191, 36)', // #fbbf24
  },
  error: {
    DEFAULT: 'rgb(248, 113, 113)', // #f87171
    hover: 'rgb(239, 68, 68)', // #ef4444
    foreground: 'rgb(255, 255, 255)', // #ffffff
    rgb: 'rgb(248, 113, 113)', // #f87171
  },
  info: {
    DEFAULT: 'rgb(96, 165, 250)', // #60a5fa
    foreground: 'rgb(255, 255, 255)', // #ffffff
    rgb: 'rgb(96, 165, 250)', // #60a5fa
  },
} as const;

// ========== 背景和表面颜色 ==========
export const BACKGROUNDS = {
  background: 'rgb(17, 24, 39)', // #111827
  surface: 'rgb(31, 41, 55)', // #1f2937
  surfaceLight: 'rgb(55, 65, 81)', // #374151
  surfaceHover: 'rgb(75, 85, 99)', // #4b5563
  card: 'rgb(31, 41, 55)', // #1f2937
  cardHover: 'rgb(55, 65, 81)', // #374151
} as const;

// ========== 文本颜色 ==========
export const TEXT = {
  primary: 'rgb(243, 244, 246)', // #f3f4f6
  secondary: 'rgb(209, 213, 219)', // #d1d5db
  muted: 'rgb(156, 163, 175)', // #9ca3af
} as const;

// ========== 边框颜色 ==========
export const BORDERS = {
  DEFAULT: 'rgb(55, 65, 81)', // #374151
  light: 'rgb(75, 85, 99)', // #4b5563
  input: 'rgb(75, 85, 99)', // #4b5563
  ring: 'rgb(96, 165, 250)', // #60a5fa
} as const;

// ========== 状态颜色（用于状态徽章等） ==========
export const STATUS_COLORS = {
  // 待处理
  pending: {
    bgcolor: 'rgb(241, 245, 249)', // #f1f5f9
    color: 'rgb(71, 85, 105)', // #475569
  },
  // 进行中
  inProgress: {
    bgcolor: 'rgb(219, 234, 254)', // #dbeafe
    color: 'rgb(29, 78, 216)', // #1d4ed8
  },
  // 完成
  completed: {
    bgcolor: 'rgb(220, 252, 231)', // #dcfce7
    color: 'rgb(21, 128, 61)', // #15803d
  },
  // 失败
  failed: {
    bgcolor: 'rgb(254, 226, 226)', // #fee2e2
    color: 'rgb(185, 28, 28)', // #b91c1c
  },
  // 警告
  warning: {
    bgcolor: 'rgb(254, 243, 199)', // #fef3c7
    color: 'rgb(180, 83, 9)', // #b45309
  },
} as const;

// ========== 渐变色 ==========
export const GRADIENTS = {
  primary: 'linear-gradient(to right, rgb(96, 165, 250), rgb(167, 139, 250), rgb(244, 114, 182))',
  hero: 'linear-gradient(to right, rgb(59, 130, 246), rgb(147, 51, 234))',
  accent: 'linear-gradient(135deg, rgb(167, 139, 250), rgb(96, 165, 250))',
  success: 'linear-gradient(135deg, rgb(74, 222, 128), rgb(34, 197, 94))',
} as const;

// ========== 侧边栏颜色 ==========
export const SIDEBAR = {
  active: {
    color: 'rgb(96, 165, 250)', // #60a5fa
    bgcolor: 'rgb(239, 68, 68)', // 活动项背景色（红色）
  },
  default: {
    color: 'rgb(209, 213, 219)', // #d1d5db
    bgcolor: 'rgb(17, 24, 39)', // #111827
    hover: {
      color: 'rgb(243, 244, 246)', // #f3f4f6
      bgcolor: 'rgba(255, 255, 255, 0.05)',
    },
  },
} as const;

// ========== 辅助函数 ==========

/**
 * 获取状态颜色配置
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
    statusLower.includes('待处理') ||
    statusLower === 'pending' ||
    statusLower === 'waiting'
  ) {
    return STATUS_COLORS.pending;
  }

  if (statusLower.includes('警告') || statusLower.includes('警告') || statusLower === 'warning') {
    return STATUS_COLORS.warning;
  }

  return STATUS_COLORS.pending;
}

/**
 * 获取 MUI sx prop 格式的状态颜色
 */
export function getStatusSxProps(status?: string) {
  const config = getStatusColorConfig(status);
  return {
    bgcolor: config.bgcolor,
    color: config.color,
  };
}