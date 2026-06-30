/**
 * Shared DataTable component
 * Extracted from apps/web with dependency decoupling.
 * Uses TanStack React Table - supports search, sort, filter, pagination, selection, export.
 * Enhanced features: column config persistence, row expansion, advanced filters, virtual scrolling.
 *
 * Decoupled from:
 * - @/store (useAppStore -> addNotification) -> replaced with onExportSuccess/onExportError props
 * - @/hooks/useDataTable (useExportData) -> inlined export logic
 * - @/utils -> removed
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Select,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Checkbox,
  Skeleton,
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  Chip,
  Button,
} from '@mui/material';
import {
  Search,
  Filter,
  Download,
  Plus,
  ChevronLeft,
  ChevronRight,
  Settings2,
  Eye,
  EyeOff,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  getFilteredRowModel,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type PaginationState,
  type VisibilityState,
  type RowData,
} from '@tanstack/react-table';

// ============ Type Definitions ============

/**
 * Row expansion content render function type
 */
export type ExpandedRowRender<TData> = (row: TData) => React.ReactNode;

/**
 * Advanced filter configuration
 */
export interface AdvancedFilter {
  label: string;
  key: string;
  type: 'text' | 'select' | 'date' | 'number';
  options?: { value: string; label: string }[];
  value?: string;
  onChange?: (value: string) => void;
}

/**
 * Export result type
 */
export interface ExportResult {
  success: boolean;
  error?: unknown;
}

/**
 * Export function type for custom export handling
 */
export type ExportDataFn = (format: string, columns: ColumnDef<any, any>[], rows: any[]) => Promise<ExportResult> | ExportResult;

/**
 * DataTable props
 */
export interface DataTableProps<TData, TValue> {
  /** Column definitions */
  columns: ColumnDef<TData, TValue>[];

  /** Data rows */
  data: TData[];

  /** Search field name */
  searchKey?: string;

  /** Search input placeholder */
  searchPlaceholder?: string;

  /** Show search input */
  showSearch?: boolean;

  /** Show filter button */
  showFilters?: boolean;

  /** Show export button */
  showExport?: boolean;

  /** Show row selection checkboxes */
  showSelection?: boolean;

  /** Show create button */
  showCreate?: boolean;

  /** Create button label */
  createLabel?: string;

  /** Create button click callback */
  onCreate?: () => void;

  /** Export file name */
  exportFileName?: string;

  /** Enable pagination */
  enablePagination?: boolean;

  /** Total pages (for server-side pagination) */
  totalPages?: number;

  /** Total items (for server-side pagination) */
  totalItems?: number;

  /** Page size */
  pageSize?: number;

  /** Current page index (controlled) */
  currentPage?: number;

  /** Page change callback */
  onPageChange?: (page: number) => void;

  /** Page size change callback */
  onPageSizeChange?: (size: number) => void;

  /** Row click callback */
  onRowClick?: (row: TData) => void;

  /** Selection change callback */
  onSelectionChange?: (keys: Set<string> | string[]) => void;

  /** Show refresh button */
  showRefresh?: boolean;

  /** Refresh callback */
  onRefresh?: () => void;

  /** Loading state */
  loading?: boolean;

  /** Responsive mode */
  responsive?: boolean;

  /** Empty data message */
  emptyMessage?: string;

  /** Get row key function */
  getRowKey?: (row: TData) => string;

  /** Extra action buttons */
  extraActions?: React.ReactNode;

  /** Custom styles */
  sx?: any;

  /** Enable column config persistence (localStorage) */
  persistColumnConfig?: boolean;

  /** Column config storage key prefix */
  columnConfigKey?: string;

  /** Enable row expansion */
  enableRowExpansion?: boolean;

  /** Row expansion content renderer */
  expandedRowRender?: ExpandedRowRender<TData>;

  /** Enable virtual scrolling */
  enableVirtualization?: boolean;

  /** Virtual scroll row height */
  rowHeight?: number;

  /** Enable sticky header */
  enableStickyHeader?: boolean;

