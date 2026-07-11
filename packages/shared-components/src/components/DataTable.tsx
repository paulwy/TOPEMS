/**
 * Shared DataTable component
 * Extracted from apps/web with dependency decoupling.
 * Uses TanStack React Table - supports search, sort, filter, pagination, selection, export.
 * Enhanced features: column config persistence, row expansion, advanced filters, virtual scrolling, mobile card view.
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

export type ExpandedRowRender<TData> = (row: TData) => React.ReactNode;

export interface AdvancedFilter {
  label: string;
  key: string;
  type: 'text' | 'select' | 'date' | 'number';
  options?: { value: string; label: string }[];
  value?: string;
  onChange?: (value: string) => void;
}

export interface ExportResult {
  success: boolean;
  error?: unknown;
}

export type ExportDataFn = (format: string, columns: ColumnDef<any, any>[], rows: any[]) => Promise<ExportResult> | ExportResult;

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  showSearch?: boolean;
  showFilters?: boolean;
  showExport?: boolean;
  showSelection?: boolean;
  showCreate?: boolean;
  createLabel?: string;
  onCreate?: () => void;
  exportFileName?: string;
  enablePagination?: boolean;
  totalPages?: number;
  totalItems?: number;
  pageSize?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onRowClick?: (row: TData) => void;
  onSelectionChange?: (selectedRows: string[]) => void;
  showRefresh?: boolean;
  onRefresh?: () => void;
  loading?: boolean;
  responsive?: boolean;
  emptyMessage?: string;
  getRowKey?: (row: TData) => string;
  extraActions?: React.ReactNode;
  sx?: any;
  persistColumnConfig?: boolean;
  columnConfigKey?: string;
  enableRowExpansion?: boolean;
  expandedRowRender?: ExpandedRowRender<TData>;
  enableVirtualization?: boolean;
  rowHeight?: number;
  enableStickyHeader?: boolean;
  showRowNumber?: boolean;
  enableAdvancedFilter?: boolean;
  advancedFilters?: AdvancedFilter[];
  striped?: boolean;
  compact?: boolean;
  emptyState?: React.ReactNode;
  selectedIds?: string[];
  selectedRows?: string[];

  /** Mobile card view render function */
  mobileCardRender?: (row: TData, index: number) => React.ReactNode;

  /** Mobile card view title field key */
  mobileCardTitleKey?: string;

  /** Mobile card view subtitle field key */
  mobileCardSubtitleKey?: string;

  /** Custom field labels for mobile card view */
  mobileFieldLabels?: Record<string, string>;

  /** Fields to display in mobile card view */
  mobileDisplayFields?: string[];

  /** Should use mobile card view (controlled) */
  useMobileCardView?: boolean;

  // --- Decoupled dependency props ---
  onExportSuccess?: () => void;
  onExportError?: (error: Error) => void;
  exportData?: ExportDataFn;
}

export interface DataTableRow<TData> {
  original: TData;
  id: string;
}

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

const saveColumnVisibility = (key: string, visibility: VisibilityState): void => {
  try {
    localStorage.setItem(`datatable:${key}`, JSON.stringify(visibility));
  } catch {
    // ignore
  }
};

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

export interface MobileCardViewProps<TData> {
  data: TData[];
  cardRender?: (row: TData, index: number) => React.ReactNode;
  titleKey?: string;
  subtitleKey?: string;
  fieldLabels?: Record<string, string>;
  displayFields?: string[];
  onRowClick?: (row: TData) => void;
  loading?: boolean;
  emptyMessage?: string;
  getRowKey?: (row: TData) => string;
  showSelection?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (row: TData, selected: boolean) => void;
}

