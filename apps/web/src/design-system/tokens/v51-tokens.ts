import { designTokens as baseTokens, type DesignTokens } from '@topems/tokens';

// ============================================================
// V51.0 Design Tokens
// 基于 @topems/tokens 的增强版设计令牌
// 支持 light/dark 双主题，导出 CSS 自定义属性和 TypeScript 常量
// ============================================================

const v51ColorPalette = {
  primary: {
    50: 'var(--color-primary-50, #eff6ff)',
    100: 'var(--color-primary-100, #dbeafe)',
    200: 'var(--color-primary-200, #bfdbfe)',
    300: 'var(--color-primary-300, #93c5fd)',
    400: 'var(--color-primary-light, var(--color-primary-light, #60a5fa))',
    500: baseTokens.colors.primary.main,
    600: 'var(--color-primary-hover, var(--color-primary-hover, #2563eb))',
    700: 'var(--color-primary-700, #1d4ed8)',
    800: 'var(--color-primary-800, #1e40af)',
    900: 'var(--color-primary-900, #1e3a8a)',
    main: baseTokens.colors.primary.main,
    light: 'var(--color-primary-light, var(--color-primary-light, #60a5fa))',
    dark: 'var(--color-primary-hover, var(--color-primary-hover, #2563eb))',
    contrastText: baseTokens.colors.background.paper,
  },
  secondary: {
    50: 'var(--color-secondary-50, #f5f3ff)',
    100: 'var(--color-secondary-100, #ede9fe)',
    200: 'var(--color-secondary-200, #ddd6fe)',
    300: 'var(--color-secondary-300, #c4b5fd)',
    400: 'var(--color-secondary-light, var(--color-secondary-light, #a78bfa))',
    500: baseTokens.colors.secondary.main,
    600: 'var(--color-secondary-hover, var(--color-secondary-hover, #7c3aed))',
    700: 'var(--color-secondary-700, #6d28d9)',
    800: 'var(--color-secondary-800, #5b21b6)',
    900: 'var(--color-secondary-900, #4c1d95)',
    main: baseTokens.colors.secondary.main,
    light: 'var(--color-secondary-light, var(--color-secondary-light, #a78bfa))',
    dark: 'var(--color-secondary-hover, var(--color-secondary-hover, #7c3aed))',
    contrastText: baseTokens.colors.background.paper,
  },
  success: {
    50: 'var(--color-success-50, #f0fdf4)',
    100: 'var(--color-success-100, #dcfce7)',
    200: 'var(--color-success-200, #bbf7d0)',
    300: 'var(--color-success-light, #86efac)',
    400: 'var(--color-success-400, #4ade80)',
    500: 'var(--color-success, var(--color-success, #22c55e))',
    600: 'var(--color-success-hover, var(--color-success-hover, #16a34a))',
    700: 'var(--color-success-700, #15803d)',
    800: 'var(--color-success-800, #166534)',
    900: 'var(--color-success-900, #14532d)',
    main: 'var(--color-success, var(--color-success, #22c55e))',
    light: 'var(--color-success-light, #86efac)',
    dark: 'var(--color-success-hover, var(--color-success-hover, #16a34a))',
    contrastText: baseTokens.colors.background.paper,
  },
  warning: {
    50: 'var(--color-warning-50, #fffbeb)',
    100: 'var(--color-warning-100, #fef3c7)',
    200: 'var(--color-warning-light, #fde68a)',
    300: 'var(--color-warning-300, #fcd34d)',
    400: 'var(--color-warning-400, #fbbf24)',
    500: baseTokens.colors.warning.main,
    600: baseTokens.colors.warning.dark,
    700: 'var(--color-warning-700, #b45309)',
    800: 'var(--color-warning-800, #92400e)',
    900: 'var(--color-warning-900, #78350f)',
    main: baseTokens.colors.warning.main,
    light: 'var(--color-warning-light, #fde68a)',
    dark: baseTokens.colors.warning.dark,
    contrastText: baseTokens.colors.background.paper,
  },
  error: {
    50: 'var(--color-error-50, #fef2f2)',
    100: 'var(--color-error-100, #fee2e2)',
    200: 'var(--color-error-200, #fecaca)',
    300: 'var(--color-error-light, #fca5a5)',
    400: 'var(--color-error-400, #f87171)',
    500: baseTokens.colors.error.main,
    600: baseTokens.colors.error.dark,
    700: 'var(--color-error-700, #b91c1c)',
    800: 'var(--color-error-800, #991b1b)',
    900: 'var(--color-error-900, #7f1d1d)',
    main: baseTokens.colors.error.main,
    light: 'var(--color-error-light, #fca5a5)',
    dark: baseTokens.colors.error.dark,
    contrastText: baseTokens.colors.background.paper,
  },
  info: {
    50: 'var(--color-info-50, #f0f9ff)',
    100: 'var(--color-info-100, #e0f2fe)',
    200: 'var(--color-info-200, #bae6fd)',
    300: 'var(--color-info-light, #7dd3fc)',
    400: 'var(--color-info-400, #38bdf8)',
    500: 'var(--color-info, #0ea5e9)',
    600: 'var(--color-info-hover, #0284c7)',
    700: 'var(--color-info-700, #0369a1)',
    800: 'var(--color-info-800, #075985)',
    900: 'var(--color-info-900, #0c4a6e)',
    main: 'var(--color-info, #0ea5e9)',
    light: 'var(--color-info-light, #7dd3fc)',
    dark: 'var(--color-info-hover, #0284c7)',
    contrastText: baseTokens.colors.background.paper,
  },
} as const;

