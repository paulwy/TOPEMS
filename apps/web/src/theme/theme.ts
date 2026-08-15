/* eslint-disable topems-design/no-hardcoded-colors -- theme.ts defines the color tokens */
import type { Theme, ThemeOptions } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import { designTokens, semanticTokens } from './tokens';
import { gradients } from './gradients';
import { injectCyberpunkComponentStyles } from './animations/cyberpunk.css';

declare module '@mui/material/styles' {
  interface Theme {
    gradients: typeof gradients;
    customShadows: {
      card: string;
      dropdown: string;
      dialog: string;
      focus: string;
      dangerButton: string;
      dangerButtonHover: string;
    };
  }
  interface ThemeOptions {
    gradients?: typeof gradients;
    customShadows?: {
      card?: string;
      dropdown?: string;
      dialog?: string;
      focus?: string;
      dangerButton?: string;
      dangerButtonHover?: string;
    };
  }
  interface Shape {
    radii: {
      readonly xs: 2;
      readonly sm: 4;
      readonly md: 8;
      readonly lg: 12;
      readonly xl: 16;
      readonly '2xl': 24;
      readonly full: 9999;
    };
  }
  interface ShapeOptions {
    radii?: {
      readonly xs?: 2;
      readonly sm?: 4;
      readonly md?: 8;
      readonly lg?: 12;
      readonly xl?: 16;
      readonly '2xl'?: 24;
      readonly full?: 9999;
    };
  }
}

// 扩展 Palette 颜色，增加 cyberpunk 专属字段及设计令牌扩展色组
declare module '@mui/material/styles' {
  interface Palette {
    accent?: { main: string; light: string; dark: string };
    teal?: typeof designTokens.colors.teal;
    orange?: typeof designTokens.colors.orange;
    yellow?: typeof designTokens.colors.yellow;
    blue?: typeof designTokens.colors.blue;
    cyan?: typeof designTokens.colors.cyan;
    purple?: typeof designTokens.colors.purple;
    pink?: typeof designTokens.colors.pink;
    surface?: typeof designTokens.colors.surface;
  }
  interface PaletteOptions {
    accent?: { main?: string; light?: string; dark?: string };
    teal?: typeof designTokens.colors.teal;
    orange?: typeof designTokens.colors.orange;
    yellow?: typeof designTokens.colors.yellow;
    blue?: typeof designTokens.colors.blue;
    cyan?: typeof designTokens.colors.cyan;
    purple?: typeof designTokens.colors.purple;
    pink?: typeof designTokens.colors.pink;
    surface?: typeof designTokens.colors.surface;
  }
  interface TypeText {
    muted?: string;
  }
  interface PaletteText {
    muted?: string;
  }
  interface PaletteTextOptions {
    muted?: string;
  }
}

const lightShadows = [...Array(24)].map((_, i) => {
  // MUI shadows 是 0..24 的数组（长度 25），以下为对齐设计 tokens 的合理映射
  const shadows = [
    designTokens.shadows.none,             // 0
    designTokens.shadows.xs,               // 1
    designTokens.shadows.sm,               // 2
    designTokens.shadows.md,               // 3
    designTokens.shadows.lg,               // 4
    designTokens.shadows.xl,               // 5
    designTokens.shadows['2xl'],            // 6
    designTokens.shadows['3xl'],            // 7
    designTokens.shadows.inner,             // 8
    designTokens.shadows.sm,                // 9
    designTokens.shadows.md,                // 10
    designTokens.shadows.lg,                // 11
    designTokens.shadows.xl,                // 12
    designTokens.shadows['2xl'],            // 13
    designTokens.shadows['3xl'],            // 14
    designTokens.shadows.inner,             // 15
    designTokens.shadows.sm,                // 16
    designTokens.shadows.md,                // 17
    designTokens.shadows.lg,                // 18
    designTokens.shadows.xl,                // 19
    designTokens.shadows['2xl'],            // 20
    designTokens.shadows['3xl'],            // 21
    designTokens.shadows.inner,             // 22
    designTokens.shadows.sm,                // 23
    designTokens.shadows.md,                // 24
  ];
  return shadows[i] ?? designTokens.shadows.none;
});

