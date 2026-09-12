export const designTokens = {
  colors: {
    common: {
      white: '#ffffff',
      black: '#000000',
    },
    brand: {
      /** Cobalt-indigo primary scale from design demo */
      primary: {
        50: '#eef4ff',
        100: '#e0ebff',
        200: '#c7daff',
        300: '#a4c2fc',
        400: '#769cf5',
        500: '#4f78ed',
        600: '#365ae3',
        700: '#2a46c2',
        800: '#263b9e',
        900: '#24357d',
      },
      /** Warm slate neutral scale */
      neutral: {
        0: '#ffffff',
        50: '#f8fafc',
        100: '#f1f5f9',
        150: '#e9eef4',
        200: '#e2e8f0',
        300: '#cbd5e1',
        400: '#94a3b8',
        500: '#64748b',
        600: '#475569',
        700: '#334155',
        800: '#1e293b',
        850: '#172033',
        900: '#0f172a',
        950: '#020617',
      },
      /** Semantic aliases aligned with design demo */
      semantic: {
        background: '#ffffff',
        foreground: '#0f172a',
        card: '#ffffff',
        cardForeground: '#0f172a',
        cardMuted: '#f8fafc',
        popover: '#ffffff',
        popoverForeground: '#0f172a',
        primary: '#365ae3',
        primaryForeground: '#ffffff',
        primarySubtle: '#eef4ff',
        muted: '#f1f5f9',
        mutedForeground: '#64748b',
        border: '#e2e8f0',
        borderSubtle: '#e9eef4',
        input: '#e2e8f0',
        ring: '#769cf5',
        overlay: 'rgba(15, 23, 42, 0.48)',
        backdrop: 'rgba(15, 23, 42, 0.24)',
      },
    },
    primary: {
      50: '#eef4ff',
      100: '#e0ebff',
      200: '#c7daff',
      300: '#a4c2fc',
      400: '#769cf5',
      500: '#4f78ed',
      600: '#365ae3',
      700: '#2a46c2',
      800: '#263b9e',
      900: '#24357d',
      main: '#365ae3',
      light: '#769cf5',
      dark: '#365ae3',
      contrastText: '#ffffff',
    },
    secondary: {
      50: '#f5f3ff',
      100: '#ede9fe',
      200: '#ddd6fe',
      300: '#c4b5fd',
      400: '#a78bfa',
      500: '#8b5cf6',
      600: '#7c3aed',
      700: '#6d28d9',
      800: '#5b21b6',
      900: '#4c1d95',
      main: '#8b5cf6',
      light: '#a78bfa',
      dark: '#7c3aed',
      contrastText: '#ffffff',
    },
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
      main: '#22c55e',
      light: '#86efac',
      dark: '#16a34a',
    },
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
      main: '#f59e0b',
      light: '#fde68a',
      dark: '#d97706',
    },
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
      main: '#ef4444',
      light: '#fca5a5',
      dark: '#dc2626',
    },
    info: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
      main: '#0ea5e9',
      light: '#7dd3fc',
      dark: '#0284c7',
    },
    grey: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
      950: '#020617',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
      elevated: '#ffffff',
    },
    surface: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
    },
    text: {
      primary: '#0f172a',
      secondary: '#64748b',
      muted: '#94a3b8',
      disabled: '#cbd5e1',
    },
    border: {
      default: '#e2e8f0',
      light: '#f1f5f9',
      dark: '#cbd5e1',
    },
    action: {
      hover: '#f1f5f9',
      active: '#e2e8f0',
      selected: '#eef4ff',
      disabled: '#f1f5f9',
      disabledBackground: '#f8fafc',
      focus: '#e0ebff',
    },
    orange: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#f97316',
      600: '#ea580c',
      700: '#c2410c',
      800: '#9a3412',
      900: '#7c2d12',
      main: '#f97316',
      light: '#fb923c',
      dark: '#ea580c',
    },
    yellow: {
      50: '#fefce8',
      100: '#fef9c3',
      200: '#fef08a',
      300: '#fde047',
      400: '#facc15',
      500: '#eab308',
      600: '#ca8a04',
      700: '#a16207',
      800: '#854d0e',
      900: '#713f12',
      main: '#eab308',
      light: '#fde047',
      dark: '#ca8a04',
    },
    blue: {
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
      main: '#3b82f6',
      light: '#60a5fa',
      dark: '#2563eb',
    },
    cyan: {
      50: '#ecfeff',
      100: '#cffafe',
      200: '#a5f3fc',
      300: '#67e8f9',
      400: '#22d3ee',
      500: '#06b6d4',
      600: '#0891b2',
      700: '#0e7490',
      800: '#155e75',
      900: '#164e63',
      main: '#06b6d4',
      light: '#22d3ee',
      dark: '#0891b2',
    },
    purple: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7',
      600: '#9333ea',
      700: '#7e22ce',
      800: '#6b21a8',
      900: '#581c87',
      main: '#a855f7',
      light: '#c084fc',
      dark: '#9333ea',
    },
    teal: {
      50: '#f0fdfa',
      100: '#ccfbf1',
      200: '#99f6e4',
      300: '#5eead4',
      400: '#2dd4bf',
      500: '#14b8a6',
      600: '#0d9488',
      700: '#0f766e',
      800: '#115e59',
      900: '#134e4a',
      main: '#14b8a6',
      light: '#2dd4bf',
      dark: '#0d9488',
    },
    pink: {
      50: '#fdf2f8',
      100: '#fce7f3',
      200: '#fbcfe8',
      300: '#f9a8d4',
      400: '#f472b6',
      500: '#ec4899',
      600: '#db2777',
      700: '#be185d',
      800: '#9d174d',
      900: '#831843',
      main: '#ec4899',
      light: '#f472b6',
      dark: '#db2777',
    },

    // ─── Cyber 霓虹色系 · V212-C1 扩展 ────────────────
    // 赛博朋克风荧光色板，为 AI 面板 / 实时看板 / 状态徽标提供统一入口
    neon: {
      cyan: {
        50: '#ecfeff',
        100: '#cffafe',
        200: '#a5f3fc',
        300: '#22d3ee',
        400: '#06b6d4',
        500: '#0891b2',
        glow: 'rgba(34, 211, 238, 0.55)',
      },
      magenta: {
        50: '#fdf4ff',
        100: '#fae8ff',
        200: '#f5d0fe',
        300: '#e879f9',
        400: '#d946ef',
        500: '#c026d3',
        glow: 'rgba(232, 121, 249, 0.55)',
      },
      yellow: {
        50: '#fefce8',
        100: '#fef9c3',
        200: '#fef08a',
        300: '#fde047',
        400: '#facc15',
        500: '#eab308',
        glow: 'rgba(253, 224, 71, 0.55)',
      },
      lime: {
        300: '#bef264',
        400: '#a3e635',
        500: '#84cc16',
        glow: 'rgba(190, 242, 100, 0.5)',
      },
      red: {
        300: '#fb7185',
        400: '#f43f5e',
        500: '#e11d48',
        glow: 'rgba(244, 63, 94, 0.5)',
      },
    },

    // Cyber 玻璃态 & 金属底调色板
    cyber: {
      /** 深色玻璃底色 */
      glass: {
        bg: 'rgba(15, 23, 42, 0.65)',
        bgHeavy: 'rgba(15, 23, 42, 0.82)',
        bgLight: 'rgba(255, 255, 255, 0.06)',
        border: 'rgba(148, 163, 184, 0.22)',
        divider: 'rgba(148, 163, 184, 0.18)',
      },
      /** 网格 / 等距底纹背景 */
      grid: {
        line: 'rgba(148, 163, 184, 0.12)',
        lineHeavy: 'rgba(59, 130, 246, 0.25)',
        accentCross: 'rgba(34, 211, 238, 0.20)',
      },
      /** 金属渐变高光 */
      metal: {
        topLight: 'rgba(255, 255, 255, 0.10)',
        bottomShadow: 'rgba(0, 0, 0, 0.55)',
      },
      /** Cyber 渐变背景用 */
      gradients: {
        aurora:
          'linear-gradient(135deg, rgba(168, 85, 247, 0.18), rgba(34, 211, 238, 0.18) 45%, rgba(232, 121, 249, 0.14))',
        sunset:
          'linear-gradient(135deg, rgba(244, 63, 94, 0.22), rgba(251, 146, 60, 0.20))',
        ocean:
          'linear-gradient(135deg, rgba(6, 182, 212, 0.20), rgba(37, 99, 235, 0.22))',
        tech:
          'linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(59, 130, 246, 0.18))',
      },
    },
  },

  spacing: {
    none: 0,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
    /** 4px grid scale from design demo (numeric keys in px) */
    scale: {
      0: 0,
      1: 4,
      2: 8,
      3: 12,
      4: 16,
      5: 20,
      6: 24,
      7: 28,
      8: 32,
      9: 36,
      10: 40,
      11: 44,
      12: 48,
      14: 56,
      16: 64,
      20: 80,
      24: 96,
    },
  },

  borderRadius: {
    none: 0,
    xs: 4,
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 20,
    '3xl': 24,
    full: 9999,
  },

  shadows: {
    none: 'none',
    xs: '0 1px 2px 0 rgba(2, 6, 23, 0.04)',
    sm: '0 1px 3px 0 rgba(2, 6, 23, 0.04), 0 1px 2px -1px rgba(2, 6, 23, 0.04)',
    md: '0 4px 6px -1px rgba(2, 6, 23, 0.04), 0 2px 4px -2px rgba(2, 6, 23, 0.04)',
    lg: '0 10px 15px -3px rgba(2, 6, 23, 0.04), 0 4px 6px -4px rgba(2, 6, 23, 0.04)',
    xl: '0 20px 25px -5px rgba(2, 6, 23, 0.04), 0 8px 10px -6px rgba(2, 6, 23, 0.04)',
    '2xl': '0 25px 50px -12px rgba(2, 6, 23, 0.08)',
    float: '0 25px 50px -12px rgba(2, 6, 23, 0.08)',
    '3xl': '0 35px 60px -15px rgba(2, 6, 23, 0.12)',
    inner: 'inset 0 2px 4px 0 rgba(2, 6, 23, 0.04)',
    glow: '0 0 20px rgba(79, 120, 237, 0.15)',
  },

  // 暗色模式专用阴影（alpha 更高以在深色背景上可见）
  darkShadows: {
    none: 'none',
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.04), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.04), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.04), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.12)',
    float: '0 25px 50px -12px rgba(0, 0, 0, 0.12)',
    '3xl': '0 35px 60px -15px rgba(0, 0, 0, 0.18)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.04)',
    glow: '0 0 24px rgba(79, 120, 237, 0.25)',
  },

  // ─── Cyber 霓虹发光阴影 · V212-C1 扩展 ─────────────
  neonShadows: {
    none: 'none',
    /** 青色 Neon 辉光 · AI 成功态 / 健康态 */
    cyan: {
      sm: '0 0 12px rgba(34, 211, 238, 0.35)',
      md: '0 0 22px rgba(34, 211, 238, 0.50), 0 0 6px rgba(34, 211, 238, 0.65)',
      lg: '0 0 36px rgba(34, 211, 238, 0.55), 0 0 10px rgba(34, 211, 238, 0.70)',
    },
    /** 品红 Neon 辉光 · AI 智能态 / 强调态 */
    magenta: {
      sm: '0 0 12px rgba(232, 121, 249, 0.35)',
      md: '0 0 22px rgba(232, 121, 249, 0.50), 0 0 6px rgba(232, 121, 249, 0.65)',
      lg: '0 0 36px rgba(232, 121, 249, 0.55), 0 0 10px rgba(232, 121, 249, 0.70)',
    },
    /** 黄色 Neon 辉光 · 警告 / 运行中态 */
    yellow: {
      sm: '0 0 12px rgba(253, 224, 71, 0.35)',
      md: '0 0 22px rgba(253, 224, 71, 0.50), 0 0 6px rgba(253, 224, 71, 0.65)',
    },
    /** 绿色 Neon 辉光 · 在线 / 成功态 */
    green: {
      sm: '0 0 10px rgba(190, 242, 100, 0.45)',
      md: '0 0 20px rgba(190, 242, 100, 0.55)',
    },
    /** 红色 Neon 辉光 · 错误 / 离线态 */
    red: {
      sm: '0 0 10px rgba(244, 63, 94, 0.45)',
      md: '0 0 20px rgba(244, 63, 94, 0.60)',
    },
  },

  motion: {
    duration: {
      instant: '0ms',
      fast: '150ms',
      normal: '200ms',
      slow: '300ms',
      deliberate: '500ms',
      skeleton: '2000ms',
    },
    easing: {
      default: 'cubic-bezier(0.4, 0, 0.2, 1)', // Material standard
      decelerate: 'cubic-bezier(0, 0, 0.2, 1)', // Enter
      accelerate: 'cubic-bezier(0.4, 0, 1, 1)', // Exit
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)', // Shared axis
      bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
    transition: {
      fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
      base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
      slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
      bounce: '300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
  } as const,

  typography: {
    fontFamily:
      '"Inter", "Noto Sans SC", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem',
      '6xl': '3.75rem',
      /** 历史代码兼容用精确 rem 尺寸（逐步收敛到语义化 token） */
      scale: {
        '0.55rem': '0.55rem',
        '0.6rem': '0.6rem',
        '0.625rem': '0.625rem',
        '0.65rem': '0.65rem',
        '0.6875rem': '0.6875rem',
        '0.7rem': '0.7rem',
        '0.75rem': '0.75rem',
        '0.8rem': '0.8rem',
        '0.8125rem': '0.8125rem',
        '0.85rem': '0.85rem',
        '0.875rem': '0.875rem',
        '0.9rem': '0.9rem',
        '0.9375rem': '0.9375rem',
        '0.95rem': '0.95rem',
        '1rem': '1rem',
        '1.1rem': '1.1rem',
        '1.125rem': '1.125rem',
        '1.25rem': '1.25rem',
        '1.5rem': '1.5rem',
        '1.875rem': '1.875rem',
        '2rem': '2rem',
        '2.5rem': '2.5rem',
        '3.75rem': '3.75rem',
      } as Record<string, string>,
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
      xs: '1rem',
      sm: '1.25rem',
      base: '1.5rem',
      lg: '1.75rem',
      xl: '1.75rem',
      '2xl': '2rem',
      '3xl': '2.25rem',
    },
    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0em',
      wide: '0.025em',
      wider: '0.05em',
    },
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.025em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '-0.025em',
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '0.875rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    caption: {
      fontSize: '0.75rem',
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: '0.025em',
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.5,
      letterSpacing: '0.025em',
      textTransform: 'none',
    },
    overline: {
      fontSize: '0.75rem',
      fontWeight: 600,
      lineHeight: 1.5,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
    },
  },

  zIndex: {
    mobileStepper: 1000,
    snackbar: 1100,
    tooltip: 1200,
    appBar: 1300,
    drawer: 1400,
    modal: 1500,
    popover: 1600,
    snackbarContent: 1700,
    tooltipContent: 1800,
    base: 0,
    dropdown: 100,
    sticky: 200,
    fixed: 300,
    popoverLayer: 400,
    tooltipLayer: 500,
    modalLayer: 600,
    toastLayer: 700,
  },

  transitions: {
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195,
    },
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    },
  },

  breakpoints: {
    values: {
      xs: 0,
      sm: 480,
      md: 640,
      lg: 768,
      xl: 1024,
      '2xl': 1280,
      '3xl': 1536,
      '4xl': 1920,
    },
  },
};