const v51DarkColorPalette = {
  primary: {
    ...v51ColorPalette.primary,
    50: 'background.selectedDark',
    100: 'rgba(59, 130, 246, 0.2)',
    200: 'rgba(59, 130, 246, 0.3)',
    300: 'var(--color-primary-light, var(--color-primary-light, #60a5fa))',
    main: 'var(--color-primary-light, var(--color-primary-light, #60a5fa))',
    light: 'var(--color-primary-300, #93c5fd)',
    dark: baseTokens.colors.primary.main,
    contrastText: 'var(--color-primary-foreground, #0f172a)',
  },
  secondary: {
    ...v51ColorPalette.secondary,
    300: 'var(--color-secondary-light, var(--color-secondary-light, #a78bfa))',
    main: 'var(--color-secondary-light, var(--color-secondary-light, #a78bfa))',
    light: 'var(--color-secondary-300, #c4b5fd)',
    dark: baseTokens.colors.secondary.main,
    contrastText: 'var(--color-primary-foreground, #0f172a)',
  },
  success: {
    ...v51ColorPalette.success,
    main: 'var(--color-success-400, #4ade80)',
    light: 'var(--color-success-light, #86efac)',
    dark: 'var(--color-success, var(--color-success, #22c55e))',
    contrastText: 'var(--color-primary-foreground, #0f172a)',
  },
  warning: {
    ...v51ColorPalette.warning,
    main: 'var(--color-warning-400, #fbbf24)',
    light: 'var(--color-warning-light, #fde68a)',
    dark: baseTokens.colors.warning.main,
    contrastText: 'var(--color-primary-foreground, #0f172a)',
  },
  error: {
    ...v51ColorPalette.error,
    main: 'var(--color-error-400, #f87171)',
    light: 'var(--color-error-light, #fca5a5)',
    dark: baseTokens.colors.error.main,
    contrastText: baseTokens.colors.background.paper,
  },
  info: {
    ...v51ColorPalette.info,
    main: 'var(--color-info-400, #38bdf8)',
    light: 'var(--color-info-light, #7dd3fc)',
    dark: 'var(--color-info, #0ea5e9)',
    contrastText: 'var(--color-primary-foreground, #0f172a)',
  },
} as const;

