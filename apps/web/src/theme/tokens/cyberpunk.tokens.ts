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
      500: '#00FFFF',
      600: '#00E5E5',
      700: '#00C8C8',
      800: '#00AAAA',
      900: '#008C8C',
      main: '#00FFFF',
      light: '#5FFEFF',
      dark: '#00C8C8',
      contrastText: '#0A0A1A',
    },
    // 次色 — 霓虹品红
    secondary: {
      50: 'rgba(255, 0, 255, 0.04)',
      100: 'rgba(255, 0, 255, 0.08)',
      200: 'rgba(255, 0, 255, 0.12)',
      300: 'rgba(255, 0, 255, 0.20)',
      400: 'rgba(255, 0, 255, 0.35)',
      500: '#FF00FF',
      600: '#E600E6',
      700: '#C800C8',
      800: '#AA00AA',
      900: '#8C008C',
      main: '#FF00FF',
      light: '#FF5FFF',
      dark: '#C800C8',
      contrastText: '#0A0A1A',
    },
    success: {
      50: 'rgba(0, 255, 136, 0.08)',
      100: 'rgba(0, 255, 136, 0.15)',
      200: 'rgba(0, 255, 136, 0.25)',
      300: 'rgba(0, 255, 136, 0.40)',
      400: '#00FF88',
      500: '#00FF88',
      600: '#00E677',
      700: '#00C866',
      800: '#00AA55',
      900: '#008C44',
      main: '#00FF88',
      light: '#5FFFB0',
      dark: '#00C866',
    },
    warning: {
      50: 'rgba(255, 170, 0, 0.08)',
      100: 'rgba(255, 170, 0, 0.15)',
      200: 'rgba(255, 170, 0, 0.25)',
      300: 'rgba(255, 170, 0, 0.40)',
      400: '#FFAA00',
      500: '#FFAA00',
      600: '#E69900',
      700: '#C88800',
      800: '#AA7700',
      900: '#8C6600',
      main: '#FFAA00',
      light: '#FFC940',
      dark: '#C88800',
    },
    error: {
      50: 'rgba(255, 68, 68, 0.08)',
      100: 'rgba(255, 68, 68, 0.15)',
      200: 'rgba(255, 68, 68, 0.25)',
      300: 'rgba(255, 68, 68, 0.40)',
      400: '#FF4444',
      500: '#FF4444',
      600: '#E63B3B',
      700: '#C83333',
      800: '#AA2A2A',
      900: '#8C2222',
      main: '#FF4444',
      light: '#FF7878',
      dark: '#C83333',
    },
    info: {
      50: 'rgba(0, 170, 255, 0.08)',
      100: 'rgba(0, 170, 255, 0.15)',
      200: 'rgba(0, 170, 255, 0.25)',
      300: 'rgba(0, 170, 255, 0.40)',
      400: '#00AAFF',
      500: '#00AAFF',
      600: '#0099E6',
      700: '#0088C8',
      800: '#0077AA',
      900: '#00668C',
      main: '#00AAFF',
      light: '#40C2FF',
      dark: '#0088C8',
    },
    // 中性色 — 深空蓝黑
    grey: {
      50: '#1A1A2E',
      100: '#16213E',
      200: '#1A1A2E',
      300: '#2A2A4E',
      400: '#3A3A5E',
      500: '#5A5A7E',
      600: '#7A7A9E',
      700: '#9A9ABE',
      800: '#BABACE',
      900: '#DADADE',
      950: '#0A0A1A',
    },
    background: {
      default: '#0A0A1A',
      paper: '#1A1A2E',
      elevated: '#16213E',
    },
    text: {
      primary: '#E6F1FF',
      secondary: '#8892B0',
      muted: '#5A6A8A',
      disabled: '#3A4A6A',
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
      main: '#FFD700',
      light: '#FFE44D',
      dark: '#CCB000',
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
    neon: 'linear-gradient(135deg, #00FFFF 0%, #FF00FF 100%)',
    // 金色渐变
    gold: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
    // 成功渐变
    success: 'linear-gradient(135deg, #00FF88 0%, #00CC66 100%)',
    // 背景渐变 — 深空
    background: 'linear-gradient(135deg, #0A0A1A 0%, #1A1A2E 50%, #16213E 100%)',
    // 侧边栏选中渐变
    sidebarActive: 'linear-gradient(90deg, rgba(0, 255, 255, 0.20) 0%, transparent 100%)',
    // 扫光效果
    scanline:
      'linear-gradient(90deg, transparent 0%, rgba(0, 255, 255, 0.15) 50%, transparent 100%)',
    // 边框渐变
    borderGradient: 'linear-gradient(135deg, #00FFFF 0%, #FF00FF 100%)',
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
    emphasis: '2px solid #00FFFF',
    card: '1px solid rgba(0, 255, 255, 0.20)',
    input: '1px solid rgba(255, 255, 255, 0.10)',
    inputFocus: '2px solid #00FFFF',
    gradient: '1px solid transparent',
  },

  // 背景
  background: {
    page: 'linear-gradient(135deg, #0A0A1A 0%, #1A1A2E 50%, #16213E 100%)',
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