  /** Show row numbers */
  showRowNumber?: boolean;

  /** Enable advanced filters */
  enableAdvancedFilter?: boolean;

  /** Advanced filter configs */
  advancedFilters?: AdvancedFilter[];

  /** Striped rows */
  striped?: boolean;

  /** Compact mode */
  compact?: boolean;

  /** Empty state custom content */
  emptyState?: React.ReactNode;

  /** Selection key property */
  selectionKey?: keyof TData;

  /** Controlled selected IDs */
  selectedIds?: string[];

  // --- Decoupled dependency props ---

  /** Called when export succeeds (replaces addNotification success) */
  onExportSuccess?: () => void;

  /** Called when export fails (replaces addNotification error) */
  onExportError?: (error: Error) => void;

  /** Custom export data function (replaces useExportData hook) */
  exportData?: ExportDataFn;
}

/**
 * Row data type
 */
export interface DataTableRow<TData> {
  original: TData;
  id: string;
}

// ============ Utility Functions ============

/**
 * Read column visibility from localStorage
 */
const loadColumnVisibility = (key: string): VisibilityState => {
  try {
    const stored = localStorage.getItem(`datatable:${key}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore
  }
  return {};
};

/**
 * Save column visibility to localStorage
 */
const saveColumnVisibility = (key: string, visibility: VisibilityState): void => {
  try {
    localStorage.setItem(`datatable:${key}`, JSON.stringify(visibility));
  } catch {
    // ignore
  }
};

/**
 * Export data to CSV format (inlined from useExportData)
 */
function exportToCSV<TData extends RowData>(
  columns: ColumnDef<TData, any>[],
  data: TData[],
  fileName: string = 'export'
): ExportResult {
  try {
    const headers = columns.map((col) => (col.header as string) || col.id);

    const csvData = [
      headers.join(','),
      ...data.map((row) =>
        columns
          .map((col) => {
            const value = row[col.id as keyof TData];
            if (typeof value === 'string') {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return String(value ?? '');
          })
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([`\uFEFF${csvData}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${fileName}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error };
  }
}

/**
 * Export data to Excel (XLS) format via tab-separated values (inlined from useExportData)
 */
function exportToExcel<TData extends RowData>(
  columns: ColumnDef<TData, any>[],
  data: TData[],
  fileName: string = 'export'
): ExportResult {
  try {
    const headers = columns.map((col) => (col.header as string) || col.id);

    const rows = data.map((row) =>
      columns.map((col) => {
        const value = row[col.id as keyof TData];
        return typeof value === 'string' ? value : JSON.stringify(value);
      })
    );

    const worksheetData = [headers, ...rows];
    const csvContent = worksheetData.map((row) => row.join('\t')).join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: 'application/vnd.ms-excel;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${fileName}-${new Date().toISOString().split('T')[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error };
  }
}

// ============ DataTable Component ============

/**
 * Shared DataTable component
 * Supports search, sort, filter, pagination, selection, export.
 * Enhanced features: column config persistence, row expansion, virtual scrolling.
 *
 * @example
 * ```tsx
 * <DataTable
 *   columns={columns}
 *   data={data}
 *   searchKey="name"
 *   showSelection
 *   showExport
 *   showCreate
 *   onCreate={handleCreate}
 *   onRowClick={handleRowClick}
 *   onSelectionChange={handleSelection}
 *   onExportSuccess={() => console.log('Exported!')}
 *   onExportError={(err) => console.error(err)}
 *   persistColumnConfig
 *   columnConfigKey="user-list"
 *   enableRowExpansion
 *   expandedRowRender={renderExpandedRow}
 *   enableVirtualization
 *   rowHeight={48}
 * />
 * ```
 */