const v51Typography = {
  fontFamily:
    '"Inter", "Noto Sans SC", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontFamilyMono: "'SF Mono', Monaco, 'Inconsolata', 'Fira Mono', 'Roboto Mono', monospace",
  fontSize: {
    '2xs': '0.625rem',
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
    '7xl': '4.5rem',
  },
  fontWeight: {
    thin: 200,
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
  lineHeight: {
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
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
} as const;

const v51Spacing = {
  none: 0,
  px: 0.25,
  xs: '4px',
  sm: '8px',
  md: '12px',
  base: '16px',
  lg: '20px',
  xl: '24px',
  '2xl': '32px',
  '3xl': '40px',
  '4xl': '48px',
  '5xl': '56px',
  '6xl': '64px',
  '7xl': '80px',
} as const;

const v51BorderRadius = {
  none: '0',
  xs: '2px',
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  '2xl': '16px',
  '3xl': '20px',
  '4xl': '24px',
  full: '9999px',
} as const;

const v51Shadows = {
  none: 'none',
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.12), 0 8px 10px -6px rgb(0 0 0 / 0.05)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.2)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.06)',
} as const;

const v51DarkShadows = {
  none: 'none',
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.3)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.3)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.5), 0 4px 6px -4px rgb(0 0 0 / 0.3)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.6), 0 8px 10px -6px rgb(0 0 0 / 0.4)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.7)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.4)',
} as const;

const v51ZIndex = {
  hide: -1,
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modal: 1300,
  popover: 1400,
  tooltip: 1500,
  toast: 1600,
  tooltipContent: 1700,
  snackbarContent: 1800,
} as const;

const v51Breakpoints = {
  xs: 0,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
  '3xl': 1920,
} as const;