const darkShadows = [...Array(25)].map((_, i) => {
  const shadows = [
    designTokens.darkShadows.none,
    designTokens.darkShadows.xs,
    designTokens.darkShadows.sm,
    designTokens.darkShadows.md,
    designTokens.darkShadows.lg,
    designTokens.darkShadows.xl,
    designTokens.darkShadows['2xl'],
    designTokens.darkShadows['3xl'],
    designTokens.darkShadows.inner,
    designTokens.darkShadows.sm,
    designTokens.darkShadows.md,
    designTokens.darkShadows.lg,
    designTokens.darkShadows.xl,
    designTokens.darkShadows['2xl'],
    designTokens.darkShadows['3xl'],
    designTokens.darkShadows.inner,
    designTokens.darkShadows.sm,
    designTokens.darkShadows.md,
    designTokens.darkShadows.lg,
    designTokens.darkShadows.xl,
    designTokens.darkShadows['2xl'],
    designTokens.darkShadows['3xl'],
    designTokens.darkShadows.inner,
    designTokens.darkShadows.sm,
    designTokens.darkShadows.md,
  ];
  return shadows[i] ?? designTokens.darkShadows.none;
});

/**
 * Cyberpunk 赛博朋克色彩方案
 * - 基础色：深空（#0A0A1A），比暗 mode 更纯黑
 * - 主色：霓虹青（#00FFFF）替换原 primary 蓝
 * - 副色：霓虹品红（#FF00FF）
 * - 强调色：霓虹金（#FFD700）
 * - 玻璃态：半透明 + backdrop-filter 组合
 */
const CYBERPUNK_COLORS = {
  background: {
    default: '#0A0A1A',
    paper: 'rgba(26, 26, 46, 0.90)',
    elevated: 'rgba(26, 26, 46, 0.95)',
  },
  text: {
    primary: '#E6F1FF',
    secondary: '#8892B0',
    muted: '#5A648A',
    disabled: 'rgba(230, 241, 255, 0.40)',
  },
  border: {
    default: 'rgba(0, 255, 255, 0.20)',
  },
  primary: {
    main: '#00FFFF',
    light: '#5FFFFF',
    dark: '#00C8C8',
    contrastText: '#0A0A1A',
    50: 'rgba(0, 255, 255, 0.05)',
    100: 'rgba(0, 255, 255, 0.10)',
    200: 'rgba(0, 255, 255, 0.20)',
    300: 'rgba(0, 255, 255, 0.35)',
    400: 'rgba(0, 255, 255, 0.50)',
    500: '#00FFFF',
    600: '#00D9D9',
    700: '#00B3B3',
    800: '#008C8C',
    900: '#006666',
  },
  secondary: {
    main: '#FF00FF',
    light: '#FF5FFF',
    dark: '#C800C8',
    contrastText: '#FFFFFF',
    50: 'rgba(255, 0, 255, 0.05)',
    100: 'rgba(255, 0, 255, 0.10)',
    200: 'rgba(255, 0, 255, 0.20)',
    300: 'rgba(255, 0, 255, 0.35)',
    400: 'rgba(255, 0, 255, 0.50)',
    500: '#FF00FF',
    600: '#D900D9',
    700: '#B300B3',
    800: '#8C008C',
    900: '#660066',
  },
  warning: {
    main: '#FFD700',
    light: '#FFE54D',
    dark: '#C9AA00',
  },
  error: {
    main: '#FF4444',
    light: '#FF7777',
    dark: '#CC3333',
  },
  success: {
    main: '#00FF88',
    light: '#4DFFA6',
    dark: '#00CC66',
  },
  info: {
    main: '#00AAFF',
    light: '#4DC3FF',
    dark: '#0088CC',
  },
} as const;