export function MobileCardView<TData>({
  data,
  cardRender,
  titleKey,
  subtitleKey,
  fieldLabels = {},
  displayFields,
  onRowClick,
  loading = false,
  emptyMessage = '暂无数据',
  getRowKey = (row: TData) => (row as any).id?.toString() || Math.random().toString(),
  showSelection = false,
  selectedIds = [],
  onSelectionChange,
}: MobileCardViewProps<TData>) {
  const isEmpty = !loading && (!data || data.length === 0);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 1 }}>
        {[1, 2, 3].map((i) => (
          <Skeleton
            key={i}
            variant='rectangular'
            height={120}
            sx={{ borderRadius: 1 }}
          />
        ))}
      </Box>
    );
  }

  if (isEmpty) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {emptyMessage}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 1 }}>
      {data.map((row, index) => {
        const rowKey = getRowKey(row);
        const isSelected = selectedIds.includes(rowKey);

        if (cardRender) {
          return (
            <Box
              key={rowKey}
              onClick={() => onRowClick?.(row)}
              sx={{
                cursor: onRowClick ? 'pointer' : 'default',
                '&:active': onRowClick ? { opacity: 0.8 } : {},
              }}
            >
              {cardRender(row, index)}
            </Box>
          );
        }

        const rowObj = row as any;
        const title = titleKey
          ? rowObj[titleKey]
          : rowObj.name || rowObj.title || `项目 ${index + 1}`;
        const subtitle = subtitleKey ? rowObj[subtitleKey] : rowObj.code || rowObj.no || '';

        const allKeys = Object.keys(rowObj).filter(
          (k) => !['id', 'key', 'created_at', 'updated_at', 'tenant_id'].includes(k)
        );
        const fields = displayFields || allKeys.slice(0, 4);

        return (
          <Box
            key={rowKey}
            onClick={() => onRowClick?.(row)}
            sx={{
              cursor: onRowClick ? 'pointer' : 'default',
              bgcolor: 'background.paper',
              border: 1,
              borderColor: isSelected ? 'primary.main' : 'divider',
              borderRadius: 1,
              p: 1.5,
              minHeight: 44,
              '&:active': onRowClick ? { bgcolor: 'action.hover' } : {},
              transition: 'background-color 150ms',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 1,
                mb: subtitle || fields.length > 0 ? 1 : 0,
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant='subtitle2'
                  sx={{
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {String(title ?? '')}
                </Typography>
                {subtitle && (
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{
                      fontSize: 12,
                      mt: 0.25,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {String(subtitle)}
                  </Typography>
                )}
              </Box>
              {showSelection && (
                <Checkbox
                  size='small'
                  checked={isSelected}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onSelectionChange?.(row, e.target.checked)}
                  sx={{ p: 0.5 }}
                />
              )}
            </Box>

            {fields.length > 0 && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 0.75,
                }}
              >
                {fields.map((field) => {
                  const value = rowObj[field];
                  const label = fieldLabels[field] || field;
                  const displayValue =
                    value == null || value === ''
                      ? '-'
                      : typeof value === 'boolean'
                        ? value
                          ? '是'
                          : '否'
                        : String(value);

                  return (
                    <Box
                      key={field}
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        minWidth: 0,
                      }}
                    >
                      <Typography
                        variant='caption'
                        color='text.secondary'
                        sx={{ fontSize: 11, fontWeight: 500 }}
                      >
                        {label}
                      </Typography>
                      <Typography
                        variant='body2'
                        sx={{
                          fontSize: 13,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {displayValue}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

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
  selectedIds = [],
  selectedRows,
  mobileCardRender,
  mobileCardTitleKey,
  mobileCardSubtitleKey,
  mobileFieldLabels,
  mobileDisplayFields,
  useMobileCardView: controlledMobileCardView,
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
    if (container.clientHeight > 0) {
      setContainerHeight(container.clientHeight);
    }

    return () => {
      observer.disconnect();
    };
  }, [enableVirtualization, rowHeight]);

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

  const effectiveSelectedIds = selectedRows ?? selectedIds ?? [];

  const handleSelectionChange = useCallback(
    (keys: Set<string> | string[]) => {
      setSelectedKeys(keys instanceof Set ? keys : new Set(keys));
      onSelectionChange?.(Array.from(keys));
    },
    [onSelectionChange]
  );

  const handleSelectAll = useCallback(() => {
    const filteredRows = table.getFilteredRowModel().rows;
    const allIds = filteredRows.map((row) => getRowKey(row.original));
    if (effectiveSelectedIds.length === filteredRows.length && filteredRows.length > 0) {
      handleSelectionChange([]);
    } else {
      handleSelectionChange(allIds);
    }
  }, [table, getRowKey, effectiveSelectedIds, handleSelectionChange]);

  const handleSelectRow = useCallback(
    (row: TData) => {
      const key = getRowKey(row);
      const newSelected = effectiveSelectedIds.includes(key)
        ? effectiveSelectedIds.filter((id) => id !== key)
        : [...effectiveSelectedIds, key];
      handleSelectionChange(newSelected);
    },
    [getRowKey, effectiveSelectedIds, handleSelectionChange]
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
        if ('then' in result && typeof (result as Promise<ExportResult>).then === 'function') {
          (result as Promise<ExportResult>).then(handleResult);
        } else {
          handleResult(result as ExportResult);
        }
      } else {
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

  const hasSelected = effectiveSelectedIds.length > 0 || selectedKeys.size > 0;
  const isAllSelected =
    hasSelected &&
    (effectiveSelectedIds.length === table.getFilteredRowModel().rows.length ||
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

  const shouldUseMobileCard =
    controlledMobileCardView !== undefined
      ? controlledMobileCardView
      : typeof window !== 'undefined' &&
        window.innerWidth < 600 &&
        (Boolean(mobileCardRender) || Boolean(mobileCardTitleKey));

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
                checked={effectiveSelectedIds.includes(String(row.original[getRowKey(row.original)]))}
                onChange={() => handleSelectRow(row.original)}
                onClick={(e) => e.stopPropagation()}
              />
            </TableCell>
          )}
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
                  label={effectiveSelectedIds.length > 0 ? effectiveSelectedIds.length : selectedKeys.size}
                  size='small'
                  color='primary'
                  sx={{ mx: 0.5 }}
                />{' '}
                条记录
              </span>
            </Box>
            {onSelectionChange && (
              <Button
                variant='outlined'
                size='small'
                onClick={() => onSelectionChange([])}
              >
                取消选择
              </Button>
            )}
          </Box>
        )}
      </Box>

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

      {shouldUseMobileCard ? (
        <Box
          sx={{
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            overflow: 'hidden',
          }}
        >
          <MobileCardView
            data={data}
            cardRender={mobileCardRender}
            titleKey={mobileCardTitleKey}
            subtitleKey={mobileCardSubtitleKey}
            fieldLabels={mobileFieldLabels}
            displayFields={mobileDisplayFields}
            onRowClick={onRowClick}
            loading={loading}
            emptyMessage={emptyMessage}
            getRowKey={getRowKey}
            showSelection={showSelection}
            selectedIds={effectiveSelectedIds}
            onSelectionChange={(row, selected) => {
              const rowKey = getRowKey(row);
              const newSelected = selected
                ? [...effectiveSelectedIds, rowKey]
                : effectiveSelectedIds.filter((id) => id !== rowKey);
              onSelectionChange?.(newSelected);
            }}
          />
        </Box>
      ) : (
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
      )}

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
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 1, sm: 2 },
              flexWrap: 'wrap',
            }}
          >
            {showSelection && selectedKeys.size > 0 && (
              <Typography
                variant='body2'
                color='text.secondary'
              >
                已选择 {selectedKeys.size} 条记录
              </Typography>
            )}
            <Typography
              variant='body2'
              color='text.secondary'
              aria-live='polite'
            >
              共 {totalRecords} 条记录
            </Typography>
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

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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

            <Typography
              variant='body2'
              sx={{ minWidth: 100, textAlign: 'center' }}
            >
              第 {currentPageIndex + 1} / {totalPageCount} 页
            </Typography>

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

const MemoizedDataTable = React.memo(DataTable) as typeof DataTable;
export default MemoizedDataTable;
