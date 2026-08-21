/**
 * 统一的DataTable组件
 * 整合了根目录和common目录的DataTable组件，以及EnhancedDataTable的功能
 * 使用TanStack React Table，支持搜索、排序、筛选、分页、选择、导出等功能
 * 增强特性：列配置持久化、行展开功能、虚拟滚动支持、高级筛选、Excel导出
 */
import React, { useState, useCallback, useEffect } from 'react';
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
  useTheme,
  Stack,
  FormControl,
  InputLabel,
} from '@mui/material';
import i18n from '@/i18n';
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
  Save,
  XCircle,
} from 'lucide-react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  getFilteredRowModel,
  type Cell,
  type ColumnDef,
  type Row,
  type SortingState,
  type ColumnFiltersState,
  type PaginationState,
  type VisibilityState,
} from '@tanstack/react-table';
import { List, type RowComponentProps } from 'react-window';
import type { SxProps, Theme } from '@mui/material/styles';
import { useNotificationStore } from '@/store';
import { useExportData } from '@/hooks/useDataTable';
import { useResponsive } from '@/hooks/useResponsive';
// ============ 类型定义 ============
/**
 * 行展开内容渲染函数类型
 */
export type ExpandedRowRender<TData> = (row: TData) => React.ReactNode;
/**
 * 高级筛选配置
 */