const customShadowsLight = {
  card: `0 1px 2px 0 ${designTokens.colors.action.hover}, 0 1px 3px 0 rgba(0,0,0,0.03)`,
  dropdown: `0 4px 12px ${designTokens.colors.action.selected}, 0 2px 4px ${designTokens.colors.action.hover}`,
  dialog: `0 24px 48px rgba(0,0,0,0.16), 0 8px 16px ${designTokens.colors.action.selected}`,
  focus: '0 0 0 3px rgba(59, 130, 246, 0.15)',
  dangerButton: '0 4px 12px rgba(239, 68, 68, 0.30)',
  dangerButtonHover: '0 6px 16px rgba(239, 68, 68, 0.40)',
};

const customShadowsDark = {
  ...customShadowsLight,
  card: '0 1px 2px 0 rgba(0,0,0,0.30), 0 1px 3px 0 rgba(0,0,0,0.20)',
  dropdown: '0 8px 24px rgba(0,0,0,0.40), 0 2px 6px rgba(0,0,0,0.30)',
  dialog: '0 24px 48px rgba(0,0,0,0.50), 0 8px 16px rgba(0,0,0,0.40)',
};

const customShadowsCyberpunk = {
  card: `0 4px 24px rgba(0, 0, 0, 0.30), 0 0 20px rgba(0, 255, 255, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.08)`,
  dropdown: `0 8px 32px rgba(0, 0, 0, 0.50), 0 0 24px rgba(0, 255, 255, 0.12)`,
  dialog: `0 24px 64px rgba(0, 0, 0, 0.60), 0 0 40px rgba(0, 255, 255, 0.15)`,
  focus: '0 0 0 3px rgba(0, 255, 255, 0.25)',
  dangerButton: designTokens.neonShadows.red.md,
  dangerButtonHover: '0 6px 18px rgba(255, 68, 68, 0.55)',
};

/**
 * 基础 palette 生成（shared typography/shape/spacing/zIndex/gradients 独立于 mode）
 * palette.mode 只决定 MUI 组件内置的深色样式规则切换（.Mui-selected 背景色等）
 * —— 自定义组件通过 theme.applyStyles('dark', {...}) / [data-theme='cyberpunk'] 实现多态
 */
