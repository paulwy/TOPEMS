import React from 'react';
import type { ColumnDef } from '@tanstack/react-table';

type GridRowSelectionModel = (string | number)[];
type GridPaginationModel = { page: number; pageSize: number };
type GridFilterModel = {
  items: unknown[];
  quickFilterLogicOperator?: string;
  quickFilterValues?: string[];
};
type GridSortModel = { field: string; sort: 'asc' | 'desc' }[];
type GridRowModel = Record<string, unknown>;

/**
 * ProDataTable adapter type definitions
 * Maps custom DataTable API to MUI X DataGrid Pro API
 *
 * These types define the public interface of the future ProDataTable
 * wrapper component. The wrapper will internally translate between
 * the custom DataTable API and the DataGrid Pro API so that consuming
 * pages can migrate with minimal code changes.
 */

// ---------------------------------------------------------------------------
// Column Definitions
// ---------------------------------------------------------------------------

/**
 * ProDataTable column definition
 *
 * A simplified column definition that covers the most common DataGrid Pro
 * column options while staying close to the existing DataTable ColumnDef shape.
 */
export interface ProDataTableColumn<TData = Record<string, unknown>> {
  /** Unique field name matching a key in the row data object */
  field: string;

  /** Column header display text */
  headerName?: string;

  /** Column width in pixels */
  width?: number;

  /** Minimum column width in pixels */
  minWidth?: number;

  /** Maximum column width in pixels */
  maxWidth?: number;

  /** Flexible width coefficient — distributes remaining space proportionally */
  flex?: number;

  /** Hide the column by default */
  hide?: boolean;

  /** Enable sorting for this column */
  sortable?: boolean;

  /** Enable filtering for this column */
  filterable?: boolean;

  /** Enable manual column width resizing */
  resizable?: boolean;

  /** Pin column to left or right edge */
  pinned?: 'left' | 'right' | false;

  /** Enable inline cell editing */
  editable?: boolean;

  /** Column data type — drives default rendering, filtering, and sorting behavior */
  type?: 'string' | 'number' | 'boolean' | 'date' | 'singleSelect' | 'actions';

  /** Options for singleSelect type columns */
  valueOptions?: unknown[];

  /** Get available options dynamically for singleSelect columns */
  getValueOptions?: (params: { row: TData }) => unknown[];

  /** Custom cell renderer */
  renderCell?: (params: {
    row: TData;
    value: unknown;
    field: string;
    id: string | number;
    formattedValue?: string;
  }) => React.ReactNode;

  /** Value formatter for display purposes */
  valueFormatter?: (params: { value: unknown; row?: TData }) => string;

  /** Value parser for editing (converts display value back to data value) */
  valueParser?: (params: { value: string }) => unknown;

  /** Value getter for computed / derived column values */
  valueGetter?: (params: { row: TData; value: unknown }) => unknown;

  /** Value setter for editable columns */
  valueSetter?: (params: {
    row: TData;
    value: unknown;
    oldValue: unknown;
  }) => TData;

  /** Column header cell renderer */
  renderHeader?: (params: {
    colDef: ProDataTableColumn<TData>;
    field: string;
  }) => React.ReactNode;

  /** Cell alignment */
  align?: 'left' | 'center' | 'right';

  /** Header alignment (defaults to align) */
  headerAlign?: 'left' | 'center' | 'right';

  /** Column description — shown in tooltip */
  description?: string;

  /** Column grouping ID (for columnGrouping feature) */
  children?: string[];

  /** Width used when auto-sizing columns */
  computedWidth?: number;

  /** Header component class name */
  headerClassName?: string;

  /** Cell component class name */
  cellClassName?: string | ((params: { row: TData; value: unknown }) => string);
}

// ---------------------------------------------------------------------------
// Component Props
// ---------------------------------------------------------------------------

/**
 * Column grouping configuration
 * Used for multi-level column headers in financial reports, etc.
 */
export interface ProDataGridColumnGroup {
  /** Unique group identifier */
  groupId: string;

  /** Group header display text */
  headerName: string;

  /** Child column field names or nested group IDs */
  children: string[];

  /** Optional group description */
  description?: string;

  /** Column header alignment within the group */
  headerAlign?: 'left' | 'center' | 'right';

  /** Render custom group header */
  renderHeaderGroup?: (params: {
    groupId: string;
    headerName: string;
    children: string[];
    description?: string;
  }) => React.ReactNode;
}

/**
 * Aggregation configuration
 * Defines column-level aggregation functions for summary rows
 */
export interface ProDataTableAggregation {
  /** Map of column field names to their aggregation configuration */
  aggregations: Record<
    string,
    {
      /** Aggregation function name */
      aggregationFunction:
        | 'sum'
        | 'avg'
        | 'min'
        | 'max'
        | 'size'
        | string;
      /** Which rows to include in the aggregation */
      aggregationRows?: 'all' | 'visible';
    }
  >;
}

