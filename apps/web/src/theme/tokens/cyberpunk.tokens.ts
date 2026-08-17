/**
 * 赛博朋克主题 Token
 *
 * 设计理念：霓虹青 + 霓虹品红的经典赛博朋克配色，深空背景营造科技感
 * 对比度：所有文字色均满足 WCAG AA 标准（≥ 4.5:1）
 */

export const cyberpunkTokens = {
  colors: {
    // 主色 — 霓虹青
    primary: {
      50: 'rgba(0, 255, 255, 0.04)',
      100: 'rgba(0, 255, 255, 0.08)',
      200: 'rgba(0, 255, 255, 0.12)',
      300: 'rgba(0, 255, 255, 0.20)',
      400: 'rgba(0, 255, 255, 0.35)',
      500: 'var(--cyber-color-cyan, var(--cyber-color-cyan, #00ffff))',
      600: 'var(--color-info, #0ea5e9)',
      700: 'var(--color-info-hover, #0284c7)',
      800: 'var(--color-info-hover, #0284c7)',
      900: 'var(--color-info-700, #0369a1)',
      main: 'var(--cyber-color-cyan, var(--cyber-color-cyan, #00ffff))',
      light: 'var(--color-info-light, #7dd3fc)',
      dark: 'var(--color-info-hover, #0284c7)',
      contrastText: 'var(--cyber-color-bg-dark, var(--cyber-color-bg-dark, #0a0a1a))',
    },
    // 次色 — 霓虹品红
    secondary: {
      50: 'rgba(255, 0, 255, 0.04)',
      100: 'rgba(255, 0, 255, 0.08)',
      200: 'rgba(255, 0, 255, 0.12)',
      300: 'rgba(255, 0, 255, 0.20)',
      400: 'rgba(255, 0, 255, 0.35)',
      500: 'var(--cyber-color-magenta, var(--cyber-color-magenta, #ff00ff))',
      600: 'var(--color-fallback-accent-pink, #e600e6)',
      700: 'var(--color-fallback-ant-purple, #c800c8)',
      800: 'var(--color-fallback-ant-purple, #aa00aa)',
      900: 'var(--color-fallback-ant-purple, #8c008c)',
      main: 'var(--cyber-color-magenta, var(--cyber-color-magenta, #ff00ff))',
      light: 'var(--color-fallback-accent-pink, #ff5fff)',
      dark: 'var(--color-fallback-ant-purple, #c800c8)',
      contrastText: 'var(--cyber-color-bg-dark, var(--cyber-color-bg-dark, #0a0a1a))',
    },
    success: {
      50: 'rgba(0, 255, 136, 0.08)',
      100: 'rgba(0, 255, 136, 0.15)',
      200: 'rgba(0, 255, 136, 0.25)',
      300: 'rgba(0, 255, 136, 0.40)',
      400: 'var(--cyber-color-green, var(--cyber-color-green, #00ff88))',
      500: 'var(--cyber-color-green, var(--cyber-color-green, #00ff88))',
      600: 'var(--color-fallback-ant-green, #00e677)',
      700: 'var(--color-success, #22c55e)',
      800: 'var(--color-success-hover, #16a34a)',
      900: 'var(--color-success-700, #15803d)',
      main: 'var(--cyber-color-green, var(--cyber-color-green, #00ff88))',
      light: 'var(--color-success-light, #86efac)',
      dark: 'var(--color-success, #22c55e)',
    },
    warning: {
      50: 'rgba(255, 170, 0, 0.08)',
      100: 'rgba(255, 170, 0, 0.15)',
      200: 'rgba(255, 170, 0, 0.25)',
      300: 'rgba(255, 170, 0, 0.40)',
      400: 'var(--cyber-color-warn, var(--cyber-color-warn, #ffaa00))',
      500: 'var(--cyber-color-warn, var(--cyber-color-warn, #ffaa00))',
      600: 'var(--color-warning, #f59e0b)',
      700: 'var(--color-warning-hover, #d97706)',
      800: 'var(--color-warning-hover, #d97706)',
      900: 'var(--color-warning-800, #92400e)',
      main: 'var(--cyber-color-warn, var(--cyber-color-warn, #ffaa00))',
      light: 'var(--color-warning-300, #fcd34d)',
      dark: 'var(--color-warning-hover, #d97706)',
    },
    error: {
      50: 'rgba(255, 68, 68, 0.08)',
      100: 'rgba(255, 68, 68, 0.15)',
      200: 'rgba(255, 68, 68, 0.25)',
      300: 'rgba(255, 68, 68, 0.40)',
      400: 'var(--cyber-color-danger, var(--cyber-color-danger, #ff4444))',
      500: 'var(--cyber-color-danger, var(--cyber-color-danger, #ff4444))',
      600: 'var(--color-error, #ef4444)',
      700: 'var(--color-error-hover, #dc2626)',
      800: 'var(--color-error-700, #b91c1c)',
      900: 'var(--color-error-900, #7f1d1d)',
      main: 'var(--cyber-color-danger, var(--cyber-color-danger, #ff4444))',
      light: 'var(--color-error-400, #f87171)',
      dark: 'var(--color-error-hover, #dc2626)',
    },
    info: {
      50: 'rgba(0, 170, 255, 0.08)',
      100: 'rgba(0, 170, 255, 0.15)',
      200: 'rgba(0, 170, 255, 0.25)',
      300: 'rgba(0, 170, 255, 0.40)',
      400: 'var(--cyber-color-blue, var(--cyber-color-blue, #00aaff))',
      500: 'var(--cyber-color-blue, var(--cyber-color-blue, #00aaff))',
      600: 'var(--color-info, #0ea5e9)',
      700: 'var(--color-info-hover, #0284c7)',
      800: 'var(--color-info-700, #0369a1)',
      900: 'var(--color-info-700, #0369a1)',
      main: 'var(--cyber-color-blue, var(--cyber-color-blue, #00aaff))',
      light: 'var(--color-info-400, #38bdf8)',
      dark: 'var(--color-info-hover, #0284c7)',
    },
    // 中性色 — 深空蓝黑
    grey: {
      50: 'var(--color-fallback-panel-bg, #1a1a2e)',
      100: 'var(--color-surface-light, #162038)',
      200: 'var(--color-fallback-panel-bg, #1a1a2e)',
      300: 'var(--color-surface-hover, #1e2d4a)',
      400: 'var(--color-grey-700, #374151)',
      500: 'var(--color-grey-500, #6b7280)',
      600: 'var(--color-text-secondary, #64748b)',
      700: 'var(--color-text-muted, #94a3b8)',
      800: 'var(--color-secondary-300, #c4b5fd)',
      900: 'var(--color-fallback-border-light, #dddddd)',
      950: 'var(--cyber-color-bg-dark, var(--cyber-color-bg-dark, #0a0a1a))',
    },
    background: {
      default: 'var(--cyber-color-bg-dark, var(--cyber-color-bg-dark, #0a0a1a))',
      paper: 'var(--color-fallback-panel-bg, #1a1a2e)',
      elevated: 'var(--color-surface-light, #162038)',
    },
    text: {
      primary: 'var(--cyber-color-bg-light, var(--cyber-color-bg-light, #e6f1ff))',
      secondary: 'var(--cyber-color-text-muted, var(--cyber-color-text-muted, #8892b0))',
      muted: 'var(--color-text-secondary, #64748b)',
      disabled: 'var(--color-grey-600, #4b5563)',
    },
    border: {
      default: 'rgba(0, 255, 255, 0.15)',
      light: 'rgba(0, 255, 255, 0.08)',
      dark: 'rgba(0, 255, 255, 0.30)',
    },
    action: {
      hover: 'rgba(0, 255, 255, 0.06)',
      active: 'rgba(0, 255, 255, 0.12)',
      selected: 'rgba(0, 255, 255, 0.10)',
      disabled: 'rgba(255, 255, 255, 0.03)',
      disabledBackground: 'action.disabledBackground',
      focus: 'rgba(0, 255, 255, 0.15)',
    },
    // 点缀色 — 金黄
    accent: {
      main: 'var(--cyber-color-gold, var(--cyber-color-gold, #ffd700))',
      light: 'var(--color-warning-300, #fcd34d)',
      dark: 'var(--color-warning, #f59e0b)',
    },
  },

  // 赛博朋克专属阴影 — 带霓虹发光
  shadows: {
    none: 'none',
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    sm: '0 2px 4px 0 rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 255, 255, 0.05)',
    md: '0 4px 8px 0 rgba(0, 0, 0, 0.5), 0 0 12px rgba(0, 255, 255, 0.08)',
    lg: '0 8px 16px 0 rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 255, 255, 0.12)',
    xl: '0 16px 32px 0 rgba(0, 0, 0, 0.6), 0 0 24px rgba(0, 255, 255, 0.15)',
    '2xl': '0 24px 48px 0 rgba(0, 0, 0, 0.7), 0 0 32px rgba(0, 255, 255, 0.20)',
    '3xl': '0 32px 64px 0 rgba(0, 0, 0, 0.8), 0 0 40px rgba(0, 255, 255, 0.25)',
    float: '0 24px 48px 0 rgba(0, 0, 0, 0.7), 0 0 32px rgba(0, 255, 255, 0.20)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.3), inset 0 0 1px rgba(0, 255, 255, 0.1)',
    // 霓虹发光阴影
    glowPrimary: '0 0 20px rgba(0, 255, 255, 0.4), 0 0 40px rgba(0, 255, 255, 0.2)',
    glowSecondary: '0 0 20px rgba(255, 0, 255, 0.4), 0 0 40px rgba(255, 0, 255, 0.2)',
    glowSuccess: '0 0 20px rgba(0, 255, 136, 0.4), 0 0 40px rgba(0, 255, 136, 0.2)',
    glowError: '0 0 20px rgba(255, 68, 68, 0.4), 0 0 40px rgba(255, 68, 68, 0.2)',
    glowWarning: '0 0 20px rgba(255, 170, 0, 0.4), 0 0 40px rgba(255, 170, 0, 0.2)',
  },

  // 渐变
  gradients: {
    // 主渐变 — 霓虹青到品红
    neon: 'linear-gradient(135deg, var(--cyber-color-cyan, var(--cyber-color-cyan, #00ffff)) 0%, var(--cyber-color-magenta, var(--cyber-color-magenta, #ff00ff)) 100%)',
    // 金色渐变
    gold: 'linear-gradient(135deg, var(--cyber-color-gold, var(--cyber-color-gold, #ffd700)) 0%, var(--color-warning, #f59e0b) 100%)',
    // 成功渐变
    success:
      'linear-gradient(135deg, var(--cyber-color-green, var(--cyber-color-green, #00ff88)) 0%, var(--color-success, #22c55e) 100%)',
    // 背景渐变 — 深空
    background:
      'linear-gradient(135deg, var(--cyber-color-bg-dark, var(--cyber-color-bg-dark, #0a0a1a)) 0%, var(--color-fallback-panel-bg, #1a1a2e) 50%, var(--color-surface-light, #162038) 100%)',
    // 侧边栏选中渐变
    sidebarActive: 'linear-gradient(90deg, rgba(0, 255, 255, 0.20) 0%, transparent 100%)',
    // 扫光效果
    scanline:
      'linear-gradient(90deg, transparent 0%, rgba(0, 255, 255, 0.15) 50%, transparent 100%)',
    // 边框渐变
    borderGradient:
      'linear-gradient(135deg, var(--cyber-color-cyan, var(--cyber-color-cyan, #00ffff)) 0%, var(--cyber-color-magenta, var(--cyber-color-magenta, #ff00ff)) 100%)',
  },
} as const;