export const createCustomTheme = (): Theme => {
  return createTheme({
    palette: {
      mode: 'light',
      primary: {
        ...designTokens.colors.primary,
      },
      secondary: {
        ...designTokens.colors.secondary,
      },
      success: {
        ...designTokens.colors.success,
      },
      warning: {
        ...designTokens.colors.warning,
      },
      error: {
        ...designTokens.colors.error,
      },
      info: {
        ...designTokens.colors.info,
      },
      grey: designTokens.colors.grey,
      background: {
        default: designTokens.colors.background.default,
        paper: designTokens.colors.background.paper,
      },
      text: {
        primary: designTokens.colors.text.primary,
        secondary: designTokens.colors.text.secondary,
        muted: designTokens.colors.text.muted,
      },
      divider: designTokens.colors.border.default,
      // 设计令牌扩展色组 — 供 sx prop 通过 token path 引用
      teal: designTokens.colors.teal,
      orange: designTokens.colors.orange,
      yellow: designTokens.colors.yellow,
      blue: designTokens.colors.blue,
      cyan: designTokens.colors.cyan,
      purple: designTokens.colors.purple,
      pink: designTokens.colors.pink,
      surface: designTokens.colors.surface,
      accent: {
        main: '#FFD700',
        light: '#FFE54D',
        dark: '#C9AA00',
      },
    },
    colorSchemes: {
      light: {
        palette: {
          mode: 'light',
          background: {
            default: designTokens.colors.background.default,
            paper: designTokens.colors.background.paper,
          },
        },
      },
      dark: {
        palette: {
          mode: 'dark',
          background: {
            default: designTokens.colors.grey[950],
            paper: designTokens.colors.grey[900],
          },
          text: {
            primary: '#F1F5F9',
            secondary: designTokens.colors.grey[300],
            muted: designTokens.colors.grey[500],
          },
          divider: designTokens.colors.grey[700],
          grey: designTokens.colors.grey,
        },
      },
      cyberpunk: {
        palette: {
          mode: 'dark',
          primary: CYBERPUNK_COLORS.primary,
          secondary: CYBERPUNK_COLORS.secondary,
          success: CYBERPUNK_COLORS.success,
          warning: CYBERPUNK_COLORS.warning,
          error: CYBERPUNK_COLORS.error,
          info: CYBERPUNK_COLORS.info,
          background: CYBERPUNK_COLORS.background,
          text: CYBERPUNK_COLORS.text,
          divider: CYBERPUNK_COLORS.border.default,
          accent: {
            main: '#FFD700',
            light: '#FFE54D',
            dark: '#C9AA00',
          },
        },
      },
      // MUI v5 类型只声明 light/dark，任意字符串键在运行时均支持
    } as ThemeOptions['colorSchemes'],
    typography: {
      fontFamily: designTokens.typography.fontFamily,
      fontSize: 14,
      h1: designTokens.typography.h1,
      h2: designTokens.typography.h2,
      h3: designTokens.typography.h3,
      h4: designTokens.typography.h4,
      h5: designTokens.typography.h5,
      h6: designTokens.typography.h6,
      body1: designTokens.typography.body1,
      body2: designTokens.typography.body2,
      caption: designTokens.typography.caption,
      button: designTokens.typography.button,
      overline: designTokens.typography.overline,
    },
    shape: {
      borderRadius: designTokens.borderRadius.md,
      radii: {
        xs: 2,
        sm: 4,
        md: 8,
        lg: 12,
        xl: 16,
        '2xl': 24,
        full: 9999,
      } as const,
    },
    spacing: (factor: number) => `${factor * 8}px`,
    zIndex: designTokens.zIndex,
    shadows: lightShadows as ThemeOptions['shadows'],
    customShadows: customShadowsLight,
    transitions: {
      duration: designTokens.transitions.duration,
      easing: designTokens.transitions.easing,
    },
    breakpoints: {
      values: designTokens.breakpoints.values,
    },
    gradients,
    components: {
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: designTokens.borderRadius.md,
            fontWeight: designTokens.typography.fontWeight.medium,
            fontSize: designTokens.typography.fontSize.sm,
            padding: `${designTokens.spacing.sm} 16px`,
            minWidth: 'auto',
            '&.MuiButton-contained': {
              boxShadow: designTokens.shadows.sm,
              '&:hover': {
                boxShadow: designTokens.shadows.md,
              },
            },
            '&.MuiButton-outlined': {
              borderWidth: '1px',
            },
            '&.MuiButton-text': {
              padding: `${designTokens.spacing.sm} 12px`,
            },
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: 'outlined',
          size: 'small',
          fullWidth: false,
        },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: designTokens.borderRadius.md,
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderWidth: '2px',
              },
            },
          },
        },
      },
      MuiSelect: {
        defaultProps: {
          variant: 'outlined',
          size: 'small',
        },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: designTokens.borderRadius.md,
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderWidth: '2px',
              },
            },
          },
        },
      },
      MuiCard: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            borderRadius: semanticTokens.radius.card,
            boxShadow: semanticTokens.elevation.card,
            border: semanticTokens.border.card,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: semanticTokens.radius.default,
          },
        },
      },
      MuiDialog: {
        defaultProps: {
          maxWidth: 'sm',
          fullWidth: true,
        },
        styleOverrides: {
          paper: {
            borderRadius: semanticTokens.radius.dialog,
          },
        },
      },
      MuiPopover: {
        styleOverrides: {
          paper: {
            borderRadius: semanticTokens.radius.dialog,
            boxShadow: semanticTokens.elevation.dialog,
          },
        },
      },
      MuiTooltip: {
        defaultProps: {
          arrow: true,
          placement: 'top',
        },
        styleOverrides: {
          tooltip: {
            borderRadius: semanticTokens.radius.small,
            fontSize: designTokens.typography.fontSize.xs,
            padding: `${designTokens.spacing.sm} 12px`,
          },
        },
      },
      MuiChip: {
        defaultProps: {
          size: 'medium',
        },
        styleOverrides: {
          root: {
            borderRadius: semanticTokens.radius.pill,
            fontSize: designTokens.typography.fontSize.xs,
            fontWeight: designTokens.typography.fontWeight.medium,
          },
        },
      },
      MuiTable: {
        defaultProps: {
          size: 'small',
        },
        styleOverrides: {
          root: {
            borderCollapse: 'separate',
            borderSpacing: 0,
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:last-child td, &:last-child th': {
              borderBottom: 0,
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            padding: `${designTokens.spacing.md} 16px`,
            borderBottom: semanticTokens.border.default,
          },
          head: ({ theme }) => ({
            fontWeight: designTokens.typography.fontWeight.semibold,
            backgroundColor: designTokens.colors.grey[50],
            ...theme.applyStyles('dark', {
              backgroundColor: designTokens.colors.grey[800],
            }),
          }),
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: designTokens.colors.grey[50],
            ...theme.applyStyles('dark', {
              backgroundColor: designTokens.colors.grey[800],
            }),
          }),
        },
      },
      MuiPagination: {
        styleOverrides: {
          root: {
            '& .Mui-selected': {
              backgroundColor: designTokens.colors.primary.main,
              color: designTokens.colors.primary.contrastText,
            },
          },
        },
      },
      MuiTabs: {
        defaultProps: {
          indicatorColor: 'primary',
          textColor: 'primary',
        },
        styleOverrides: {
          root: {
            minHeight: 48,
          },
          indicator: {
            height: 3,
            borderRadius: 3,
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: designTokens.typography.fontWeight.medium,
            minWidth: 'auto',
            padding: `${designTokens.spacing.md} 20px`,
          },
        },
      },
      MuiCheckbox: {
        styleOverrides: {
          root: {
            '&.Mui-checked': {
              color: designTokens.colors.primary.main,
            },
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          root: {
            '& .MuiSwitch-track': {
              borderRadius: designTokens.borderRadius.full,
            },
            '& .MuiSwitch-thumb': {
              borderRadius: designTokens.borderRadius.full,
            },
            '&.Mui-checked': {
              '& .MuiSwitch-track': {
                backgroundColor: designTokens.colors.primary.main,
              },
            },
          },
        },
      },
      MuiRadio: {
        styleOverrides: {
          root: {
            '&.Mui-checked': {
              color: designTokens.colors.primary.main,
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: ({ theme }) => ({
            height: 56,
            boxShadow: designTokens.shadows.sm,
            backgroundColor: designTokens.colors.background.paper,
            ...theme.applyStyles('dark', {
              backgroundColor: designTokens.colors.grey[800],
            }),
          }),
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: designTokens.borderRadius.md,
            transition: 'all 150ms ease',
            '&.Mui-selected': {
              backgroundColor: designTokens.colors.primary[50],
              borderLeft: `3px solid ${designTokens.colors.primary.main}`,
              color: designTokens.colors.primary.main,
              '&:hover': {
                backgroundColor: designTokens.colors.primary[50],
              },
              ...theme.applyStyles('dark', {
                backgroundColor: 'background.selectedDark',
                '&:hover': {
                  backgroundColor: 'background.selectedDark',
                },
              }),
            },
          }),
        },
      },
      MuiBreadcrumbs: {
        styleOverrides: {
          li: {
            '& .MuiTypography-root': {
              fontSize: designTokens.typography.fontSize.sm,
            },
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: designTokens.borderRadius.md,
            fontSize: designTokens.typography.fontSize.sm,
          },
          colorSuccess: ({ theme }) => ({
            '&.MuiAlert-standard': {
              backgroundColor: designTokens.colors.success[50],
              color: designTokens.colors.success[800],
            },
            ...theme.applyStyles('dark', {
              '&.MuiAlert-standard': {
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                color: designTokens.colors.success[300],
              },
            }),
          }),
          colorError: ({ theme }) => ({
            '&.MuiAlert-standard': {
              backgroundColor: designTokens.colors.error[50],
              color: designTokens.colors.error[800],
            },
            ...theme.applyStyles('dark', {
              '&.MuiAlert-standard': {
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: designTokens.colors.error[300],
              },
            }),
          }),
          colorWarning: ({ theme }) => ({
            '&.MuiAlert-standard': {
              backgroundColor: designTokens.colors.warning[50],
              color: designTokens.colors.warning[800],
            },
            ...theme.applyStyles('dark', {
              '&.MuiAlert-standard': {
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                color: designTokens.colors.warning[300],
              },
            }),
          }),
          colorInfo: ({ theme }) => ({
            '&.MuiAlert-standard': {
              backgroundColor: designTokens.colors.info[50],
              color: designTokens.colors.info[800],
            },
            ...theme.applyStyles('dark', {
              '&.MuiAlert-standard': {
                backgroundColor: 'background.selectedDark',
                color: designTokens.colors.info[300],
              },
            }),
          }),
        },
      },
      MuiAvatar: {
        styleOverrides: {
          root: {
            fontSize: designTokens.typography.fontSize.base,
            fontWeight: designTokens.typography.fontWeight.medium,
          },
        },
      },
      MuiBadge: {
        styleOverrides: {
          badge: {
            fontSize: designTokens.typography.fontSize.xs,
            fontWeight: designTokens.typography.fontWeight.semibold,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            padding: '0 5px',
          },
        },
      },
      MuiButtonGroup: {
        styleOverrides: {
          root: {
            borderRadius: designTokens.borderRadius.md,
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: designTokens.colors.border.default,
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: designTokens.borderRadius.md,
            transition: 'all 150ms ease',
            '&:hover': {
              backgroundColor: designTokens.colors.action.hover,
            },
          },
          sizeSmall: {
            padding: 6,
          },
          sizeMedium: {
            padding: 8,
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: designTokens.borderRadius.full,
            height: 8,
          },
          bar: {
            borderRadius: designTokens.borderRadius.full,
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            fontSize: designTokens.typography.fontSize.sm,
            borderRadius: designTokens.borderRadius.sm,
            margin: `${designTokens.spacing.xs} 6px`,
            minHeight: 36,
          },
        },
      },
      MuiSkeleton: {
        defaultProps: {
          animation: 'wave',
          variant: 'rounded',
        },
        styleOverrides: {
          root: {
            borderRadius: designTokens.borderRadius.sm,
          },
          rounded: {
            borderRadius: designTokens.borderRadius.md,
          },
          rectangular: {
            borderRadius: designTokens.borderRadius.md,
          },
        },
      },
      MuiTypography: {
        styleOverrides: {
          root: {
            wordBreak: 'break-word',
          },
        },
        defaultProps: {
          variantMapping: {
            body1: 'div',
            body2: 'div',
          },
        },
      },
      MuiStepLabel: {
        styleOverrides: {
          label: {
            fontSize: designTokens.typography.fontSize.sm,
            fontWeight: designTokens.typography.fontWeight.medium,
          },
        },
      },
      MuiInputBase: {
        styleOverrides: {
          root: {
            fontSize: designTokens.typography.fontSize.sm,
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontSize: designTokens.typography.fontSize.sm,
            fontWeight: designTokens.typography.fontWeight.medium,
            color: designTokens.colors.text.secondary,
            '&.Mui-focused': {
              color: designTokens.colors.primary.main,
            },
            '&.Mui-shrink': {
              fontSize: designTokens.typography.fontSize.sm,
            },
          },
        },
      },
      MuiCircularProgress: {
        styleOverrides: {
          root: {
            color: designTokens.colors.primary.main,
          },
        },
      },
      MuiBackdrop: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: designTokens.colors.cyber.glass.divider,
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            ...theme.applyStyles('dark', {
              backgroundColor: 'glass.bottomShadow',
            }),
          }),
        },
      },
      MuiSnackbar: {
        styleOverrides: {
          root: {
            bottom: 24,
          },
        },
      },
      MuiAccordion: {
        styleOverrides: {
          root: {
            borderRadius: designTokens.borderRadius.md,
            boxShadow: 'none',
            border: semanticTokens.border.card,
            '&:before': {
              display: 'none',
            },
            '&.Mui-expanded': {
              margin: 0,
            },
          },
        },
      },
      MuiAccordionSummary: {
        styleOverrides: {
          root: {
            padding: `${designTokens.spacing.md} 20px`,
            minHeight: 48,
            '&.Mui-expanded': {
              minHeight: 48,
            },
          },
          content: {
            '&.Mui-expanded': {
              margin: `${designTokens.spacing.md} 0`,
            },
          },
        },
      },
      MuiAccordionDetails: {
        styleOverrides: {
          root: {
            padding: `${designTokens.spacing.md} 20px 20px`,
            borderTop: semanticTokens.border.default,
          },
        },
      },
      MuiLink: {
        styleOverrides: {
          root: {
            color: designTokens.colors.primary.main,
            textDecoration: 'none',
            '&:hover': {
              textDecoration: 'underline',
            },
          },
        },
      },
      MuiSlider: {
        styleOverrides: {
          root: {
            color: designTokens.colors.primary.main,
            height: 4,
            '&:hover': {
              color: designTokens.colors.primary.dark,
            },
          },
          thumb: {
            width: 16,
            height: 16,
            boxShadow: designTokens.shadows.sm,
          },
          track: {
            height: 4,
            borderRadius: 3,
          },
          rail: {
            height: 4,
            borderRadius: 3,
            opacity: 0.3,
          },
        },
      },
      MuiToggleButtonGroup: {
        styleOverrides: {
          root: {
            borderRadius: designTokens.borderRadius.md,
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontSize: designTokens.typography.fontSize.sm,
            fontWeight: designTokens.typography.fontWeight.medium,
            '&.Mui-selected': {
              backgroundColor: designTokens.colors.primary.main,
              color: designTokens.colors.primary.contrastText,
              '&:hover': {
                backgroundColor: designTokens.colors.primary.dark,
              },
            },
          },
        },
      },
      MuiAutocomplete: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: designTokens.borderRadius.md,
            },
          },
          paper: {
            borderRadius: designTokens.borderRadius.md,
            boxShadow: designTokens.shadows.lg,
          },
          option: {
            fontSize: designTokens.typography.fontSize.sm,
            minHeight: 36,
          },
        },
      },
      MuiCardHeader: {
        styleOverrides: {
          root: {
            padding: `${designTokens.spacing.md} 20px`,
          },
          title: {
            fontSize: designTokens.typography.fontSize.lg,
            fontWeight: designTokens.typography.fontWeight.semibold,
          },
          subheader: {
            fontSize: designTokens.typography.fontSize.sm,
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: `${designTokens.spacing.md} 20px`,
            '&:last-child': {
              paddingBottom: 4,
            },
          },
        },
      },
      MuiCardActions: {
        styleOverrides: {
          root: {
            padding: `${designTokens.spacing.md} 20px 16px`,
            gap: 8,
          },
        },
      },
      // 赛博朋克主题组件样式（通过全局 CSS 注入，避免重复定义组件）
      MuiCssBaseline: {
        styleOverrides: () => {
          injectCyberpunkComponentStyles();
          return {};
        },
      },
    },
  });
};

export default createCustomTheme;

/**
 * 按主题返回对应的 customShadows（MUI colorSchemes 不接受 customShadows，因此在组件层使用）
 *
 * - light: 基础 shadows（写入 theme.customShadows）
 * - dark: 暗色调 shadows（应用于 dark 模式）
 * - cyberpunk: 赛博朋克霓虹阴影（应用于 data-theme=cyberpunk）
 */
export const themeCustomShadows = {
  light: customShadowsLight,
  dark: customShadowsDark,
  cyberpunk: customShadowsCyberpunk,
} as const;