export type DesignTokens = typeof designTokens;

// ============================================================
// 语义化 Token 层（Semantic Tokens）
// 将基础设计值映射到具体场景，作为组件和页面开发的唯一入口
// 修改主题时只需更新此层，无需逐组件搜索替换
// ============================================================

export const semanticTokens = {
  /** 间距语义 — 描述"在做什么"而非"是多少 px" */
  space: {
    /** 页面级外边距 */
    page: {
      horizontal: '24px',
      vertical: '24px',
      sectionGap: '32px',
    },
    /** 卡片内部间距 */
    card: {
      padding: '20px',
      paddingDense: '12px',
      gap: '16px',
      headerGap: '8px',
    },
    /** 表单元素间距 */
    form: {
      fieldGap: '16px',
      groupGap: '24px',
      labelGap: '4px',
      helperGap: '2px',
    },
    /** 列表/表格间距 */
    list: {
      itemPadding: '12px 16px',
      itemGap: '2px',
      headerPadding: '12px 16px',
      sectionGap: '16px',
    },
    /** 弹出层间距 */
    overlay: {
      padding: '24px',
      headerPadding: '16px 24px',
      bodyPadding: '24px',
      footerPadding: '16px 24px',
    },
    /** 侧边栏间距 */
    sidebar: {
      itemPadding: '10px 16px',
      groupGap: '4px',
      sectionGap: '8px',
    },
  },

  /** 排版语义 — 按层级和使用场景映射 */
  text: {
    heading: {
      /** 页面主标题 h1 */
      '1': { ...designTokens.typography.h1, color: designTokens.colors.text.primary },
      /** 区域标题 h2 */
      '2': { ...designTokens.typography.h2, color: designTokens.colors.text.primary },
      /** 卡片标题 h3 */
      '3': { ...designTokens.typography.h3, color: designTokens.colors.text.primary },
      /** 子区块标题 h4 */
      '4': { ...designTokens.typography.h4, color: designTokens.colors.text.primary },
      /** 小节标题 h5 */
      '5': { ...designTokens.typography.h5, color: designTokens.colors.text.primary },
      /** 标签/分类标题 h6 */
      '6': { ...designTokens.typography.h6, color: designTokens.colors.text.secondary },
    },
    body: {
      /** 默认正文 */
      default: { ...designTokens.typography.body1, color: designTokens.colors.text.primary },
      /** 次要正文（表格、列表项） */
      secondary: { ...designTokens.typography.body2, color: designTokens.colors.text.secondary },
      /** 辅助说明 */
      muted: { ...designTokens.typography.caption, color: designTokens.colors.text.muted },
    },
    /** 按钮文字 */
    button: { ...designTokens.typography.button },
    /** 标签/小字 */
    caption: { ...designTokens.typography.caption, color: designTokens.colors.text.muted },
    /** 大号标签 */
    overline: { ...designTokens.typography.overline, color: designTokens.colors.text.secondary },
  },

  /** 阴影/层级语义 — 描述"组件在什么层级" */
  elevation: {
    /** 平面内容（卡片、分割区域） */
    card: designTokens.shadows.sm,
    /** 可交互卡片悬停 */
    cardHover: designTokens.shadows.md,
    /** 下拉菜单、选择器弹出层 */
    dropdown: designTokens.shadows.lg,
    /** 模态对话框 */
    dialog: designTokens.shadows.xl,
    /** 悬浮提示 */
    tooltip: designTokens.shadows.sm,
    /** 命令面板、搜索弹窗 */
    commandPalette: designTokens.shadows['2xl'],
    /** 侧边抽屉 */
    drawer: designTokens.shadows.xl,
  },

  /** 圆角语义 */
  radius: {
    /** 小元素（Chip、Badge、Tag） */
    pill: designTokens.borderRadius.full,
    /** 按钮、输入框 */
    input: designTokens.borderRadius.md,
    /** 卡片容器 */
    card: designTokens.borderRadius.lg,
    /** 对话框、弹出层 */
    dialog: designTokens.borderRadius.xl,
    /** 小圆角（Tooltip、小 Tag） */
    small: designTokens.borderRadius.sm,
    /** 默认 */
    default: designTokens.borderRadius.md,
  },

  /** 层级语义 — z-index 按用途排列 */
  layer: {
    /** 页面内粘性元素 */
    sticky: 100,
    /** 下拉菜单 */
    dropdown: 200,
    /** 浮动面板（Popover、DatePicker） */
    popover: 300,
    /** 模态对话框遮罩 */
    modalOverlay: 400,
    /** 模态对话框内容 */
    modal: 500,
    /** 全局 Tooltip */
    tooltip: 600,
    /** 全局通知（Snackbar） */
    notification: 700,
    /** 全屏覆盖（Drawer、CommandPalette） */
    drawer: 800,
  },

  /** 边框语义 */
  border: {
    /** 默认分割线 */
    default: `1px solid ${designTokens.colors.border.default}`,
    /** 轻分割线（表格内） */
    light: `1px solid ${designTokens.colors.border.light}`,
    /** 强调边框（选中态） */
    emphasis: `2px solid ${designTokens.colors.primary.main}`,
    /** 卡片边框 */
    card: `1px solid ${designTokens.colors.border.default}`,
    /** 输入框边框 */
    input: `1px solid ${designTokens.colors.border.default}`,
    /** 输入框聚焦边框 */
    inputFocus: `2px solid ${designTokens.colors.primary.main}`,
  },

  /** 背景语义 */
  background: {
    /** 页面底色 */
    page: designTokens.colors.background.default,
    /** 卡片/面板底色 */
    card: designTokens.colors.background.paper,
    /** 悬浮层底色 */
    elevated: designTokens.colors.background.elevated,
    /** 表头底色 */
    tableHeader: designTokens.colors.grey[50],
    /** 侧边栏底色 */
    sidebar: designTokens.colors.background.paper,
    /** 输入框底色 */
    input: designTokens.colors.background.paper,
    /** 悬停态底色 */
    hover: designTokens.colors.action.hover,
    /** 选中态底色 */
    selected: designTokens.colors.action.selected,
    /** 禁用态底色 */
    disabled: designTokens.colors.action.disabledBackground,
    /** 暗色模式下的表格条纹背景 */
    tableStripe: 'rgba(255, 255, 255, 0.03)',
    /** 暗色模式下的 hover 背景 */
    hoverDark: 'rgba(255, 255, 255, 0.08)',
    /** 暗色模式下的 selected 背景 */
    selectedDark: 'rgba(59, 130, 246, 0.15)',
  },
  /** Dashboard 组件语义 Token */
  dashboard: {
    /** 统计卡片 */
    statCard: {
      padding: '20px',
      gap: '12px',
      iconSize: 40,
      iconBgRadius: '12px',
      valueFontSize: '28px',
      labelFontSize: '14px',
      trendFontSize: '12px',
    },
    /** 图表卡片 */
    chartCard: {
      padding: '20px',
      headerGap: '12px',
      chartHeight: 200,
      chartHeightLg: 300,
    },
    /** 快捷操作按钮 */
    quickAction: {
      gap: '12px',
      iconSize: 24,
    },
    /** 最近活动列表 */
    recentItem: {
      padding: '10px 0',
      gap: '12px',
      timestampFontSize: '12px',
    },
  },

  /** 侧边栏组件语义 Token */
  sidebar: {
    width: 240,
    collapsedWidth: 64,
    itemHeight: 40,
    itemGap: 2,
    groupTitle: {
      fontSize: 12,
      fontWeight: 600 as const,
      color: designTokens.colors.text.secondary,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
    },
    header: {
      height: 56,
      padding: '12px 16px',
      gap: '12px',
    },
    badge: {
      size: 16,
      fontSize: '0.625rem',
      fontWeight: 600 as const,
    },
    activeIndicator: {
      width: 3,
      color: designTokens.colors.primary.main,
      bgColor: designTokens.colors.primary[50],
      bgColorDark: 'rgba(59, 130, 246, 0.15)',
    },
  },

  /** 空状态组件语义 Token */
  emptyState: {
    padding: '48px 24px',
    iconSize: 64,
    titleFontSize: '16px',
    descriptionFontSize: '14px',
    actionGap: '12px',
    mutedColor: designTokens.colors.text.muted,
  },

  /** 表格组件语义 Token */
  table: {
    cellPadding: '12px 16px',
    headerBgColor: designTokens.colors.grey[50],
    headerBgColorDark: designTokens.colors.grey[800],
    headerFontWeight: designTokens.typography.fontWeight.semibold,
    rowHoverBg: designTokens.colors.action.hover,
    rowSelectedBg: designTokens.colors.action.selected,
    stripeBg: designTokens.colors.grey[50],
    stripeBgDark: 'rgba(255, 255, 255, 0.03)',
    denseCellPadding: '8px 16px',
  },

  /** 页面布局语义 Token */
  layout: {
    header: {
      height: 56,
      padding: '0 24px',
      gap: '16px',
    },
    content: {
      maxWidth: 1440,
      padding: '24px',
      gap: '24px',
    },
    breadcrumb: {
      fontSize: designTokens.typography.fontSize.sm,
      gap: 8,
    },
  },

  /** Brand visual effect tokens from design demo */
  brand: {
    /** Glassmorphism header / panel */
    glass: {
      background: 'rgba(255, 255, 255, 0.85)',
      backgroundDark: 'rgba(15, 23, 42, 0.80)',
      backdropFilter: 'blur(12px) saturate(140%)',
      border: 'rgba(226, 232, 240, 0.80)',
      borderDark: 'rgba(51, 65, 85, 0.60)',
    },
    /** Glow effects */
    glow: {
      primary: '0 0 20px rgba(79, 120, 237, 0.15)',
      primaryDark: '0 0 24px rgba(79, 120, 237, 0.25)',
      primaryStrong: '0 0 0 1px #e0ebff, 0 0 20px rgba(79, 120, 237, 0.15)',
      primaryStrongDark: '0 0 0 1px #2a46c2, 0 0 24px rgba(79, 120, 237, 0.25)',
    },
    /** Page background gradient */
    pageGradient: {
      light:
        'radial-gradient(ellipse at 10% 0%, rgba(79, 120, 237, 0.06) 0%, transparent 50%), radial-gradient(ellipse at 90% 10%, rgba(54, 90, 227, 0.05) 0%, transparent 45%), #ffffff',
      dark:
        'radial-gradient(ellipse at 10% 0%, rgba(79, 120, 237, 0.10) 0%, transparent 50%), radial-gradient(ellipse at 90% 10%, rgba(54, 90, 227, 0.08) 0%, transparent 45%), #020617',
    },
    /** Inner glow card overlay */
    innerGlow: {
      light: 'radial-gradient(circle at 50% 0%, rgba(79, 120, 237, 0.08), transparent 60%)',
      dark: 'radial-gradient(circle at 50% 0%, rgba(79, 120, 237, 0.12), transparent 60%)',
    },
    /** Gradient badge */
    gradientBadge: {
      light: 'linear-gradient(135deg, #eef4ff, rgba(224, 235, 255, 0.70))',
      dark: 'linear-gradient(135deg, rgba(36, 53, 125, 0.60), rgba(38, 59, 158, 0.40))',
      colorLight: '#2a46c2',
      colorDark: '#a4c2fc',
      borderLight: 'rgba(199, 218, 255, 0.60)',
      borderDark: 'rgba(42, 70, 194, 0.50)',
    },
    /** Tab underline gradient */
    tabUnderline: 'linear-gradient(90deg, #769cf5, #365ae3)',
    /** Active tab glow line */
    activeTabGlow: 'linear-gradient(90deg, transparent, #769cf5, transparent)',
    /** Focus ring */
    focusRing: '0 0 0 2px #ffffff, 0 0 0 4px #769cf5',
    focusRingDark: '0 0 0 2px #020617, 0 0 0 4px #769cf5',
  },

  // ─── Cyber 风格语义层 · V212-C1 扩展 ─────────────────
  // 为 AI 面板 / 实时看板 / 状态徽标等赛博视觉组件提供统一入口
  cyber: {
    /** AI 状态徽标 · 颜色语义 */
    status: {
      online: designTokens.colors.neon.lime[400],
      offline: designTokens.colors.neon.red[400],
      running: designTokens.colors.neon.cyan[300],
      warning: designTokens.colors.neon.yellow[300],
      error: designTokens.colors.neon.red[400],
      success: designTokens.colors.neon.lime[400],
      ai: designTokens.colors.neon.magenta[300],
    },
    /** AI 状态徽标 · 辉光阴影（使用 neonShadows.*） */
    statusGlow: {
      online: designTokens.neonShadows.green.md,
      offline: designTokens.neonShadows.red.md,
      running: designTokens.neonShadows.cyan.sm,
      warning: designTokens.neonShadows.yellow.sm,
      error: designTokens.neonShadows.red.md,
      success: designTokens.neonShadows.green.md,
      ai: designTokens.neonShadows.magenta.md,
    },
    /** 玻璃态面板容器样式值 */
    panel: {
      bg: designTokens.colors.cyber.glass.bg,
      bgHeavy: designTokens.colors.cyber.glass.bgHeavy,
      border: `1px solid ${designTokens.colors.cyber.glass.border}`,
      borderRadius: designTokens.borderRadius.lg,
      backdropFilter: 'blur(14px) saturate(140%)',
      padding: '20px',
      gap: '16px',
    },
    /** AI 对话气泡 */
    chatBubble: {
      user: {
        bg: designTokens.colors.cyber.gradients.ocean,
        text: '#ffffff',
        padding: '12px 16px',
        radius: designTokens.borderRadius.lg,
      },
      ai: {
        bg: designTokens.colors.cyber.gradients.aurora,
        text: '#ffffff',
        padding: '12px 16px',
        radius: designTokens.borderRadius.lg,
        glow: designTokens.neonShadows.magenta.sm,
      },
    },
    /** 主背景渐变（Dashboard / AI 大屏） */
    heroBackground: designTokens.colors.cyber.gradients.aurora,
  },

} as const;

export type SemanticTokens = typeof semanticTokens;

// ============================================================
// 组件 API 规范类型
// 所有自定义组件应遵循此接口模式，确保一致的 DX
// ============================================================

/** 标准尺寸枚举 — 全项目统一使用此类型 */
export type ComponentSize = 'sm' | 'md' | 'lg';

/** 标准样式扩展 — 所有组件应提供 sx prop */
export type StandardSxProp = import('@mui/material/styles').SxProps<import('@mui/material/styles').Theme>;

/**
 * 组件 API 规范检查清单
 *
 * 所有自定义组件应遵循以下规范：
 *
 * [x] sx?: SxProps<Theme> — 所有组件必须提供（禁止 any）
 * [x] size?: ComponentSize — 可交互组件应提供 ('sm' | 'md' | 'lg')
 * [x] disabled?: boolean — 可交互组件应提供
 * [x] loading?: boolean — 数据驱动组件应提供
 * [x] children?: ReactNode — 容器型组件应提供
 * [x] 事件签名 — 使用语义化回调 (value: T) => void，不暴露原始 DOM 事件
 */