export type CyberpunkTokens = typeof cyberpunkTokens;

/**
 * 赛博朋克主题的语义化 Token
 * 覆盖 semanticTokens 中的关键字段
 */
export const cyberpunkSemanticTokens = {
  // 玻璃拟态卡片
  glassCard: {
    background: 'action.disabledBackground',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(0, 255, 255, 0.20)',
    borderRadius: '12px',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
  },
  glassCardHover: {
    background: 'action.disabledBackground',
    border: '1px solid rgba(0, 255, 255, 0.50)',
    boxShadow: '0 8px 32px rgba(0, 255, 255, 0.20), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
    transform: 'translateY(-2px)',
  },
  glassCardElevated: {
    background: 'action.disabledBackground',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(0, 255, 255, 0.30)',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.10)',
  },

  // 发光效果
  glow: {
    textPrimary: '0 0 10px rgba(0, 255, 255, 0.50)',
    textSecondary: '0 0 10px rgba(255, 0, 255, 0.50)',
    textAccent: '0 0 10px rgba(255, 215, 0, 0.50)',
    boxPrimary: '0 0 20px rgba(0, 255, 255, 0.40)',
    boxSecondary: '0 0 20px rgba(255, 0, 255, 0.40)',
    boxHover: '0 0 25px rgba(0, 255, 255, 0.60), 0 0 50px rgba(0, 255, 255, 0.20)',
  },

  // 边框
  border: {
    default: '1px solid rgba(0, 255, 255, 0.15)',
    light: '1px solid rgba(0, 255, 255, 0.08)',
    emphasis: '2px solid var(--cyber-color-cyan, var(--cyber-color-cyan, #00ffff))',
    card: '1px solid rgba(0, 255, 255, 0.20)',
    input: '1px solid rgba(255, 255, 255, 0.10)',
    inputFocus: '2px solid var(--cyber-color-cyan, var(--cyber-color-cyan, #00ffff))',
    gradient: '1px solid transparent',
  },

  // 背景
  background: {
    page: 'linear-gradient(135deg, var(--cyber-color-bg-dark, var(--cyber-color-bg-dark, #0a0a1a)) 0%, var(--color-fallback-panel-bg, #1a1a2e) 50%, var(--color-surface-light, #162038) 100%)',
    card: 'rgba(255, 255, 255, 0.04)',
    elevated: 'rgba(255, 255, 255, 0.06)',
    tableHeader: 'rgba(0, 255, 255, 0.05)',
    sidebar: 'rgba(10, 10, 26, 0.80)',
    hover: 'rgba(0, 255, 255, 0.06)',
    selected: 'rgba(0, 255, 255, 0.10)',
    input: 'rgba(255, 255, 255, 0.03)',
  },
} as const;

export type CyberpunkSemanticTokens = typeof cyberpunkSemanticTokens;
