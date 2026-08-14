import type { ThemeOptions } from '@mui/material/styles';
import { designTokens } from '@topems/tokens';

/**
 * MUI X DataGrid theme overrides
 * Integrates DataGrid Pro with the TOPEMS design system (CSS Variables mode)
 *
 * Apply via:
 * ```ts
 * import { getDataGridTheme } from './dataGridTheme';
 * const theme = createCustomTheme();
 * theme.components = { ...theme.components, ...getDataGridTheme() };
 * ```
 *
 * Note: @mui/x-data-grid-pro must be installed for MuiDataGridPro overrides to take effect.
 * The type is Record<string, unknown> since DataGrid component types are not available
 * until the package is installed.
 */

export const getDataGridTheme = (): Record<string, unknown> => ({
  MuiDataGrid: {
    styleOverrides: {
      root: {
        // Use CSS variables for automatic light/dark adaptation
        border: '1px solid var(--mui-palette-divider)',
        borderRadius: 'var(--mui-shape-borderRadius)',

        '& .MuiDataGrid-cell': {
          borderColor: 'var(--mui-palette-divider)',
        },

        '& .MuiDataGrid-columnHeaders': {
          backgroundColor: 'var(--mui-palette-grey-50)',
          borderColor: 'var(--mui-palette-divider)',
        },
        '& .MuiDataGrid-columnHeader': {
          fontWeight: 600,
          fontSize: '0.8125rem',
        },
        '& .MuiDataGrid-columnHeaderTitle': {
          fontWeight: 600,
          fontSize: '0.8125rem',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        },
        '& .MuiDataGrid-columnHeaderDraggableContainer': {
          display: 'flex',
          alignItems: 'center',
        },

        '& .MuiDataGrid-row': {
          '&:hover': {
            backgroundColor: 'var(--mui-palette-action-hover)',
          },
          '&.Mui-selected': {
            backgroundColor: 'var(--mui-palette-primary-light)',
          },
        },

        '& .MuiDataGrid-footerContainer': {
          borderColor: 'var(--mui-palette-divider)',
        },

        '& .MuiDataGrid-toolbarContainer': {
          padding: `${designTokens.spacing.sm} 16px`,
          borderBottom: '1px solid var(--mui-palette-divider)',
          gap: 8,
        },

        '& .MuiDataGrid-filterForm': {
          padding: `${designTokens.spacing.sm} 16px`,
        },
        '& .MuiDataGrid-filterFormColumnInput': {
          paddingRight: 8,
        },

        '& .MuiDataGrid-menu': {
          borderRadius: 'var(--mui-shape-borderRadius)',
        },
        '& .MuiDataGrid-menuIcon': {
          width: 24,
          height: 24,
        },

        '& .MuiDataGrid-checkboxInput': {
          color: 'inherit',
        },

        '& .MuiDataGrid-rowReorderCellPlaceholder': {
          backgroundColor: 'var(--mui-palette-background-paper)',
        },

        '& .MuiDataGrid-scrollbar': {
          '&::-webkit-scrollbar': { width: 8, height: 8 },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'var(--mui-palette-action-disabled)',
            borderRadius: 4,
          },
          '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
        },

        '& .MuiDataGrid-noRowsOverlay': {
          flexDirection: 'column',
          gap: 8,
        },

        '& .MuiDataGrid-overlay': {
          backgroundColor:
            'color-mix(in srgb, var(--mui-palette-background-default) 60%, transparent)',
        },

        '& .MuiTablePagination-root': { minHeight: 52 },
        '& .MuiTablePagination-toolbar': { minHeight: 52, paddingRight: 16 },
        '& .MuiTablePagination-selectLabel': { fontSize: '0.8125rem' },
        '& .MuiTablePagination-displayedRows': { fontSize: '0.8125rem' },
        '& .MuiTablePagination-select': {
          fontSize: '0.8125rem',
          borderRadius: 'var(--mui-shape-borderRadius)',
        },
      },
    },
    defaultProps: {
      density: 'standard' as const,
      pageSizeOptions: [10, 25, 50, 100],
      disableColumnMenu: false,
      disableRowSelectionOnClick: false,
    },
  },

  MuiDataGridPro: {
    styleOverrides: {
      root: {
        '& .MuiDataGrid-pinnedColumnHeaders': {
          backgroundColor: 'var(--mui-palette-grey-50)',
          boxShadow: `2px 0 4px -1px ${designTokens.colors.action.selected}`,
        },
        '& .MuiDataGrid-pinnedColumns': {
          backgroundColor: 'var(--mui-palette-grey-50)',
          boxShadow: `2px 0 4px -1px ${designTokens.colors.action.selected}`,
        },
        '& .MuiDataGrid-pinnedRows': {
          boxShadow: `0 -2px 4px -1px ${designTokens.colors.action.selected}`,
        },
        '& .MuiDataGrid-rowReorderColumn': { cursor: 'grab' },
        '& .MuiDataGrid-rowReorderColumn:active': { cursor: 'grabbing' },
        '& .MuiDataGrid-treeDataExpandIcon': { transition: 'transform 200ms ease' },
        '& .MuiDataGrid-aggregationColumnHeader': {
          backgroundColor: 'var(--mui-palette-grey-50)',
        },
        '& .MuiDataGrid-aggregationCell': {
          fontWeight: 600,
          backgroundColor: 'var(--mui-palette-grey-50)',
          borderTop: '1px solid var(--mui-palette-divider)',
        },
        '& .MuiDataGrid-detailPanel': {
          borderBottom: '1px solid var(--mui-palette-divider)',
          backgroundColor: 'var(--mui-palette-background-paper)',
        },
        '& .MuiDataGrid-excelFilterActiveConditionOperator': { fontWeight: 600 },
      },
    },
    defaultProps: {
      density: 'standard' as const,
      pageSizeOptions: [10, 25, 50, 100],
    },
  },
});