export interface AdvancedFilter {
  label: string;
  key: string;
  type: 'text' | 'select' | 'date' | 'number';
  options?: {
    value: string;
    label: string;
  }[];
  value?: string;
  onChange?: (_value: string) => void;
}
// ============ 虚拟滚动行数据 ============
interface VirtualRowData {
  rows: Row<any>[];
  getRowKey: (data: unknown) => string;
  onRowClick?: (data: unknown) => void;
  isSelected: string[];
  handleSelectRow: (data: unknown) => void;
  renderRowNumber: (index: number) => React.ReactNode;
  handleRowExpand: (data: unknown) => void;
  showSelection: boolean;
  showRowNumber: boolean;
  enableRowExpansion: boolean;
  compact: boolean;
  striped: boolean;
}
function DataTableVirtualRow({ index, style, ...data }: RowComponentProps<VirtualRowData>) {
  const {
    rows,
    getRowKey,
    onRowClick,
    isSelected,
    handleSelectRow,
    renderRowNumber,
    handleRowExpand,
    showSelection,
    showRowNumber,
    enableRowExpansion,
    compact,
    striped,
  } = data;
  const row = rows[index];
  if (!row) return null;
  const rowKey = getRowKey(row.original);
  return (
    <div style={style}>
      <TableRow
        key={row.id}
        onClick={() => onRowClick?.(row.original)}
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
              checked={isSelected.includes(rowKey)}
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
            {renderRowNumber(index)}
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
              onClick={(e) => {
                e.stopPropagation();
                handleRowExpand(row.original);
              }}
              aria-label={i18n.t('shared.data_table.k0')}
            >
              <ChevronDown sx={{ width: 18, height: 18 }} />
            </IconButton>
          </TableCell>
        )}
        {row.getVisibleCells().map((cell: Cell<any, any>) => (
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
    </div>
  );
}
/**
 * 行内编辑单元格组件
 */
function EditCellComponent({
  cell,
  editValue,
  currentValue,
  rowKey,
  onEditChange,
  onSaveEdit,
  inlineEditMode,
}: {
  cell: Cell<any, any>;
  editValue: unknown;
  currentValue: unknown;
  rowKey: string;
  onEditChange: (rowKey: string, cellId: string, value: unknown) => void;
  onSaveEdit: () => void;
  inlineEditMode: 'cell' | 'row';
}) {
  const effectiveValue = editValue !== undefined ? editValue : currentValue;
  const inlineEditConfig = (
    cell.column.columnDef as unknown as {
      inlineEdit?: InlineEditConfig;
    }
  )?.inlineEdit;
  const editType = inlineEditConfig?.type ?? 'text';
  const options = inlineEditConfig?.options ?? [];
  const handleBlur = () => {
    if (inlineEditMode === 'cell') {
      onSaveEdit();
    }
  };
  switch (editType) {
    case 'select':
      return (
        <FormControl
          size='small'
          sx={{ width: '100%', minWidth: 100 }}
        >
          <Select
            value={String(effectiveValue)}
            onChange={(e) => onEditChange(rowKey, cell.id, e.target.value)}
            autoFocus
            onBlur={handleBlur}
            displayEmpty
          >
            {options.map((opt) => (
              <MenuItem
                key={opt.value}
                value={opt.value}
              >
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    case 'number':
      return (
        <TextField
          size='small'
          type='number'
          value={effectiveValue !== undefined ? String(effectiveValue) : ''}
          onChange={(e) =>
            onEditChange(rowKey, cell.id, e.target.value ? Number(e.target.value) : '')
          }
          autoFocus
          onBlur={handleBlur}
          sx={{ width: '100%', minWidth: 100 }}
        />
      );
    case 'date':
      return (
        <TextField
          size='small'
          type='date'
          value={effectiveValue !== undefined ? String(effectiveValue).split('T')[0] : ''}
          onChange={(e) => onEditChange(rowKey, cell.id, e.target.value)}
          autoFocus
          onBlur={handleBlur}
          sx={{ width: '100%', minWidth: 120 }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      );
    case 'datetime':
      return (
        <TextField
          size='small'
          type='datetime-local'
          value={effectiveValue !== undefined ? String(effectiveValue).replace('Z', '') : ''}
          onChange={(e) => onEditChange(rowKey, cell.id, e.target.value)}
          autoFocus
          onBlur={handleBlur}
          sx={{ width: '100%', minWidth: 150 }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      );
    case 'checkbox':
      return (
        <Checkbox
          checked={Boolean(effectiveValue)}
          onChange={(e) => onEditChange(rowKey, cell.id, e.target.checked)}
          onBlur={handleBlur}
        />
      );
    case 'text':
    default:
      return (
        <TextField
          size='small'
          value={effectiveValue !== undefined ? String(effectiveValue) : ''}
          onChange={(e) => onEditChange(rowKey, cell.id, e.target.value)}
          autoFocus
          onBlur={handleBlur}
          sx={{ width: '100%', minWidth: 100 }}
        />
      );
  }
}
/**
 * 行内编辑保存回调类型
 */
type InlineEditSaveCallback<TData> = (row: TData, changes: Partial<TData>) => void;
/**
 * 行内编辑类型
 */
type InlineEditType = 'text' | 'select' | 'number' | 'date' | 'datetime' | 'checkbox';
/**
 * 行内编辑配置
 */
interface InlineEditConfig {
  type?: InlineEditType;
  options?: {
    value: string | number;
    label: string;
  }[];
}
/**
 * 带行内编辑配置的列定义
 */
type DataTableColumnDef<TData, TValue = unknown> = ColumnDef<TData, TValue> & {
  inlineEdit?: InlineEditConfig;
};
/**
 * DataTable属性
 */
export interface DataTableProps<TData, TValue> {
  /** 列定义 */
  columns: (ColumnDef<TData, TValue> & {
    inlineEdit?: InlineEditConfig;
  })[];
  /** 是否启用行内编辑 */
  enableInlineEdit?: boolean;
  /** 行内编辑模式：cell（单元格编辑）或 row（整行编辑） */
  inlineEditMode?: 'cell' | 'row';
  /** 可编辑的列key列表 */
  editableColumns?: string[];
  /** 行内编辑保存回调 */
  onInlineEditSave?: InlineEditSaveCallback<TData>;
  /** 数据 */
  data: TData[];
  /** 搜索字段名 */
  searchKey?: string;
  /** 搜索占位符 */
  searchPlaceholder?: string;
  /** 是否显示搜索框 */
  showSearch?: boolean;
  /** 是否显示筛选按钮 */
  showFilters?: boolean;
  /** 是否显示导出按钮 */
  showExport?: boolean;
  /** 是否显示选择框 */
  showSelection?: boolean;
  /** 是否显示新建按钮 */
  showCreate?: boolean;
  /** 新建按钮标签 */
  createLabel?: string;
  /** 新建按钮点击回调 */
  onCreate?: () => void;
  /** 导出文件名 */
  exportFileName?: string;
  /** 是否启用分页 */
  enablePagination?: boolean;
  /** 总页数 */
  totalPages?: number;
  /** 总记录数 */
  totalItems?: number;
  /** 每页条数 */
  pageSize?: number;
  /** 当前页码（受控） */
  currentPage?: number;
  /** 页码变化回调 */
  onPageChange?: (page: number) => void;
  /** 每页条数变化回调 */
  onPageSizeChange?: (size: number) => void;
  /** 行点击回调 */
  onRowClick?: (row: TData) => void;
  /** 选择变化回调，始终传入 string[] */
  onSelectionChange?: (selectedRows: string[]) => void;
  /** 是否显示刷新按钮 */
  showRefresh?: boolean;
  /** 刷新回调 */
  onRefresh?: () => void;
  /** 是否加载中 */
  loading?: boolean;
  /** 是否响应式 */
  responsive?: boolean;
  /** 空数据提示 */
  emptyMessage?: string;
  /** 获取行key的函数 */
  getRowKey?: (row: TData) => string;
  /** 额外操作按钮 */
  extraActions?: React.ReactNode;
  /** 自定义样式 */
  sx?: SxProps<Theme>;
  /** 是否启用列配置持久化（存储到localStorage） */
  persistColumnConfig?: boolean;
  /** 列配置存储的key前缀 */
  columnConfigKey?: string;
  /** 是否启用行展开功能 */
  enableRowExpansion?: boolean;
  /** 行展开内容渲染函数 */
  expandedRowRender?: ExpandedRowRender<TData>;
  /** 是否启用虚拟滚动 */
  enableVirtualization?: boolean;
  /** 虚拟滚动的行高 */
  rowHeight?: number;
  /** 是否启用列固定 */
  enableStickyHeader?: boolean;
  /** 是否显示行号 */
  showRowNumber?: boolean;
  /** 是否启用高级筛选 */
  enableAdvancedFilter?: boolean;
  /** 高级筛选配置 */
  advancedFilters?: AdvancedFilter[];
  /** 是否显示行条纹 */
  striped?: boolean;
  /** 是否紧凑模式 */
  compact?: boolean;
  /** 空状态自定义内容 */
  emptyState?: React.ReactNode;
  /** @deprecated 使用 selectedRows 代替。保留用于向后兼容。 */
  selectedIds?: string[];
  /** 已选中的行ID列表（受控） */
  selectedRows?: string[];
  /**
   * 移动端卡片视图渲染函数
   * 在小屏设备（< sm 断点）下替代表格视图，渲染为卡片列表
   * 若未提供，则默认使用表格的水平滚动模式
   */
  mobileCardRender?: (row: TData, index: number) => React.ReactNode;
  /**
   * 移动端卡片视图的标题字段名
   * 用于卡片标题展示，配合 mobileCardRender 使用更佳
   */
  mobileCardTitleKey?: string;
  /**
   * 移动端卡片视图的副标题字段名
   */
  mobileCardSubtitleKey?: string;
}
/**
 * 行数据类型
 */
export interface DataTableRow<TData> {
  original: TData;
  id: string;
}
// ============ 工具函数 ============
/**
 * 从localStorage读取列配置
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
 * 保存列配置到localStorage
 */
const saveColumnVisibility = (key: string, visibility: VisibilityState): void => {
  try {
    localStorage.setItem(`datatable:${key}`, JSON.stringify(visibility));
  } catch {
    // ignore
  }
};
// ============ DataTable组件 ============
/**
 * 统一的DataTable组件
 * 支持搜索、排序、筛选、分页、选择、导出等功能
 * 增强特性：列配置持久化、行展开功能、虚拟滚动支持
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
 *   persistColumnConfig
 *   columnConfigKey="user-list"
 *   enableRowExpansion
 *   expandedRowRender={renderExpandedRow}
 *   enableVirtualization
 * />
 * ```
 */
export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = i18n.t('components.data_table.k0'),
  showSearch = true,
  showFilters = true,
  showExport = true,
  showSelection = false,
  showCreate = false,
  createLabel = i18n.t('shared.data_table.k1'),
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
  showRefresh = false,
  onRefresh,
  loading = false,
  responsive = true,
  emptyMessage = i18n.t('shared.data_table.k2'),
  getRowKey = (row: TData): string =>
    (row as unknown as Record<string, unknown>).id?.toString() ||
    (row as unknown as Record<string, unknown>).key?.toString() ||
    Math.random().toString(),
  extraActions,
  sx,
  persistColumnConfig = false,
  columnConfigKey = 'default',
  enableRowExpansion = false,
  expandedRowRender,
  enableVirtualization = false,
  rowHeight = 52,
  enableStickyHeader = false,
  showRowNumber = false,
  enableAdvancedFilter = false,
  advancedFilters = [],
  striped = true,
  compact = false,
  emptyState: _emptyState,
  selectedIds = [],
  selectedRows,
  mobileCardRender,
  mobileCardTitleKey,
  mobileCardSubtitleKey,
  enableInlineEdit = false,
  inlineEditMode = 'cell',
  editableColumns = [],
  onInlineEditSave,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: currentPage,
    pageSize,
  });
  const theme = useTheme();
  const { isMobile } = useResponsive();
  const shouldUseMobileCard =
    isMobile && (Boolean(mobileCardRender) || Boolean(mobileCardTitleKey));
  const [localSearch, setLocalSearch] = useState('');
  const [showAdvancedFilterDialog, setShowAdvancedFilterDialog] = useState(false);
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    persistColumnConfig ? loadColumnVisibility(columnConfigKey) : {}
  );
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  // 行内编辑状态
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingCellId, setEditingCellId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, unknown>>({});
  // Unified selection state - prefer selectedRows, fall back to selectedIds for backward compat
  const effectiveSelectedIds = selectedRows ?? selectedIds ?? [];
  const [internalSelected, setInternalSelected] = React.useState<string[]>([]);
  const isSelected = showSelection
    ? effectiveSelectedIds.length > 0
      ? effectiveSelectedIds
      : internalSelected
    : [];
  const addNotification = useNotificationStore((state) => state.addNotification);
  const { exportToCSV, exportToExcel } = useExportData(columns);
  useEffect(() => {
    if (persistColumnConfig) {
      saveColumnVisibility(columnConfigKey, columnVisibility);
    }
  }, [columnVisibility, persistColumnConfig, columnConfigKey]);
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
  const handleSelectAll = React.useCallback(() => {
    const allIds = data.map((row) => getRowKey(row));
    const newSelected = isSelected.length === allIds.length ? [] : allIds;
    if (effectiveSelectedIds.length > 0 && onSelectionChange) {
      onSelectionChange(newSelected);
    } else {
      setInternalSelected(newSelected);
      onSelectionChange?.(newSelected);
    }
  }, [data, isSelected, effectiveSelectedIds, onSelectionChange]);
  const handleSelectRow = React.useCallback(
    (row: TData) => {
      const key = getRowKey(row);
      const newSelected = isSelected.includes(key)
        ? isSelected.filter((s) => s !== key)
        : [...isSelected, key];
      if (effectiveSelectedIds.length > 0 && onSelectionChange) {
        onSelectionChange(newSelected);
      } else {
        setInternalSelected(newSelected);
        onSelectionChange?.(newSelected);
      }
    },
    [isSelected, effectiveSelectedIds, onSelectionChange, getRowKey]
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
  // 行内编辑处理函数
  const handleStartEdit = useCallback(
    (rowId: string, cellId: string, value: unknown) => {
      if (inlineEditMode === 'row') {
        setEditingRowId(rowId);
        setEditingCellId(null);
      } else {
        setEditingRowId(rowId);
        setEditingCellId(cellId);
      }
      setEditValues((prev) => ({ ...prev, [`${rowId}-${cellId}`]: value }));
    },
    [inlineEditMode]
  );
  const handleEditChange = useCallback((rowId: string, cellId: string, value: unknown) => {
    setEditValues((prev) => ({ ...prev, [`${rowId}-${cellId}`]: value }));
  }, []);
  const handleSaveEdit = useCallback(
    async (row: TData, rowId: string) => {
      if (!onInlineEditSave) return;
      const rowChanges: Partial<TData> = {};
      Object.entries(editValues).forEach(([key, value]) => {
        if (key.startsWith(`${rowId}-`)) {
          const fieldKey = key.replace(`${rowId}-`, '') as keyof TData;
          rowChanges[fieldKey] = value as TData[keyof TData];
        }
      });
      if (Object.keys(rowChanges).length > 0) {
        await onInlineEditSave(row, rowChanges);
        addNotification({
          title: i18n.t('shared.data_table.k3'),
          message: i18n.t('shared.data_table.k4'),
          type: 'success',
        });
      }
      setEditingRowId(null);
      setEditingCellId(null);
      setEditValues({});
    },
    [editValues, onInlineEditSave, addNotification]
  );
  const handleCancelEdit = useCallback(() => {
    setEditingRowId(null);
    setEditingCellId(null);
    setEditValues({});
  }, []);
  const handleExportCSV = useCallback(() => {
    setExportAnchorEl(null);
    const result = exportToCSV(
      table.getFilteredRowModel().rows.map((r) => r.original),
      exportFileName
    );
    if (result.success) {
      addNotification({
        title: i18n.t('shared.data_table.k5'),
        message: i18n.t('shared.data_table.csv_6'),
        type: 'success',
      });
    } else {
      addNotification({
        title: i18n.t('shared.data_table.k7'),
        message: i18n.t('shared.data_table.k8'),
        type: 'error',
      });
    }
  }, [exportToCSV, table, exportFileName, addNotification]);
  const handleExportExcel = useCallback(() => {
    setExportAnchorEl(null);
    const result = exportToExcel(
      table.getFilteredRowModel().rows.map((r) => r.original),
      exportFileName
    );
    if (result.success) {
      addNotification({
        title: i18n.t('shared.data_table.k9'),
        message: i18n.t('shared.data_table.excel_10'),
        type: 'success',
      });
    } else {
      addNotification({
        title: i18n.t('shared.data_table.k11'),
        message: i18n.t('shared.data_table.k12'),
        type: 'error',
      });
    }
  }, [exportToExcel, table, exportFileName, addNotification]);
  const hasSelected = isSelected.length > 0;
  const isAllSelected =
    hasSelected && isSelected.length === table.getFilteredRowModel().rows.length;
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
                sx={{ width: '100%', maxWidth: 320 }}
                slotProps={
                  {
                    input: {
                      startAdornment: (
                        <Search sx={{ width: 16, height: 16, mr: 1, color: 'text.secondary' }} />
                      ),
                    },
                  } as any
                }
              />
            )}

            {enableAdvancedFilter && advancedFilters.length > 0 && (
              <Button
                variant='outlined'
                size='small'
                onClick={() => setShowAdvancedFilterDialog(true)}
                startIcon={<Filter style={{ width: 16, height: 16 }} />}
              >
                {i18n.t('components.data_table.k0')}
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
                {i18n.t('components.data_table.k1')}
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
                  {i18n.t('components.data_table.k2')}
                </Button>
                <Menu
                  anchorEl={exportAnchorEl}
                  open={Boolean(exportAnchorEl)}
                  onClose={() => setExportAnchorEl(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                  <MenuItem onClick={handleExportCSV}>
                    {i18n.t('shared.data_table.csv_13')}
                  </MenuItem>
                  <MenuItem onClick={handleExportExcel}>
                    {i18n.t('shared.data_table.excel_14')}
                  </MenuItem>
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
                {i18n.t('components.data_table.k3')}
              </Button>
            </Box>

            {/* 新建按钮 */}
            {showCreate && onCreate && (
              <Button
                variant='contained'
                size='small'
                onClick={onCreate}
                startIcon={<Plus sx={{ width: 16, height: 16 }} />}
              >
                {createLabel}
              </Button>
            )}

            {/* 额外操作 */}
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
              <Box
                component='span'
                sx={{ fontSize: '0.875rem', color: 'primary.dark' }}
              >
                {i18n.t('components.common.dataTable.k3')}{' '}
                <Chip
                  label={isSelected.length}
                  size='small'
                  color='primary'
                  sx={{ mx: 0.5 }}
                />{' '}
                {i18n.t('components.data_table.k4')}
              </Box>
            </Box>
            {onSelectionChange && (
              <Button
                variant='outlined'
                size='small'
                onClick={() => onSelectionChange([])}
              >
                {i18n.t('components.data_table.k5')}
              </Button>
            )}
          </Box>
        )}
      </Box>

      {/* 列设置菜单 */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem sx={{ fontWeight: 600, fontSize: 14 }}>
          {i18n.t('components.common.dataTable.k4')}
        </MenuItem>
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
              <Eye sx={{ width: 16, height: 16, color: 'success.main' }} />
            ) : (
              <EyeOff sx={{ width: 16, height: 16, color: 'text.disabled' }} />
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
          {i18n.t('components.data_table.k6')}
        </MenuItem>
      </Menu>

      {/* 数据区域：移动端使用卡片视图，桌面端使用表格视图 */}
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
            onRowClick={onRowClick}
            loading={loading}
            emptyMessage={emptyMessage}
            getRowKey={getRowKey}
            showSelection={showSelection}
            selectedIds={isSelected}
            onSelectionChange={(row, selected) => {
              const rowKey = getRowKey(row);
              const newSelected = selected
                ? [...isSelected, rowKey]
                : isSelected.filter((id) => id !== rowKey);
              setInternalSelected(newSelected);
              onSelectionChange?.(newSelected);
            }}
          />
        </Box>
      ) : (
        /* 表格区域 */
        <Box
          sx={{
            borderRadius: 1,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Box sx={{ overflowX: responsive ? 'auto' : 'hidden' }}>
            <Table
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
                    {/* 选择列 */}
                    {showSelection && (
                      <TableCell
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
                    {/* 行号列 */}
                    {showRowNumber && (
                      <TableCell
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
                    {/* 展开列 */}
                    {enableRowExpansion && (
                      <TableCell
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
                        {i18n.t('components.data_table.k7')}
                      </TableCell>
                    )}
                    {/* 数据列 */}
                    {headerGroup.headers.map((header) => (
                      <TableCell
                        key={header.id}
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
                          {i18n.t('components.data_table.k8')}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows.length ? (
                  enableVirtualization ? (
                    <TableRow>
                      <TableCell
                        colSpan={
                          columns.length +
                          (showSelection ? 1 : 0) +
                          (showRowNumber ? 1 : 0) +
                          (enableRowExpansion ? 1 : 0)
                        }
                        sx={{ p: 0 }}
                      >
                        <List
                          defaultHeight={400}
                          rowCount={table.getRowModel().rows.length}
                          rowHeight={rowHeight}
                          style={{ width: '100%', height: 400 }}
                          rowComponent={DataTableVirtualRow}
                          rowProps={{
                            rows: table.getRowModel().rows,
                            getRowKey: getRowKey as (data: unknown) => string,
                            onRowClick: onRowClick as ((data: unknown) => void) | undefined,
                            isSelected,
                            handleSelectRow: handleSelectRow as (data: unknown) => void,
                            renderRowNumber,
                            handleRowExpand: handleRowExpand as (data: unknown) => void,
                            showSelection,
                            showRowNumber,
                            enableRowExpansion,
                            compact,
                            striped,
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    table.getRowModel().rows.map((row, rowIndex) => {
                      const rowKey = getRowKey(row.original);
                      const isExpanded = expandedRows.has(rowKey);
                      return (
                        <>
                          <TableRow
                            key={row.id}
                            onClick={() => onRowClick?.(row.original)}
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
                                  checked={isSelected.includes(rowKey)}
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRowExpand(row.original);
                                  }}
                                  aria-label={i18n.t('shared.data_table.k15')}
                                >
                                  {isExpanded ? (
                                    <ChevronUp sx={{ width: 18, height: 18 }} />
                                  ) : (
                                    <ChevronDown sx={{ width: 18, height: 18 }} />
                                  )}
                                </IconButton>
                              </TableCell>
                            )}
                            {row.getVisibleCells().map((cell: Cell<any, any>) => {
                              const isEditable =
                                enableInlineEdit && editableColumns.includes(cell.id);
                              const isEditing =
                                editingRowId === rowKey &&
                                (inlineEditMode === 'row' || editingCellId === cell.id);
                              const editValue = editValues[`${rowKey}-${cell.id}`];
                              const currentValue = cell.getValue() ?? '';
                              return (
                                <TableCell
                                  key={cell.id}
                                  sx={{
                                    whiteSpace: 'nowrap',
                                    fontSize: 14,
                                    ...(compact && { py: 1 }),
                                    ...(isEditing && { backgroundColor: 'yellow.50' }),
                                  }}
                                >
                                  {isEditable && isEditing ? (
                                    <EditCellComponent
                                      cell={cell}
                                      editValue={editValue}
                                      currentValue={currentValue}
                                      rowKey={rowKey}
                                      onEditChange={handleEditChange}
                                      onSaveEdit={() => {
                                        inlineEditMode === 'cell' &&
                                          handleSaveEdit(row.original, rowKey);
                                      }}
                                      inlineEditMode={inlineEditMode}
                                    />
                                  ) : isEditable && !isEditing ? (
                                    <div
                                      role='button'
                                      tabIndex={0}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStartEdit(rowKey, cell.id, currentValue);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          handleStartEdit(rowKey, cell.id, currentValue);
                                        }
                                      }}
                                      style={{
                                        cursor: 'pointer',
                                        textDecoration: 'underline',
                                        color: theme.palette.primary.main,
                                      }}
                                    >
                                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </div>
                                  ) : (
                                    flexRender(cell.column.columnDef.cell, cell.getContext())
                                  )}
                                </TableCell>
                              );
                            })}
                            {enableInlineEdit &&
                              editingRowId === rowKey &&
                              inlineEditMode === 'row' && (
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                  <Stack
                                    direction='row'
                                    spacing={1}
                                  >
                                    <IconButton
                                      size='small'
                                      color='success'
                                      onClick={() => handleSaveEdit(row.original, rowKey)}
                                      aria-label={i18n.t('shared.data_table.k16')}
                                    >
                                      <Save sx={{ width: 16, height: 16 }} />
                                    </IconButton>
                                    <IconButton
                                      size='small'
                                      color='error'
                                      onClick={handleCancelEdit}
                                      aria-label={i18n.t('shared.data_table.k17')}
                                    >
                                      <XCircle sx={{ width: 16, height: 16 }} />
                                    </IconButton>
                                  </Stack>
                                </TableCell>
                              )}
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
                        </>
                      );
                    })
                  )
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
          </Box>
        </Box>
      )}

      {/* 分页栏 */}
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
          {/* 左侧：统计信息 */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 1, sm: 2 },
              flexWrap: 'wrap',
            }}
          >
            {/* 选择信息 */}
            {showSelection && isSelected.length > 0 && (
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {i18n.t('components.common.dataTable.k3')} {isSelected.length}{' '}
                {i18n.t('components.common.dataTable.k5')}
              </Typography>
            )}
            {/* 总数信息 */}
            <Typography
              variant='body2'
              color='text.secondary'
            >
              共 {totalRecords} {i18n.t('components.common.dataTable.k5')}
            </Typography>
            {/* 每页条数选择 */}
            {onPageSizeChange && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('components.data_table.k9')}
                </Typography>
                <Select
                  size='small'
                  value={pageSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  sx={{ minWidth: 70, height: 32 }}
                >
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={20}>20</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                  <MenuItem value={100}>100</MenuItem>
                </Select>
              </Box>
            )}
          </Box>

          {/* 右侧：分页按钮 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* 上一页 */}
            <Button
              variant='outlined'
              size='small'
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              sx={{ display: { xs: 'none', sm: 'flex' } }}
            >
              {i18n.t('components.data_table.k10')}
            </Button>
            <IconButton
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              sx={{ display: { xs: 'flex', sm: 'none' } }}
              aria-label={i18n.t('shared.data_table.k18')}
            >
              <ChevronLeft sx={{ width: 20, height: 20 }} />
            </IconButton>

            {/* 当前页码 */}
            <Typography
              variant='body2'
              sx={{ minWidth: 100, textAlign: 'center' }}
            >
              {i18n.t('components.common.dataTable.k6', {
                v0: currentPageIndex + 1,
                v1: totalPageCount,
              })}
            </Typography>

            {/* 下一页 */}
            <Button
              variant='outlined'
              size='small'
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              sx={{ display: { xs: 'none', sm: 'flex' } }}
            >
              {i18n.t('components.data_table.k11')}
            </Button>
            <IconButton
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              sx={{ display: { xs: 'flex', sm: 'none' } }}
              aria-label={i18n.t('shared.data_table.k19')}
            >
              <ChevronRight sx={{ width: 20, height: 20 }} />
            </IconButton>
          </Box>
        </Box>
      )}

      {/* 高级筛选对话框 */}
      {enableAdvancedFilter && advancedFilters.length > 0 && (
        <Dialog
          open={showAdvancedFilterDialog}
          onClose={() => setShowAdvancedFilterDialog(false)}
          maxWidth='sm'
          fullWidth
        >
          <DialogTitle>{i18n.t('shared.data_table.k20')}</DialogTitle>
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
                      <option value=''>{i18n.t('shared.data_table.k21')}</option>
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
                  {i18n.t('components.data_table.k12')}
                </Button>
                <Button
                  variant='contained'
                  onClick={() => setShowAdvancedFilterDialog(false)}
                >
                  {i18n.t('components.data_table.k13')}
                </Button>
              </Box>
            </Box>
          </DialogContent>
        </Dialog>
      )}
    </Box>
  );
}
// ============ 默认导出 ============
const MemoizedDataTable = React.memo(DataTable) as typeof DataTable;
export default MemoizedDataTable;
// ============ 移动端卡片视图 ============
/**
 * 移动端卡片视图属性
 */
interface MobileCardViewProps<TData> {
  /** 数据 */
  data: TData[];
  /** 卡片渲染函数（完全自定义） */
  cardRender?: (row: TData, index: number) => React.ReactNode;
  /** 标题字段名（用于默认卡片渲染） */
  titleKey?: string;
  /** 副标题字段名 */
  subtitleKey?: string;
  /** 自定义字段映射（字段名 → 标签） */
  fieldLabels?: Record<string, string>;
  /** 需要在卡片中展示的字段列表（默认展示所有字段） */
  displayFields?: string[];
  /** 行点击回调 */
  onRowClick?: (row: TData) => void;
  /** 是否加载中 */
  loading?: boolean;
  /** 空数据提示 */
  emptyMessage?: string;
  /** 获取行 key */
  getRowKey?: (row: TData) => string;
  /** 是否显示选择框 */
  showSelection?: boolean;
  /** 已选中的行 ID 列表 */
  selectedIds?: string[];
  /** 选择变化回调 */
  onSelectionChange?: (row: TData, selected: boolean) => void;
}
/**
 * 移动端卡片视图组件
 * 在小屏设备下替代表格视图，将每行数据渲染为卡片
 * 符合 project_memory 约束：DataTable/DataGrid 组件必须包含移动端优化的卡片视图
 */
function MobileCardView<TData>({
  data,
  cardRender,
  titleKey,
  subtitleKey,
  fieldLabels = {},
  displayFields,
  onRowClick,
  loading = false,
  emptyMessage = i18n.t('shared.data_table.k22'),
  getRowKey = (row: TData) =>
    (row as unknown as Record<string, unknown>).id?.toString() || Math.random().toString(),
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
        // 优先使用自定义渲染函数
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
        // 默认卡片渲染
        const rowObj = row as unknown as Record<string, unknown>;
        const title = titleKey
          ? rowObj[titleKey]
          : rowObj.name || rowObj.title || `${i18n.t('components.data_table.k1')}${index + 1}`;
        const subtitle = subtitleKey ? rowObj[subtitleKey] : rowObj.code || rowObj.no || '';
        // 确定展示的字段列表
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
              minHeight: 44, // 满足 44px 最小触摸目标
              '&:active': onRowClick ? { bgcolor: 'action.hover' } : {},
              transition: 'background-color 150ms',
            }}
          >
            {/* 卡片头部：标题 + 选择框 */}
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
                {subtitle ? (
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
                ) : null}
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

            {/* 卡片内容：字段列表 */}
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
                          ? i18n.t('shared.data_table.k23')
                          : i18n.t('shared.data_table.k24')
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
