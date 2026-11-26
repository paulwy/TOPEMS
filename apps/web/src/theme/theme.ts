import type { Theme, ThemeOptions } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import { enUS, zhCN } from '@mui/material/locale';
import i18n from '@/i18n';
import { designTokens, semanticTokens } from './tokens';
import { gradients } from './gradients';

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
  // 应用自定义 zIndex 层级（与 designTokens.zIndex 一一对应）
  interface ZIndex {
    base: number;
    dropdown: number;
    sticky: number;
    fixed: number;
    popoverLayer: number;
    tooltipLayer: number;
    modalLayer: number;
    toastLayer: number;
    raised: number;
    stickyHeader: number;
    dragHandle: number;
    contentLayer: number;
    annotationPopover: number;
    annotationCard: number;
    menuBackdrop: number;
    overlay: number;
    devToolsBar: number;
    topmost: number;
    devToolsPanel: number;
    devToolsModal: number;
    floatingDock: number;
  }
}

// 扩展 Palette 颜色，增加 cyberpunk 专属字段及设计令牌扩展色组
declare module '@mui/material/styles' {
  interface PaletteColor {
    /** designTokens 提供 50-900 完整色阶 */
    [index: number]: string;
  }
  interface Palette {
    accent?: { main: string; light: string; dark: string };
    teal: typeof designTokens.colors.teal;
    orange: typeof designTokens.colors.orange;
    yellow: typeof designTokens.colors.yellow;
    blue: typeof designTokens.colors.blue;
    cyan: typeof designTokens.colors.cyan;
    purple: typeof designTokens.colors.purple;
    pink: typeof designTokens.colors.pink;
    surface: typeof designTokens.colors.surface;
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

const lightShadows = [...Array(25)].map((_, i) => {
  // MUI shadows 是 0..24 的数组（长度 25），以下为对齐设计 tokens 的合理映射
  const shadows = [
    designTokens.shadows.none, // 0
    designTokens.shadows.xs, // 1
    designTokens.shadows.sm, // 2
    designTokens.shadows.md, // 3
    designTokens.shadows.lg, // 4
    designTokens.shadows.xl, // 5
    designTokens.shadows['2xl'], // 6
    designTokens.shadows['3xl'], // 7
    designTokens.shadows.inner, // 8
    designTokens.shadows.sm, // 9
    designTokens.shadows.md, // 10
    designTokens.shadows.lg, // 11
    designTokens.shadows.xl, // 12
    designTokens.shadows['2xl'], // 13
    designTokens.shadows['3xl'], // 14
    designTokens.shadows.inner, // 15
    designTokens.shadows.sm, // 16
    designTokens.shadows.md, // 17
    designTokens.shadows.lg, // 18
    designTokens.shadows.xl, // 19
    designTokens.shadows['2xl'], // 20
    designTokens.shadows['3xl'], // 21
    designTokens.shadows.inner, // 22
    designTokens.shadows.sm, // 23
    designTokens.shadows.md, // 24
  ];
  return shadows[i] ?? designTokens.shadows.none;
});

/**
 * Cyberpunk 赛博朋克色彩方案
 * - 基础色：深空（#0a0a1a），比暗 mode 更纯黑
 * - 主色：霓虹青（#00ffff）替换原 primary 蓝
 * - 副色：霓虹品红（#ff00ff）
 * - 强调色：霓虹金（#ffd700）
 * - 玻璃态：半透明 + backdrop-filter 组合
 */
const customShadowsLight = {
  card: designTokens.shadows.sm,
  dropdown: designTokens.shadows.lg,
  dialog: designTokens.shadows.xl,
  focus: `0 0 0 2px ${designTokens.colors.background.paper}, 0 0 0 4px ${designTokens.colors.primary[400]}`,
  dangerButton: '0 4px 12px rgba(239, 68, 68, 0.30)',
  dangerButtonHover: '0 6px 16px rgba(239, 68, 68, 0.40)',
};

const customShadowsDark = {
  ...customShadowsLight,
  card: '0 1px 2px 0 rgba(0,0,0,0.20), 0 1px 3px 0 rgba(0,0,0,0.15)',
  dropdown: '0 8px 24px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.25)',
  dialog: '0 24px 48px rgba(0,0,0,0.45), 0 8px 16px rgba(0,0,0,0.35)',
  focus: `0 0 0 2px ${designTokens.colors.grey[950]}, 0 0 0 4px ${designTokens.colors.primary[400]}`,
};

/**
 * 基础 palette 生成（shared typography/shape/spacing/zIndex/gradients 独立于 mode）
 * palette.mode 只决定 MUI 组件内置的深色样式规则切换（.Mui-selected 背景色等）
 * —— 自定义组件通过 theme.applyStyles('dark', {...}) 实现多态
 */
export const createCustomTheme = (): Theme => {
  // MUI 组件默认文案（TablePagination/DatePicker 等）跟随应用语言
  const muiLocale = i18n.language === 'en' ? enUS : zhCN;
  return createTheme(
    {
      // 顶层 palette 只放共享配置（mode-agnostic），light/dark 专属色移到 colorSchemes
      palette: {
        // 设计令牌扩展色组 — 供 sx prop 通过 token path 引用（light/dark 共用同一组）
        teal: designTokens.colors.teal,
        orange: designTokens.colors.orange,
        yellow: designTokens.colors.yellow,
        blue: designTokens.colors.blue,
        cyan: designTokens.colors.cyan,
        purple: designTokens.colors.purple,
        pink: designTokens.colors.pink,
        surface: designTokens.colors.surface,
        accent: {
          main: '#ffd700',
          light: '#fcd34d',
          dark: '#f59e0b',
        },
      },
      colorSchemes: {
        light: {
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
              primary: '#f1f5f9',
              secondary: designTokens.colors.grey[300],
              muted: designTokens.colors.grey[500],
            },
            divider: designTokens.colors.grey[700],
            // 暗色下把灰阶整体反相：大量历史页面用 grey.100 当卡片底、grey.900 当文字，
            // 若沿用亮色灰阶，暗色里就是「浅底 + 深字」甚至同色不可见。
            // 反相后成对使用（底 grey.100 + 字 grey.900）依然成立，单边使用也不会撞色。
            grey: {
              ...designTokens.colors.grey,
              50: '#0b1220',
              100: '#111a2e',
              200: '#1a2438',
              300: '#243044',
              400: '#64748b',
              500: '#94a3b8',
              600: '#cbd5e1',
              700: '#e2e8f0',
              800: '#f1f5f9',
              900: '#f8fafc',
            },
            // 暗色下用语义色 light 变体（400 阶），保证深色背景上可读
            primary: {
              ...designTokens.colors.primary,
              50: '#0d1b33',
              100: '#12274a',
              main: designTokens.colors.primary[400],
              light: designTokens.colors.primary[300],
              dark: designTokens.colors.primary[500],
              contrastText: '#0f172a',
            },
            secondary: {
              ...designTokens.colors.secondary,
              50: '#181033',
              100: '#22174a',
              main: designTokens.colors.secondary[400],
              light: designTokens.colors.secondary[300],
              dark: designTokens.colors.secondary[500],
              contrastText: '#0f172a',
            },
            success: {
              ...designTokens.colors.success,
              50: '#0b2216',
              100: '#123320',
              main: designTokens.colors.success[400],
              light: designTokens.colors.success[300],
              dark: designTokens.colors.success[500],
            },
            warning: {
              ...designTokens.colors.warning,
              50: '#2a1d07',
              100: '#3a290b',
              main: designTokens.colors.warning[400],
              light: designTokens.colors.warning[300],
              dark: designTokens.colors.warning[500],
            },
            error: {
              ...designTokens.colors.error,
              50: '#2a1014',
              100: '#3a171c',
              main: designTokens.colors.error[400],
              light: designTokens.colors.error[300],
              dark: designTokens.colors.error[500],
            },
            info: {
              ...designTokens.colors.info,
              50: '#07202e',
              100: '#0b2c40',
              main: designTokens.colors.info[400],
              light: designTokens.colors.info[300],
              dark: designTokens.colors.info[500],
            },
            action: {
              selected: 'rgba(148, 163, 184, 0.16)',
              hover: 'rgba(148, 163, 184, 0.08)',
              disabled: 'rgba(148, 163, 184, 0.2)',
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
      zIndex: { ...designTokens.zIndex, floatingDock: 1101 } as ThemeOptions['zIndex'],
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
              transition: `transform ${designTokens.motion.transition.base}, box-shadow ${designTokens.motion.transition.base}, border-color ${designTokens.motion.transition.base}`,
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: semanticTokens.elevation.cardHover,
              },
              '&:active': {
                transform: 'translateY(0) scale(0.99)',
              },
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
          defaultProps: {
            getItemAriaLabel: (
              type:
                'page' | 'first' | 'last' | 'next' | 'previous' | 'start-ellipsis' | 'end-ellipsis',
              page: number | null,
              selected: boolean
            ) => {
              if (type === 'page' && page !== null) {
                return selected
                  ? i18n.t('theme.pagination.go_to_page_current', { page })
                  : i18n.t('theme.pagination.go_to_page', { page });
              }
              if (type === 'start-ellipsis' || type === 'end-ellipsis') {
                return i18n.t('theme.pagination.ellipsis');
              }
              const labels: Record<string, string> = {
                first: i18n.t('theme.pagination.go_to_first'),
                last: i18n.t('theme.pagination.go_to_last'),
                next: i18n.t('theme.pagination.go_to_next'),
                previous: i18n.t('theme.pagination.go_to_previous'),
              };
              return labels[type] ?? '';
            },
          },
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
              height: 2,
              borderRadius: '2px 2px 0 0',
              background: semanticTokens.brand.tabUnderline,
              boxShadow: `0 -2px 8px ${designTokens.colors.primary[400]}40`,
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
              transition: `color ${designTokens.motion.transition.fast}, background-color ${designTokens.motion.transition.fast}`,
              '&:hover': {
                backgroundColor: designTokens.colors.action.hover,
              },
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
              backgroundColor: semanticTokens.brand.glass.background,
              borderBottom: `1px solid ${semanticTokens.brand.glass.border}`,
              backdropFilter: semanticTokens.brand.glass.backdropFilter,
              WebkitBackdropFilter: semanticTokens.brand.glass.backdropFilter,
              ...theme.applyStyles('dark', {
                backgroundColor: semanticTokens.brand.glass.backgroundDark,
                borderBottomColor: semanticTokens.brand.glass.borderDark,
              }),
            }),
          },
        },
        MuiListItemButton: {
          styleOverrides: {
            root: ({ theme }) => ({
              borderRadius: designTokens.borderRadius.md,
              transition: `color ${designTokens.motion.transition.fast}, background-color ${designTokens.motion.transition.fast}`,
              '&.Mui-selected': {
                backgroundColor: designTokens.colors.action.selected,
                borderLeft: `3px solid ${designTokens.colors.primary.main}`,
                color: designTokens.colors.primary.main,
                '&:hover': {
                  backgroundColor: designTokens.colors.action.selected,
                },
                ...theme.applyStyles('dark', {
                  backgroundColor: designTokens.colors.brand.semantic.primarySubtle,
                  '&:hover': {
                    backgroundColor: designTokens.colors.brand.semantic.primarySubtle,
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
            input: ({ theme }) => ({
              // MUI 默认占位符是 rgba(0,0,0,0.38)（白底仅 2.7:1，暗色下也不跟随明暗），
              // 统一按当前色彩方案的次要文字取色，亮/暗都保持可读。
              '&::placeholder': {
                color: theme.palette.text.secondary,
                opacity: 1,
              },
            }),
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
              '&.MuiInputLabel-shrink': {
                // 2026-10-17 readability fix: MUI v7 uses MuiInputLabel-shrink
                // (v5 &.Mui-shrink no longer matches). Shrink label is scaled by
                // transform scale(0.75), so 14px x 0.75 = 10.5px visual < 12px
                // (Lighthouse legible-text audit failure). Bump to 16px -> 12px
                // visual, clears the audit with a negligible visual change.
                fontSize: 16,
              },
            },
          },
        },
        MuiOutlinedInput: {
          styleOverrides: {
            notchedOutline: {
              // 2026-10-17 readability fix: MUI notched legend defaults to
              // 0.75em (14px x 0.75 = 10.5px < 12px, Lighthouse legible-text
              // audit failure). Override to 12px, aligned with the shrink label
              // visual (16px x 0.75 = 12px).
              '& legend': {
                fontSize: 12,
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
        // Localised table pagination display text (overrides MUI default labels)
        MuiTablePagination: {
          defaultProps: {
            labelDisplayedRows: ({
              from,
              to,
              count,
            }: {
              from: number;
              to: number;
              count: number;
            }) => {
              if (count === -1) {
                return i18n.t('theme.table_pagination.rows_range_over', {
                  from,
                  to,
                  cap: to,
                });
              }
              return i18n.t('theme.table_pagination.rows_range', { from, to, count });
            },
          },
        },
      },
    },
    muiLocale
  );
};

export default createCustomTheme;

/**
 * 按主题返回对应的 customShadows（MUI colorSchemes 不接受 customShadows，因此在组件层使用）
 *
 * - light: 基础 shadows（写入 theme.customShadows）
 * - dark: 暗色调 shadows（应用于 dark 模式）
 */
export const themeCustomShadows = {
  light: customShadowsLight,
  dark: customShadowsDark,
} as const;