/**
 * ProDataTable component props
 *
 * Designed to closely mirror the existing DataTable props interface
 * so that page-level code can migrate with import-only changes.
 */
export interface ProDataTableProps<
  TData extends GridRowModel = Record<string, unknown>
> {
  // ---- Data & Columns ----

  /** Column definitions */
  columns: ProDataTableColumn<TData>[];

  /** Row data array */
  rows: TData[];

  // ---- Density & Layout ----

  /** Row density preset */
  density?: 'compact' | 'standard' | 'comfortable';

  /** Grid height. Use `'auto'` to fit content, or a number for fixed height. */
  height?: number | 'auto';

  /** Auto-height calculation based on row count and density */
  autoHeight?: boolean;

  /** Full width container mode — grid fills parent width */
  autoWidth?: boolean;

  // ---- Pagination ----

  /** Enable pagination */
  pagination?: boolean;

  /** Controlled pagination model */
  paginationModel?: GridPaginationModel;

  /** Pagination model change handler */
  onPaginationModelChange?: (model: GridPaginationModel) => void;

  /** Total row count (for server-side pagination) */
  rowCount?: number;

  /** Available page size options */
  pageSizeOptions?: number[];

  // ---- Sorting ----

  /** Sorting mode */
  sortingMode?: 'client' | 'server';

  /** Controlled sort model */
  sortModel?: GridSortModel;

  /** Sort model change handler */
  onSortModelChange?: (model: GridSortModel) => void;

  // ---- Filtering ----

  /** Filter mode */
  filterMode?: 'client' | 'server';

  /** Controlled filter model */
  filterModel?: GridFilterModel;

  /** Filter model change handler */
  onFilterModelChange?: (model: GridFilterModel) => void;

  /** Quick filter values (search bar integration) */
  quickFilterValues?: string[];

  /** Fields to search in quick filter mode */
  quickFilterKeys?: string[];

  // ---- Row Selection ----

  /** Enable row selection */
  rowSelection?: boolean;

  /** Controlled row selection model */
  rowSelectionModel?: GridRowSelectionModel;

  /** Row selection model change handler */
  onRowSelectionModelChange?: (model: GridRowSelectionModel) => void;

  /** Show checkbox selection column */
  checkboxSelection?: boolean;

  /** Disable multi-row selection (single-select mode) */
  disableMultipleRowSelection?: boolean;

  /** Disable row selection on click (only via checkbox) */
  disableRowSelectionOnClick?: boolean;

  /** Row selection propagation — select parent selects all children */
  rowSelectionPropagation?: {
    parents: boolean;
    children: boolean;
  };

  // ---- Row Interaction ----

  /** Row click handler */
  onRowClick?: (params: { row: TData; id: string | number }) => void;

  /** Double-click handler */
  onRowDoubleClick?: (params: { row: TData; id: string | number }) => void;

  // ---- Column Pinning (Pro) ----

  /** Pinned column configuration */
  pinnedColumns?: {
    left?: string[];
    right?: string[];
  };

  // ---- Column Grouping (Pro) ----

  /** Column grouping model for multi-level headers */
  columnGrouping?: ProDataGridColumnGroup[];

  // ---- Aggregation (Pro) ----

  /** Aggregation configuration for summary rows */
  aggregation?: ProDataTableAggregation;

  // ---- Tree Data (Pro) ----

  /** Enable tree data mode */
  treeData?: boolean;

  /** Extract the tree path from a row for tree data rendering */
  getTreeDataPath?: (row: TData) => string[];

  /** Check if a node is a leaf in the tree */
  isGroupableByColumns?: (row: TData) => boolean;

  // ---- Server-Side Data ----

  /** Fetch rows callback for server-side data loading */
  onFetchData?: (params: {
    page: number;
    pageSize: number;
    sortModel: GridSortModel;
    filterModel: GridFilterModel;
  }) => Promise<{
    rows: TData[];
    rowCount: number;
  }>;

  // ---- Loading State ----

  /** Show loading overlay */
  loading?: boolean;

  // ---- Custom Features (preserved from DataTable) ----

  /** Search field name — enables search input in toolbar */
  searchKey?: string;

  /** Search input placeholder text */
  searchPlaceholder?: string;

  /** Show search input in toolbar */
  showSearch?: boolean;

  /** Show export button in toolbar */
  showExport?: boolean;

  /** Show filter button in toolbar */
  showFilters?: boolean;

  /** Show refresh button in toolbar */
  showRefresh?: boolean;

  /** Refresh callback */
  onRefresh?: () => void;

  /** Show row selection checkboxes (legacy — maps to checkboxSelection) */
  showSelection?: boolean;

  /** Empty data message */
  emptyMessage?: string;

  /** Custom empty state component */
  emptyState?: React.ReactNode;

  /** Show row numbers column */
  showRowNumber?: boolean;

  /** Enable striped rows */
  striped?: boolean;

  /** Enable row expansion via detail panel */
  enableRowExpansion?: boolean;

  /** Row expansion content renderer */
  expandedRowRender?: (row: TData) => React.ReactNode;

  /** Show create button in toolbar */
  showCreate?: boolean;

  /** Create button label */
  createLabel?: string;

  /** Create button click handler */
  onCreate?: () => void;

  /** Extra action buttons in toolbar */
  extraActions?: React.ReactNode;

  /** Export file name */
  exportFileName?: string;

  /** Custom export function */
  exportData?: (
    format: string,
    columns: ProDataTableColumn<TData>[],
    rows: TData[]
  ) => Promise<{ success: boolean; error?: unknown }>;

  /** Export success callback */
  onExportSuccess?: () => void;

  /** Export error callback */
  onExportError?: (error: Error) => void;

  /** Enable column config persistence (localStorage) */
  persistColumnConfig?: boolean;

  /** Column config storage key prefix */
  columnConfigKey?: string;

  // ---- Identification ----

  /** Get unique row ID */
  getRowId?: (row: TData) => string;

  // ---- Styling ----

  /** MUI system prop for custom styling */
  sx?: import('@mui/material/styles').SxProps;

  /** Additional CSS class names */
  className?: string;
}

