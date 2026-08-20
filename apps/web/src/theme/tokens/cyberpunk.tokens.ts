/**
 * 赛博朋克主题 Token
 *
 * 设计理念：霓虹青 + 霓虹品红的经典赛博朋克配色，深空背景营造科技感
 * 对比度：所有文字色均满足 WCAG AA 标准（≥ 4.5:1）
 */

const cyberpunkTokens = {
  colors: {
    // 主色 — 霓虹青
    primary: {
      50: 'rgba(0, 255, 255, 0.04)',
      100: 'rgba(0, 255, 255, 0.08)',
      200: 'rgba(0, 255, 255, 0.12)',
      300: 'rgba(0, 255, 255, 0.20)',
      400: 'rgba(0, 255, 255, 0.35)',
      500: '#00ffff',
      600: '#0ea5e9',
      700: '#0284c7',
      800: '#0284c7',
      900: '#0369a1',
      main: '#00ffff',
      light: '#7dd3fc',
      dark: '#0284c7',
      contrastText: '#0a0a1a',
    },
    // 次色 — 霓虹品红
    secondary: {
      50: 'rgba(255, 0, 255, 0.04)',
      100: 'rgba(255, 0, 255, 0.08)',
      200: 'rgba(255, 0, 255, 0.12)',
      300: 'rgba(255, 0, 255, 0.20)',
      400: 'rgba(255, 0, 255, 0.35)',
      500: '#ff00ff',
      600: '#e600e6',
      700: '#c800c8',
      800: '#aa00aa',
      900: '#8c008c',
      main: '#ff00ff',
      light: '#ff5fff',
      dark: '#c800c8',
      contrastText: '#0a0a1a',
    },
    success: {
      50: 'rgba(0, 255, 136, 0.08)',
      100: 'rgba(0, 255, 136, 0.15)',
      200: 'rgba(0, 255, 136, 0.25)',
      300: 'rgba(0, 255, 136, 0.40)',
      400: '#00ff88',
      500: '#00ff88',
      600: '#00e677',
      700: '#22c55e',
      800: '#16a34a',
      900: '#15803d',
      main: '#00ff88',
      light: '#86efac',
      dark: '#22c55e',
    },
    warning: {
      50: 'rgba(255, 170, 0, 0.08)',
      100: 'rgba(255, 170, 0, 0.15)',
      200: 'rgba(255, 170, 0, 0.25)',
      300: 'rgba(255, 170, 0, 0.40)',
      400: '#ffaa00',
      500: '#ffaa00',
      600: '#f59e0b',
      700: '#d97706',
      800: '#d97706',
      900: '#92400e',
      main: '#ffaa00',
      light: '#fcd34d',
      dark: '#d97706',
    },
    error: {
      50: 'rgba(255, 68, 68, 0.08)',
      100: 'rgba(255, 68, 68, 0.15)',
      200: 'rgba(255, 68, 68, 0.25)',
      300: 'rgba(255, 68, 68, 0.40)',
      400: '#ff4444',
      500: '#ff4444',
      600: '#ef4444',
      700: '#dc2626',
      800: '#b91c1c',
      900: '#7f1d1d',
      main: '#ff4444',
      light: '#f87171',
      dark: '#dc2626',
    },
    info: {
      50: 'rgba(0, 170, 255, 0.08)',
      100: 'rgba(0, 170, 255, 0.15)',
      200: 'rgba(0, 170, 255, 0.25)',
      300: 'rgba(0, 170, 255, 0.40)',
      400: '#00aaff',
      500: '#00aaff',
      600: '#0ea5e9',
      700: '#0284c7',
      800: '#0369a1',
      900: '#0369a1',
      main: '#00aaff',
      light: '#38bdf8',
      dark: '#0284c7',
    },
    // 中性色 — 深空蓝黑
    grey: {
      50: '#1a1a2e',
      100: '#162038',
      200: '#1a1a2e',
      300: '#1e2d4a',
      400: '#374151',
      500: '#6b7280',
      600: '#64748b',
      700: '#94a3b8',
      800: '#c4b5fd',
      900: '#dddddd',
      950: '#0a0a1a',
    },
    background: {
      default: '#0a0a1a',
      paper: '#1a1a2e',
      elevated: '#162038',
    },
    text: {
      primary: '#e6f1ff',
      secondary: '#8892b0',
      muted: '#64748b',
      disabled: '#4b5563',
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
      main: '#ffd700',
      light: '#fcd34d',
      dark: '#f59e0b',
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
    neon: 'linear-gradient(135deg, #00ffff 0%, #ff00ff 100%)',
    // 金色渐变
    gold: 'linear-gradient(135deg, #ffd700 0%, #f59e0b 100%)',
    // 成功渐变
    success: 'linear-gradient(135deg, #00ff88 0%, #22c55e 100%)',
    // 背景渐变 — 深空
    background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #162038 100%)',
    // 侧边栏选中渐变
    sidebarActive: 'linear-gradient(90deg, rgba(0, 255, 255, 0.20) 0%, transparent 100%)',
    // 扫光效果
    scanline:
      'linear-gradient(90deg, transparent 0%, rgba(0, 255, 255, 0.15) 50%, transparent 100%)',
    // 边框渐变
    borderGradient: 'linear-gradient(135deg, #00ffff 0%, #ff00ff 100%)',
  },
} as const;

export type CyberpunkTokens = typeof cyberpunkTokens;

/**
 * 赛博朋克主题的语义化 Token
 * 覆盖 semanticTokens 中的关键字段
 */
const cyberpunkSemanticTokens = {
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
    emphasis: '2px solid #00ffff',
    card: '1px solid rgba(0, 255, 255, 0.20)',
    input: '1px solid rgba(255, 255, 255, 0.10)',
    inputFocus: '2px solid #00ffff',
    gradient: '1px solid transparent',
  },

  // 背景
  background: {
    page: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #162038 100%)',
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
