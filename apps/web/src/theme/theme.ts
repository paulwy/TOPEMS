import type { Theme, ThemeOptions } from "@mui/material/styles";
import { createTheme } from "@mui/material/styles";
import type { PaletteMode } from "@mui/material";
import { designTokens } from "./tokens";
import { gradients } from "./gradients";

// 扩展 Theme 接口以包含 gradients
declare module "@mui/material/styles" {
  interface Theme {
    gradients: typeof gradients;
  }
  interface ThemeOptions {
    gradients?: typeof gradients;
  }
}

const createBaseTheme = (mode: PaletteMode): ThemeOptions => {
  const isDark = mode === "dark";

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
        default: isDark
          ? designTokens.colors.grey[900]
          : designTokens.colors.background.default,
        paper: isDark
          ? designTokens.colors.grey[800]
          : designTokens.colors.background.paper,
      },
      text: {
        primary: isDark
          ? designTokens.colors.grey[100]
          : designTokens.colors.text.primary,
        secondary: isDark
          ? designTokens.colors.grey[400]
          : designTokens.colors.text.secondary,
      },
      divider: isDark
        ? designTokens.colors.grey[700]
        : designTokens.colors.border.default,
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

  return createTheme({
    ...baseTheme,
    gradients,
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            borderRadius: designTokens.borderRadius.md,
            fontWeight: designTokens.typography.fontWeight.medium,
            fontSize: designTokens.typography.fontSize.sm,
            padding: "6px 16px",
            minWidth: "auto",
            "&.MuiButton-contained": {
              boxShadow: designTokens.shadows.sm,
              "&:hover": {
                boxShadow: designTokens.shadows.md,
              },
            },
            "&.MuiButton-outlined": {
              borderWidth: "1px",
            },
            "&.MuiButton-text": {
              padding: "6px 12px",
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            "& .MuiOutlinedInput-root": {
              borderRadius: designTokens.borderRadius.md,
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderWidth: "2px",
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
            padding: "8px 12px",
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
            borderCollapse: "separate",
            borderSpacing: 0,
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            "&:last-child td, &:last-child th": {
              borderBottom: 0,
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            padding: "12px 16px",
            borderBottom: `1px solid ${designTokens.colors.border.default}`,
          },
          head: {
            fontWeight: designTokens.typography.fontWeight.semibold,
            backgroundColor: designTokens.colors.grey[50],
          },
        },
      },
      MuiPagination: {
        styleOverrides: {
          root: {
            "& .Mui-selected": {
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
            textTransform: "none",
            fontWeight: designTokens.typography.fontWeight.medium,
            minWidth: "auto",
            padding: "12px 20px",
          },
        },
      },
      MuiCheckbox: {
        styleOverrides: {
          root: {
            "&.Mui-checked": {
              color: designTokens.colors.primary.main,
            },
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          root: {
            "& .MuiSwitch-track": {
              borderRadius: designTokens.borderRadius.full,
            },
            "& .MuiSwitch-thumb": {
              borderRadius: designTokens.borderRadius.full,
            },
            "&.Mui-checked": {
              "& .MuiSwitch-track": {
                backgroundColor: designTokens.colors.primary.main,
              },
            },
          },
        },
      },
      MuiRadio: {
        styleOverrides: {
          root: {
            "&.Mui-checked": {
              color: designTokens.colors.primary.main,
            },
          },
        },
      },
    },
  });
};

export default createCustomTheme;
