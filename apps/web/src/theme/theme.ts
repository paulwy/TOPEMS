/* eslint-disable topems-design/no-hardcoded-colors -- theme.ts defines the color tokens */
import type { Theme, ThemeOptions } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import { designTokens, semanticTokens } from './tokens';
import { gradients } from './gradients';
import { injectCyberpunkComponentStyles } from './animations/cyberpunk.css';

// 扩展 Theme 接口以包含 gradients
declare module '@mui/material/styles' {
  interface Theme {
    gradients: typeof gradients;
  }
  interface ThemeOptions {
    gradients?: typeof gradients;
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

const lightShadows = [
  designTokens.shadows.none,
  designTokens.shadows.xs,
  designTokens.shadows.sm,
  designTokens.shadows.md,
  designTokens.shadows.lg,
  designTokens.shadows.xl,
  designTokens.shadows['2xl'],
  designTokens.shadows['3xl'],
  designTokens.shadows.inner,
  designTokens.shadows.sm,
  designTokens.shadows.md,
  designTokens.shadows.lg,
  designTokens.shadows.xl,
  designTokens.shadows['2xl'],
  designTokens.shadows['3xl'],
  designTokens.shadows.inner,
  designTokens.shadows.sm,
  designTokens.shadows.md,
  designTokens.shadows.lg,
  designTokens.shadows.xl,
  designTokens.shadows['2xl'],
  designTokens.shadows['3xl'],
  designTokens.shadows.inner,
  designTokens.shadows.sm,
  designTokens.shadows.md,
];

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
    },
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
    },
    spacing: (factor: number) => `${factor * 8}px`,
    zIndex: designTokens.zIndex,
    shadows: lightShadows as ThemeOptions['shadows'],
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
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: designTokens.borderRadius.md,
            fontWeight: designTokens.typography.fontWeight.medium,
            fontSize: designTokens.typography.fontSize.sm,
            padding: '6px 16px',
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
              padding: '6px 12px',
            },
          },
        },
      },
      MuiTextField: {
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
        styleOverrides: {
          tooltip: {
            borderRadius: semanticTokens.radius.small,
            fontSize: designTokens.typography.fontSize.xs,
            padding: '8px 12px',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: semanticTokens.radius.pill,
            fontSize: designTokens.typography.fontSize.xs,
            fontWeight: designTokens.typography.fontWeight.medium,
          },
        },
      },
      MuiTable: {
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
            padding: '12px 16px',
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
            padding: '12px 20px',
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
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                '&:hover': {
                  backgroundColor: 'rgba(59, 130, 246, 0.15)',
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
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
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
            margin: '2px 6px',
            minHeight: 36,
          },
        },
      },
      MuiSkeleton: {
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
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            ...theme.applyStyles('dark', {
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
            padding: '12px 20px',
            minHeight: 48,
            '&.Mui-expanded': {
              minHeight: 48,
            },
          },
          content: {
            '&.Mui-expanded': {
              margin: '12px 0',
            },
          },
        },
      },
      MuiAccordionDetails: {
        styleOverrides: {
          root: {
            padding: '16px 20px 20px',
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
            padding: '16px 20px',
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
            padding: '16px 20px',
            '&:last-child': {
              paddingBottom: '16px',
            },
          },
        },
      },
      MuiCardActions: {
        styleOverrides: {
          root: {
            padding: '12px 20px 16px',
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