const v51Motion = {
  duration: {
    instant: '0ms',
    fast: '100ms',
    normal: '200ms',
    moderate: '300ms',
    slow: '500ms',
    deliberate: '700ms',
    skeleton: '1500ms',
  },
  easing: {
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
    accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    linear: 'cubic-bezier(0, 0, 1, 1)',
  },
  transition: {
    fast: '100ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

const v51Opacity = {
  disabled: 0.5,
  hover: 0.08,
  focus: 0.12,
  selected: 0.12,
} as const;

const v51BorderWidth = {
  thin: '1px',
  medium: '2px',
  thick: '4px',
} as const;

const v51StrokeWidth = {
  thin: 1,
  medium: 2,
  thick: 3,
} as const;

const v51Radius = {
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  full: '9999px',
  pill: '9999px',
} as const;

const v51SemanticTokens = {
  surface: {
    page: {
      light: 'var(--color-background, var(--color-background, #f8fafc))',
      dark: 'var(--color-background, #080c18)',
    },
    card: {
      light: baseTokens.colors.background.paper,
      dark: 'var(--color-card, #0e1628)',
    },
    elevated: {
      light: baseTokens.colors.background.paper,
      dark: 'var(--color-surface-light, #162038)',
    },
    sunken: {
      light: 'var(--color-surface-light, var(--color-surface-light, #f1f5f9))',
      dark: 'var(--color-surface, #0c1222)',
    },
  },
  text: {
    primary: {
      light: 'var(--color-text-primary, var(--color-text-primary, #1e293b))',
      dark: 'var(--color-background, var(--color-background, #f8fafc))',
    },
    secondary: {
      light: 'var(--color-text-secondary, var(--color-text-secondary, #64748b))',
      dark: 'var(--color-text-muted, var(--color-text-muted, #94a3b8))',
    },
    tertiary: {
      light: 'var(--color-text-muted, var(--color-text-muted, #94a3b8))',
      dark: 'var(--color-text-secondary, var(--color-text-secondary, #64748b))',
    },
    disabled: {
      light: 'var(--color-text-disabled, var(--color-text-disabled, #cbd5e1))',
      dark: 'var(--color-grey-600, #4b5563)',
    },
    link: {
      light: 'var(--color-primary-hover, var(--color-primary-hover, #2563eb))',
      dark: 'var(--color-primary-light, var(--color-primary-light, #60a5fa))',
    },
  },
  fill: {
    default: {
      light: baseTokens.colors.background.paper,
      dark: 'var(--color-card, #0e1628)',
    },
    subtle: {
      light: 'var(--color-background, var(--color-background, #f8fafc))',
      dark: 'var(--color-surface-light, #162038)',
    },
    muted: {
      light: 'var(--color-surface-light, var(--color-surface-light, #f1f5f9))',
      dark: 'var(--color-surface-hover, #1e2d4a)',
    },
  },
  border: {
    default: {
      light: baseTokens.colors.border.default,
      dark: 'var(--color-border, #1a2d4d)',
    },
    strong: {
      light: 'var(--color-text-disabled, var(--color-text-disabled, #cbd5e1))',
      dark: 'var(--color-grey-700, #374151)',
    },
    subtle: {
      light: 'var(--color-surface-light, var(--color-surface-light, #f1f5f9))',
      dark: 'var(--color-surface-light, #162038)',
    },
  },
  overlay: {
    light: 'rgba(15, 23, 42, 0.5)',
    dark: 'rgba(0, 0, 0, 0.6)',
  },
} as const;

export type V51ColorPalette = typeof v51ColorPalette;
export type V51Typography = typeof v51Typography;
export type V51Spacing = typeof v51Spacing;
export type V51BorderRadius = typeof v51BorderRadius;
export type V51Shadows = typeof v51Shadows;
export type V51ZIndex = typeof v51ZIndex;
export type V51Breakpoints = typeof v51Breakpoints;
export type V51Motion = typeof v51Motion;
export type V51SemanticTokens = typeof v51SemanticTokens;

export interface V51DesignTokens {
  colors: V51ColorPalette;
  darkColors: typeof v51DarkColorPalette;
  typography: V51Typography;
  spacing: V51Spacing;
  borderRadius: V51BorderRadius;
  shadows: V51Shadows;
  darkShadows: typeof v51DarkShadows;
  zIndex: V51ZIndex;
  breakpoints: V51Breakpoints;
  motion: V51Motion;
  opacity: typeof v51Opacity;
  borderWidth: typeof v51BorderWidth;
  strokeWidth: typeof v51StrokeWidth;
  radius: typeof v51Radius;
  semantic: V51SemanticTokens;
}

export const v51DesignTokens: V51DesignTokens = {
  colors: v51ColorPalette,
  darkColors: v51DarkColorPalette,
  typography: v51Typography,
  spacing: v51Spacing,
  borderRadius: v51BorderRadius,
  shadows: v51Shadows,
  darkShadows: v51DarkShadows,
  zIndex: v51ZIndex,
  breakpoints: v51Breakpoints,
  motion: v51Motion,
  opacity: v51Opacity,
  borderWidth: v51BorderWidth,
  strokeWidth: v51StrokeWidth,
  radius: v51Radius,
  semantic: v51SemanticTokens,
};

function generateV51CSSVariables(mode: 'light' | 'dark' = 'light'): string {
  const colors = mode === 'dark' ? v51DarkColorPalette : v51ColorPalette;
  const shadows = mode === 'dark' ? v51DarkShadows : v51Shadows;
  const surface = mode === 'dark' ? v51SemanticTokens.surface : v51SemanticTokens.surface;
  const text = mode === 'dark' ? v51SemanticTokens.text : v51SemanticTokens.text;
  const fill = mode === 'dark' ? v51SemanticTokens.fill : v51SemanticTokens.fill;
  const border = mode === 'dark' ? v51SemanticTokens.border : v51SemanticTokens.border;

  const lines: string[] = [];
  const selector = mode === 'dark' ? '.dark' : ':root';

  lines.push(`${selector} {`);

  lines.push('  /* V51.0 Color Tokens */');
  for (const [name, shadeObj] of Object.entries(colors)) {
    for (const [shade, value] of Object.entries(shadeObj)) {
      if (typeof value === 'string') {
        lines.push(`  --v51-color-${name}-${shade}: ${value};`);
      }
    }
  }

  lines.push('');
  lines.push('  /* V51.0 Semantic Surface */');
  lines.push(`  --v51-surface-page: ${surface.page[mode]};`);
  lines.push(`  --v51-surface-card: ${surface.card[mode]};`);
  lines.push(`  --v51-surface-elevated: ${surface.elevated[mode]};`);
  lines.push(`  --v51-surface-sunken: ${surface.sunken[mode]};`);

  lines.push('');
  lines.push('  /* V51.0 Semantic Text */');
  lines.push(`  --v51-text-primary: ${text.primary[mode]};`);
  lines.push(`  --v51-text-secondary: ${text.secondary[mode]};`);
  lines.push(`  --v51-text-tertiary: ${text.tertiary[mode]};`);
  lines.push(`  --v51-text-disabled: ${text.disabled[mode]};`);
  lines.push(`  --v51-text-link: ${text.link[mode]};`);

  lines.push('');
  lines.push('  /* V51.0 Semantic Fill */');
  lines.push(`  --v51-fill-default: ${fill.default[mode]};`);
  lines.push(`  --v51-fill-subtle: ${fill.subtle[mode]};`);
  lines.push(`  --v51-fill-muted: ${fill.muted[mode]};`);

  lines.push('');
  lines.push('  /* V51.0 Semantic Border */');
  lines.push(`  --v51-border-default: ${border.default[mode]};`);
  lines.push(`  --v51-border-strong: ${border.strong[mode]};`);
  lines.push(`  --v51-border-subtle: ${border.subtle[mode]};`);

  lines.push('');
  lines.push('  /* V51.0 Shadows */');
  for (const [name, value] of Object.entries(shadows)) {
    lines.push(`  --v51-shadow-${name}: ${value};`);
  }

  lines.push('');
  lines.push('  /* V51.0 Spacing */');
  for (const [name, value] of Object.entries(v51Spacing)) {
    lines.push(`  --v51-spacing-${name}: ${value};`);
  }

  lines.push('');
  lines.push('  /* V51.0 Border Radius */');
  for (const [name, value] of Object.entries(v51BorderRadius)) {
    lines.push(`  --v51-radius-${name}: ${value};`);
  }

  lines.push('');
  lines.push('  /* V51.0 Typography */');
  lines.push(`  --v51-font-family: ${v51Typography.fontFamily};`);
  lines.push(`  --v51-font-family-mono: ${v51Typography.fontFamilyMono};`);
  for (const [name, value] of Object.entries(v51Typography.fontSize)) {
    lines.push(`  --v51-font-size-${name}: ${value};`);
  }
  for (const [name, value] of Object.entries(v51Typography.fontWeight)) {
    lines.push(`  --v51-font-weight-${name}: ${value};`);
  }
  for (const [name, value] of Object.entries(v51Typography.lineHeight)) {
    lines.push(`  --v51-line-height-${name}: ${value};`);
  }

  lines.push('');
  lines.push('  /* V51.0 Motion */');
  for (const [name, value] of Object.entries(v51Motion.duration)) {
    lines.push(`  --v51-duration-${name}: ${value};`);
  }
  for (const [name, value] of Object.entries(v51Motion.easing)) {
    lines.push(`  --v51-easing-${name}: ${value};`);
  }

  lines.push('');
  lines.push('  /* V51.0 Z-Index */');
  for (const [name, value] of Object.entries(v51ZIndex)) {
    lines.push(`  --v51-z-${name}: ${value};`);
  }

  lines.push('');
  lines.push('  /* V51.0 Overlay */');
  lines.push(`  --v51-overlay: ${v51SemanticTokens.overlay[mode]};`);

  lines.push('}');

  return lines.join('\n');
}

export function injectV51CSSVariables(): void {
  if (typeof document === 'undefined') return;

  const styleId = 'v51-design-system-tokens';
  let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;

  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  const lightCSS = generateV51CSSVariables('light');
  const darkCSS = generateV51CSSVariables('dark');
  styleEl.textContent = `${lightCSS}\n\n${darkCSS}`;
}