export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = '搜索...',
  showSearch = true,
  showExport = true,
  showSelection = false,
  showCreate = false,
  createLabel = '新建',
  onCreate,
  exportFileName = 'export',
  enablePagination = true,
  totalPages,
  totalItems,
  pageSize = 10,
  currentPage = 0,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  onSelectionChange,
  onRefresh,
  loading = false,
  responsive = true,
  emptyMessage = '暂无数据',
  getRowKey = (row: TData) =>
    (row as any).id?.toString() || (row as any).key || Math.random().toString(),
  extraActions,
  sx,
  persistColumnConfig = false,
  columnConfigKey = 'default',
  enableRowExpansion = false,
  expandedRowRender,
  enableVirtualization = false,
  rowHeight,
  enableStickyHeader = false,
  showRowNumber = false,
  enableAdvancedFilter = false,
  advancedFilters = [],
  striped = true,
  compact = false,
  selectionKey,
  selectedIds = [],
  // Decoupled dependency props
  onExportSuccess,
  onExportError,
  exportData: customExportData,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: currentPage,
    pageSize,
  });
  const [localSearch, setLocalSearch] = useState('');
  const [showAdvancedFilterDialog, setShowAdvancedFilterDialog] = useState(false);
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    persistColumnConfig ? loadColumnVisibility(columnConfigKey) : {}
  );

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set(selectedIds));
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Virtual scrolling state
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (selectedIds) {
      setSelectedKeys(new Set(selectedIds));
    }
  }, [selectedIds]);

  useEffect(() => {
    if (persistColumnConfig) {
      saveColumnVisibility(columnConfigKey, columnVisibility);
    }
  }, [columnVisibility, persistColumnConfig, columnConfigKey]);

  // Measure scroll container height with ResizeObserver
  useEffect(() => {
    if (!enableVirtualization || !rowHeight || !scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        if (height > 0) {
          setContainerHeight(height);
        }
      }
    });
    observer.observe(container);
    // Set initial height
    if (container.clientHeight > 0) {
      setContainerHeight(container.clientHeight);
    }

    return () => {
      observer.disconnect();
    };
  }, [enableVirtualization, rowHeight]);

  // Reset scroll position when data changes
  useEffect(() => {
    if (enableVirtualization && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
      setScrollTop(0);
    }
  }, [data, enableVirtualization]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onPaginationChange: (newPagination) => {
      const paginationState =
        typeof newPagination === 'function' ? newPagination(pagination) : newPagination;
      setPagination(newPagination);
      if (onPageChange) {
        onPageChange(paginationState.pageIndex);
      }
    },
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      pagination,
      columnVisibility,
    },
    initialState: {
      pagination: { pageIndex: currentPage, pageSize },
    },
  });

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSearch = useCallback(
    (value: string) => {
      setLocalSearch(value);
      if (searchKey) {
        table.getColumn(searchKey)?.setFilterValue(value);
      }
    },
    [searchKey, table]
  );

  const handleSelectionChange = useCallback(
    (keys: Set<string>) => {
      setSelectedKeys(keys);
      onSelectionChange?.(keys);
    },
    [onSelectionChange]
  );

  const handleSelectAll = useCallback(() => {
    const filteredRows = table.getFilteredRowModel().rows;
    if (selectionKey && onSelectionChange) {
      if (selectedIds.length === filteredRows.length && filteredRows.length > 0) {
        onSelectionChange([]);
      } else {
        const allIds = filteredRows.map((row) => String(row.original[selectionKey]));
        onSelectionChange(allIds);
      }
    } else {
      if (selectedKeys.size === filteredRows.length && filteredRows.length > 0) {
        handleSelectionChange(new Set());
      } else {
        const allKeys = new Set(filteredRows.map((row) => getRowKey(row.original)));
        handleSelectionChange(allKeys);
      }
    }
  }, [
    selectedKeys,
    table,
    getRowKey,
    handleSelectionChange,
    selectedIds,
    selectionKey,
    onSelectionChange,
  ]);

  const handleSelectRow = useCallback(
    (row: TData) => {
      if (selectionKey && onSelectionChange) {
        const id = String(row[selectionKey]);
        const newSelected = selectedIds.includes(id)
          ? selectedIds.filter((selectedId) => selectedId !== id)
          : [...selectedIds, id];
        onSelectionChange(newSelected);
      } else {
        const key = getRowKey(row);
        const newKeys = new Set(selectedKeys);
        if (newKeys.has(key)) {
          newKeys.delete(key);
        } else {
          newKeys.add(key);
        }
        handleSelectionChange(newKeys);
      }
    },
    [selectedKeys, getRowKey, handleSelectionChange, selectedIds, selectionKey, onSelectionChange]
  );

  const handleRowExpand = useCallback(
    (row: TData) => {
      const key = getRowKey(row);
      const newExpanded = new Set(expandedRows);
      if (newExpanded.has(key)) {
        newExpanded.delete(key);
      } else {
        newExpanded.add(key);
      }
      setExpandedRows(newExpanded);
    },
    [expandedRows, getRowKey]
  );

  const executeExport = useCallback(
    (format: string, exportFn: () => ExportResult) => {
      // If custom export function is provided, use it
      if (customExportData) {
        const rows = table.getFilteredRowModel().rows.map((r) => r.original);
        const result = customExportData(format, columns, rows);
        const handleResult = (res: ExportResult) => {
          if (res.success) {
            onExportSuccess?.();
          } else {
            onExportError?.(res.error instanceof Error ? res.error : new Error(String(res.error)));
          }
        };
        // Support both sync and async results
        if ('then' in result && typeof (result as Promise<ExportResult>).then === 'function') {
          (result as Promise<ExportResult>).then(handleResult);
        } else {
          handleResult(result as ExportResult);
        }
      } else {
        // Use built-in export logic
        const result = exportFn();
        if (result.success) {
          onExportSuccess?.();
        } else {
          onExportError?.(result.error instanceof Error ? result.error : new Error(String(result.error)));
        }
      }
    },
    [customExportData, table, columns, onExportSuccess, onExportError]
  );

  const handleExportCSV = useCallback(() => {
    setExportAnchorEl(null);
    executeExport('csv', () =>
      exportToCSV(columns, table.getFilteredRowModel().rows.map((r) => r.original), exportFileName)
    );
  }, [executeExport, columns, table, exportFileName]);

  const handleExportExcel = useCallback(() => {
    setExportAnchorEl(null);
    executeExport('excel', () =>
      exportToExcel(columns, table.getFilteredRowModel().rows.map((r) => r.original), exportFileName)
    );
  }, [executeExport, columns, table, exportFileName]);

  const hasSelected = selectedIds.length > 0 || selectedKeys.size > 0;
  const isAllSelected =
    hasSelected &&
    (selectedIds.length === table.getFilteredRowModel().rows.length ||
      selectedKeys.size === table.getFilteredRowModel().rows.length);

  const currentPageIndex = currentPage;
  const totalRecords =
    totalItems !== undefined ? totalItems : table.getFilteredRowModel().rows.length;
  const totalPageCount = totalPages !== undefined ? totalPages : table.getPageCount();

  const renderRowNumber = useCallback(
    (index: number) => {
      return currentPageIndex * pageSize + index + 1;
    },
    [currentPageIndex, pageSize]
  );

  // Virtual scrolling calculations
  const isVirtualEnabled = enableVirtualization && !!rowHeight && containerHeight > 0;
  const allRows = table.getRowModel().rows;
  const totalHeight = isVirtualEnabled ? allRows.length * rowHeight : undefined;
  const visibleStart = isVirtualEnabled
    ? Math.max(0, Math.floor(scrollTop / rowHeight) - 3)
    : 0;
  const visibleEnd = isVirtualEnabled
    ? Math.min(
        visibleStart + Math.ceil(containerHeight / rowHeight) + 6,
        allRows.length
      )
    : allRows.length;
  const visibleRows = isVirtualEnabled
    ? allRows.slice(visibleStart, visibleEnd)
    : allRows;

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (isVirtualEnabled) {
        setScrollTop(e.currentTarget.scrollTop);
      }
    },
    [isVirtualEnabled]
  );

  /**
   * Render a single data row (used by both virtual and non-virtual modes)
   */
  const renderRow = (row: any, rowIndex: number) => {
    const rowKey = getRowKey(row.original);
    const isExpanded = expandedRows.has(rowKey);

    return (
      <React.Fragment key={row.id}>
        <TableRow
          hover={!!onRowClick}
          tabIndex={onRowClick ? 0 : undefined}
          onClick={onRowClick ? () => onRowClick(row.original) : undefined}
          onKeyDown={
            onRowClick
              ? (e: React.KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onRowClick(row.original);
                  }
                }
              : undefined
          }
          sx={{
            cursor: onRowClick ? 'pointer' : 'default',
            '&:hover': {
              backgroundColor: onRowClick ? 'action.hover' : 'inherit',
            },
            '&:last-child td': { borderBottom: 0 },
            bgcolor: striped && row.index % 2 === 0 ? 'action.hover' : 'inherit',
            ...(compact && { fontSize: '0.875rem' }),
          }}
        >
          {/* Selection column */}
          {showSelection && (
            <TableCell
              padding='checkbox'
              sx={{
                position: 'sticky',
                left: 0,
                zIndex: 1,
                bgcolor: 'inherit',
                width: 40,
              }}
            >
              <Checkbox
                checked={
                  selectionKey
                    ? selectedIds.includes(String(row.original[selectionKey]))
                    : selectedKeys.has(rowKey)
                }
                onChange={() => handleSelectRow(row.original)}
                onClick={(e) => e.stopPropagation()}
              />
            </TableCell>
          )}
          {/* Row number column */}
          {showRowNumber && (
            <TableCell
              sx={{
                whiteSpace: 'nowrap',
                fontSize: 14,
                fontWeight: 500,
                position: showSelection ? 'sticky' : 'relative',
                left: showSelection ? 56 : 0,
                zIndex: 1,
                bgcolor: 'inherit',
              }}
            >
              {renderRowNumber(rowIndex)}
            </TableCell>
          )}
          {/* Expansion column */}
          {enableRowExpansion && (
            <TableCell
              sx={{
                whiteSpace: 'nowrap',
                fontSize: 14,
                position: showSelection || showRowNumber ? 'sticky' : 'relative',
                left: (showSelection ? 56 : 0) + (showRowNumber ? 64 : 0),
                zIndex: 1,
                bgcolor: 'inherit',
              }}
            >
              <IconButton
                size='small'
                aria-label={isExpanded ? '收起行' : '展开行'}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRowExpand(row.original);
                }}
              >
                {isExpanded ? (
                  <ChevronUp style={{ width: 18, height: 18 }} />
                ) : (
                  <ChevronDown style={{ width: 18, height: 18 }} />
                )}
              </IconButton>
            </TableCell>
          )}
          {/* Data columns */}
          {row.getVisibleCells().map((cell: any) => (
            <TableCell
              key={cell.id}
              sx={{
                whiteSpace: 'nowrap',
                fontSize: 14,
                ...(compact && { py: 1 }),
              }}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </TableCell>
          ))}
        </TableRow>
        {/* Expanded row */}
        {enableRowExpansion && isExpanded && expandedRowRender && (
          <TableRow key={`${row.id}-expanded`}>
            <TableCell
              colSpan={
                columns.length +
                (showSelection ? 1 : 0) +
                (showRowNumber ? 1 : 0) +
                (enableRowExpansion ? 1 : 0)
              }
              sx={{
                padding: 2,
                bgcolor: 'grey.50',
                borderTop: '1px solid',
                borderTopColor: 'divider',
              }}
            >
              {expandedRowRender(row.original)}
            </TableCell>
          </TableRow>
        )}
      </React.Fragment>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, ...sx }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 2,
              width: '100%',
            }}
          >
            {showSearch && searchKey && (
              <TextField
                size='small'
                placeholder={searchPlaceholder}
                value={localSearch}
                onChange={(event) => handleSearch(event.target.value)}
                aria-label={searchPlaceholder || '搜索'}
                sx={{ width: '100%', maxWidth: 320 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <Search style={{ width: 16, height: 16, marginRight: 4, color: 'rgba(0, 0, 0, 0.54)' }} />
                    ),
                  },
                }}
              />
            )}

            {enableAdvancedFilter && advancedFilters.length > 0 && (
              <Button
                variant='outlined'
                size='small'
                onClick={() => setShowAdvancedFilterDialog(true)}
                startIcon={<Filter style={{ width: 16, height: 16 }} />}
              >
                高级筛选
              </Button>
            )}
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            {onRefresh && (
              <Button
                variant='outlined'
                size='small'
                onClick={onRefresh}
                startIcon={<RefreshCw style={{ width: 16, height: 16 }} />}
              >
                刷新
              </Button>
            )}

            {showExport && (
              <>
                <Button
                  variant='outlined'
                  size='small'
                  onClick={(e) => setExportAnchorEl(e.currentTarget)}
                  endIcon={<ChevronDown style={{ width: 16, height: 16 }} />}
                  startIcon={<Download style={{ width: 16, height: 16 }} />}
                >
                  导出
                </Button>
                <Menu
                  anchorEl={exportAnchorEl}
                  open={Boolean(exportAnchorEl)}
                  onClose={() => setExportAnchorEl(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                  <MenuItem onClick={handleExportCSV}>导出 CSV</MenuItem>
                  <MenuItem onClick={handleExportExcel}>导出 Excel</MenuItem>
                </Menu>
              </>
            )}

            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Button
                variant='outlined'
                size='small'
                onClick={handleMenuOpen}
                startIcon={<Settings2 style={{ width: 16, height: 16 }} />}
              >
                列设置
              </Button>
            </Box>

            {/* Create button */}
            {showCreate && onCreate && (
              <Button
                variant='contained'
                size='small'
                onClick={onCreate}
                startIcon={<Plus style={{ width: 16, height: 16 }} />}
              >
                {createLabel}
              </Button>
            )}

            {/* Extra actions */}
            {extraActions}
          </Box>
        </Box>

        {hasSelected && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              bgcolor: 'primary.light',
              px: 2,
              py: 1.5,
              borderRadius: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: '0.875rem', color: 'primary.dark' }}>
                已选择{' '}
                <Chip
                  label={selectedIds.length > 0 ? selectedIds.length : selectedKeys.size}
                  size='small'
                  color='primary'
                  sx={{ mx: 0.5 }}
                />{' '}
                条记录
              </span>
            </Box>
            {(onSelectionChange || (selectionKey && onSelectionChange)) && (
              <Button
                variant='outlined'
                size='small'
                onClick={() => {
                  if (selectionKey && onSelectionChange) {
                    onSelectionChange([]);
                  } else {
                    onSelectionChange?.(new Set());
                  }
                }}
              >
                取消选择
              </Button>
            )}
          </Box>
        )}
      </Box>

      {/* Column settings menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem sx={{ fontWeight: 600, fontSize: 14 }}>显示/隐藏列</MenuItem>
        <Divider />
        {table.getAllLeafColumns().map((column) => (
          <MenuItem
            key={column.id}
            onClick={() => column.toggleVisibility()}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              minWidth: 180,
            }}
          >
            <span>{(column.columnDef.header as string) || column.id}</span>
            {column.getIsVisible() ? (
              <Eye style={{ width: 16, height: 16, color: 'var(--mui-palette-success-main)' }} />
            ) : (
              <EyeOff style={{ width: 16, height: 16, color: 'var(--mui-palette-action-disabled)' }} />
            )}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem
          onClick={() => {
            const defaultVisibility: VisibilityState = {};
            table.getAllLeafColumns().forEach((col) => {
              defaultVisibility[col.id] = true;
            });
            setColumnVisibility(defaultVisibility);
            handleMenuClose();
          }}
        >
          重置列配置
        </MenuItem>
      </Menu>

      {/* Table area */}
      <Box
        sx={{
          borderRadius: 1,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Box
          ref={scrollContainerRef}
          onScroll={handleScroll}
          sx={{
            overflowX: responsive ? 'auto' : 'hidden',
            ...(isVirtualEnabled && {
              overflowY: 'auto',
              maxHeight: containerHeight || 400,
            }),
          }}
        >
          {/* Virtual scrolling spacer for top */}
          {isVirtualEnabled && (
            <Box component="div" sx={{ height: visibleStart * rowHeight, width: '100%' }} />
          )}
          <Table
            aria-label='数据表格'
            sx={{
              minWidth: 640,
              ...(enableStickyHeader && {
                thead: {
                  position: 'sticky',
                  top: 0,
                  zIndex: 1,
                  bgcolor: 'grey.50',
                },
              }),
            }}
          >
            <TableHead>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  sx={{ bgcolor: 'grey.50' }}
                >
                  {/* Selection column */}
                  {showSelection && (
                    <TableCell
                      scope='col'
                      padding='checkbox'
                      sx={{
                        position: 'sticky',
                        left: 0,
                        zIndex: 2,
                        bgcolor: 'grey.50',
                        width: 40,
                      }}
                    >
                      <Checkbox
                        checked={isAllSelected}
                        onChange={(_e) => handleSelectAll()}
                        indeterminate={hasSelected && !isAllSelected}
                      />
                    </TableCell>
                  )}
                  {/* Row number column */}
                  {showRowNumber && (
                    <TableCell
                      scope='col'
                      sx={{
                        whiteSpace: 'nowrap',
                        fontWeight: 600,
                        fontSize: 12,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        color: 'text.secondary',
                        position: showSelection ? 'sticky' : 'relative',
                        left: showSelection ? 56 : 0,
                        zIndex: 2,
                        bgcolor: 'grey.50',
                      }}
                    >
                      #
                    </TableCell>
                  )}
                  {/* Expansion column */}
                  {enableRowExpansion && (
                    <TableCell
                      scope='col'
                      sx={{
                        whiteSpace: 'nowrap',
                        fontWeight: 600,
                        fontSize: 12,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        color: 'text.secondary',
                        position: showSelection || showRowNumber ? 'sticky' : 'relative',
                        left: (showSelection ? 56 : 0) + (showRowNumber ? 64 : 0),
                        zIndex: 2,
                        bgcolor: 'grey.50',
                      }}
                    >
                      展开
                    </TableCell>
                  )}
                  {/* Data columns */}
                  {headerGroup.headers.map((header) => (
                    <TableCell
                      key={header.id}
                      scope='col'
                      sx={{
                        whiteSpace: 'nowrap',
                        fontWeight: 600,
                        fontSize: 12,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        color: 'text.secondary',
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={
                      columns.length +
                      (showSelection ? 1 : 0) +
                      (showRowNumber ? 1 : 0) +
                      (enableRowExpansion ? 1 : 0)
                    }
                    sx={{ height: 96, textAlign: 'center' }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                      }}
                    >
                      <Skeleton
                        variant='circular'
                        width={24}
                        height={24}
                        animation='wave'
                      />
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        加载中...
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : allRows.length ? (
                visibleRows.map((row, rowIndex) => {
                  const actualRowIndex = isVirtualEnabled ? visibleStart + rowIndex : rowIndex;
                  return renderRow(row, actualRowIndex);
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={
                      columns.length +
                      (showSelection ? 1 : 0) +
                      (showRowNumber ? 1 : 0) +
                      (enableRowExpansion ? 1 : 0)
                    }
                    sx={{ height: 120, textAlign: 'center' }}
                  >
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {emptyMessage}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {/* Virtual scrolling spacer for bottom */}
          {isVirtualEnabled && totalHeight != null && (
            <Box
              component="div"
              sx={{
                height: Math.max(0, totalHeight - visibleEnd * rowHeight),
                width: '100%',
              }}
            />
          )}
        </Box>
      </Box>

      {/* Pagination bar */}
      {enablePagination && totalPageCount > 1 && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            py: 2,
          }}
        >
          {/* Left: stats info */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 1, sm: 2 },
              flexWrap: 'wrap',
            }}
          >
            {/* Selection info */}
            {showSelection && selectedKeys.size > 0 && (
              <Typography
                variant='body2'
                color='text.secondary'
              >
                已选择 {selectedKeys.size} 条记录
              </Typography>
            )}
            {/* Total count */}
            <Typography
              variant='body2'
              color='text.secondary'
              aria-live='polite'
            >
              共 {totalRecords} 条记录
            </Typography>
            {/* Page size selector */}
            {onPageSizeChange && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  每页
                </Typography>
                <Select
                  size='small'
                  value={pageSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  sx={{ minWidth: 70, height: 32 }}
                  aria-label='每页显示条数'
                >
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={20}>20</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                  <MenuItem value={100}>100</MenuItem>
                </Select>
              </Box>
            )}
          </Box>

          {/* Right: pagination buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Previous page */}
            <Button
              variant='outlined'
              size='small'
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              sx={{ display: { xs: 'none', sm: 'flex' } }}
            >
              上一页
            </Button>
            <IconButton
              aria-label='上一页'
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              sx={{ display: { xs: 'flex', sm: 'none' } }}
            >
              <ChevronLeft style={{ width: 20, height: 20 }} />
            </IconButton>

            {/* Current page */}
            <Typography
              variant='body2'
              sx={{ minWidth: 100, textAlign: 'center' }}
            >
              第 {currentPageIndex + 1} / {totalPageCount} 页
            </Typography>

            {/* Next page */}
            <Button
              variant='outlined'
              size='small'
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              sx={{ display: { xs: 'none', sm: 'flex' } }}
            >
              下一页
            </Button>
            <IconButton
              aria-label='下一页'
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              sx={{ display: { xs: 'flex', sm: 'none' } }}
            >
              <ChevronRight style={{ width: 20, height: 20 }} />
            </IconButton>
          </Box>
        </Box>
      )}

      {/* Advanced filter dialog */}
      {enableAdvancedFilter && advancedFilters.length > 0 && (
        <Dialog
          open={showAdvancedFilterDialog}
          onClose={() => setShowAdvancedFilterDialog(false)}
          maxWidth='sm'
          fullWidth
        >
          <DialogTitle>高级筛选</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              {advancedFilters.map((filter) => (
                <Box
                  key={String(filter.key)}
                  sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
                >
                  <Box
                    sx={{
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: 'text.primary',
                    }}
                  >
                    {filter.label}
                  </Box>
                  {filter.type === 'select' && filter.options ? (
                    <Box
                      component='select'
                      value={filter.value || ''}
                      onChange={(e) => filter.onChange?.(e.target.value)}
                      sx={{
                        width: '100%',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        px: 1.5,
                        py: 1,
                        fontSize: '0.875rem',
                        outline: 'none',
                        '&:focus': { borderColor: 'primary.main' },
                      }}
                    >
                      <option value=''>全部</option>
                      {filter.options.map((option) => (
                        <option
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </option>
                      ))}
                    </Box>
                  ) : (
                    <TextField
                      type={filter.type}
                      size='small'
                      value={filter.value || ''}
                      onChange={(e) => filter.onChange?.(e.target.value)}
                      sx={{ width: '100%' }}
                    />
                  )}
                </Box>
              ))}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 1,
                  mt: 2,
                }}
              >
                <Button
                  variant='outlined'
                  onClick={() => {
                    advancedFilters.forEach((f) => f.onChange?.(''));
                    setShowAdvancedFilterDialog(false);
                  }}
                >
                  重置
                </Button>
                <Button
                  variant='contained'
                  onClick={() => setShowAdvancedFilterDialog(false)}
                >
                  应用筛选
                </Button>
              </Box>
            </Box>
          </DialogContent>
        </Dialog>
      )}
    </Box>
  );
}

// ============ Default Export ============

const MemoizedDataTable = React.memo(DataTable) as typeof DataTable;
export default MemoizedDataTable;
