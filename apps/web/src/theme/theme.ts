import type { Theme, ThemeOptions } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import type { PaletteMode } from '@mui/material';
import { designTokens } from './tokens';
import { gradients } from './gradients';

// 扩展 Theme 接口以包含 gradients
declare module '@mui/material/styles' {
  interface Theme {
    gradients: typeof gradients;
  }
  interface ThemeOptions {
    gradients?: typeof gradients;
  }
}

const createBaseTheme = (mode: PaletteMode): ThemeOptions => {
  const isDark = mode === 'dark';

  return {
    palette: {
      mode,
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
        default: isDark ? designTokens.colors.grey[900] : designTokens.colors.background.default,
        paper: isDark ? designTokens.colors.grey[800] : designTokens.colors.background.paper,
      },
      text: {
        primary: isDark ? designTokens.colors.grey[100] : designTokens.colors.text.primary,
        secondary: isDark ? designTokens.colors.grey[400] : designTokens.colors.text.secondary,
      },
      divider: isDark ? designTokens.colors.grey[700] : designTokens.colors.border.default,
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
    shadows: isDark
      ? ([
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
        ] as ThemeOptions['shadows'])
      : ([
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
        ] as ThemeOptions['shadows']),
    transitions: {
      duration: designTokens.transitions.duration,
      easing: designTokens.transitions.easing,
    },
    breakpoints: {
      values: designTokens.breakpoints.values,
    },
  };
};

export const createCustomTheme = (mode: PaletteMode): Theme => {
  const baseTheme = createBaseTheme(mode);
  const isDark = mode === 'dark';

  return createTheme({
    ...baseTheme,
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
            borderRadius: designTokens.borderRadius.lg,
            boxShadow: designTokens.shadows.sm,
            border: `1px solid ${designTokens.colors.border.default}`,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: designTokens.borderRadius.md,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: designTokens.borderRadius.xl,
          },
        },
      },
      MuiPopover: {
        styleOverrides: {
          paper: {
            borderRadius: designTokens.borderRadius.lg,
            boxShadow: designTokens.shadows.xl,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: designTokens.borderRadius.sm,
            fontSize: designTokens.typography.fontSize.xs,
            padding: '8px 12px',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: designTokens.borderRadius.md,
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
            borderBottom: `1px solid ${designTokens.colors.border.default}`,
          },
          head: {
            fontWeight: designTokens.typography.fontWeight.semibold,
            backgroundColor: isDark ? designTokens.colors.grey[800] : designTokens.colors.grey[50],
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            // In dark mode, use a slightly lighter background for table headers
            backgroundColor: isDark ? designTokens.colors.grey[800] : designTokens.colors.grey[50],
          },
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
            borderRadius: 2,
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
          root: {
            height: 56,
            boxShadow: designTokens.shadows.sm,
            backgroundColor: isDark
              ? designTokens.colors.grey[800]
              : designTokens.colors.background.paper,
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: designTokens.borderRadius.md,
            transition: 'all 150ms ease',
            '&.Mui-selected': {
              backgroundColor: isDark
                ? 'rgba(59, 130, 246, 0.15)'
                : designTokens.colors.primary[50],
              borderLeft: `3px solid ${designTokens.colors.primary.main}`,
              color: designTokens.colors.primary.main,
              '&:hover': {
                backgroundColor: isDark
                  ? 'rgba(59, 130, 246, 0.15)'
                  : designTokens.colors.primary[50],
              },
            },
          },
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
          standardSuccess: {
            backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : designTokens.colors.success[50],
            color: isDark ? designTokens.colors.success[300] : designTokens.colors.success[800],
          },
          standardError: {
            backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : designTokens.colors.error[50],
            color: isDark ? designTokens.colors.error[300] : designTokens.colors.error[800],
          },
          standardWarning: {
            backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : designTokens.colors.warning[50],
            color: isDark ? designTokens.colors.warning[300] : designTokens.colors.warning[800],
          },
          standardInfo: {
            backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : designTokens.colors.info[50],
            color: isDark ? designTokens.colors.info[300] : designTokens.colors.info[800],
          },
        },
      },
      MuiAvatar: {
        styleOverrides: {
          root: {
            fontSize: designTokens.typography.fontSize.md,
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
          },
          focused: {
            color: designTokens.colors.primary.main,
          },
          shrink: {
            fontSize: designTokens.typography.fontSize.sm,
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
          root: {
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          },
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
            border: `1px solid ${designTokens.colors.border.default}`,
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
            borderTop: `1px solid ${designTokens.colors.border.default}`,
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
            borderRadius: 2,
          },
          rail: {
            height: 4,
            borderRadius: 2,
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
    },
  });
};

export default createCustomTheme;