// ---------------------------------------------------------------------------
// Migration Helpers
// ---------------------------------------------------------------------------

/**
 * Column definition migration helper
 *
 * Converts a custom DataTable `ColumnDef` (from @tanstack/react-table) to a
 * `ProDataTableColumn` compatible with DataGrid Pro.
 *
 * Handles the most common field mappings. For advanced configurations
 * (pinning, grouping, aggregation), augment the result manually.
 *
 * @param col  - Original DataTable ColumnDef
 * @param index - Column index (fallback for field name)
 * @returns ProDataTableColumn ready for use in ProDataTable
 *
 * @example
 * ```tsx
 * const oldColumns: ColumnDef<User>[] = [...];
 * const newColumns = oldColumns.map((col, i) => migrateColumn(col, i));
 * ```
 */
export function migrateColumn<TData>(
  col: ColumnDef<TData, unknown>,
  index: number
): ProDataTableColumn<TData> {
  const field = (col.id as string) || `col_${index}`;
  const result: ProDataTableColumn<TData> = {
    field,
    headerName: (col.header as string) || (col.id as string),
    width: col.size,
    minWidth: col.minSize,
    sortable: col.enableSorting !== false,
    filterable: true,
    resizable: true,
  };

  // Map cell type to column type
  if ((col as any).cellType === 'number') {
    result.type = 'number';
    result.align = 'right';
    result.headerAlign = 'right';
  } else if ((col as any).cellType === 'boolean') {
    result.type = 'boolean';
    result.align = 'center';
    result.headerAlign = 'center';
  }

  // Map cell renderer
  if (col.cell && typeof col.cell === 'function') {
    const originalCell = col.cell as any;
    result.renderCell = (params) =>
      originalCell({ value: params.value, row: params.row as TData, index });
  }

  // Map header renderer
  if (col.header && typeof col.header !== 'string') {
    const originalHeader = col.header;
    result.renderHeader = () =>
      originalHeader({ column: col as any } as any) as React.ReactNode;
  }

  return result;
}

/**
 * Batch-migrate an array of ColumnDef to ProDataTableColumn.
 *
 * @param columns - Array of DataTable ColumnDef
 * @returns Array of ProDataTableColumn
 */
function migrateColumns<TData>(
  columns: ColumnDef<TData, unknown>[]
): ProDataTableColumn<TData>[] {
  return columns.map((col, index) => migrateColumn<TData>(col, index));
}

/**
 * Selection callback adapter
 *
 * Converts DataGrid Pro's rowSelectionModel (array) to DataTable's
 * onSelectionChange signature (Set<string> | string[]).
 */
function adaptSelectionCallback(
  onSelectionChange: (keys: Set<string> | string[]) => void
): (model: GridRowSelectionModel) => void {
  return (model: GridRowSelectionModel) => {
    const stringKeys = model.map(String);
    onSelectionChange(new Set(stringKeys));
  };
}

/**
 * Pagination callback adapter
 *
 * Splits DataGrid Pro's unified paginationModel callback into the
 * separate onPageChange / onPageSizeChange callbacks used by DataTable.
 */
function adaptPaginationCallbacks(options: {
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}): (model: GridPaginationModel) => void {
  return (model: GridPaginationModel) => {
    options.onPageChange?.(model.page);
    options.onPageSizeChange?.(model.pageSize);
  };
}
