/**
 * 统一的DataTable组件
 * 整合了根目录和common目录的DataTable组件，以及EnhancedDataTable的功能
 * 使用TanStack React Table，支持搜索、排序、筛选、分页、选择、导出等功能
 * 增强特性：列配置持久化、行展开功能、虚拟滚动支持、高级筛选、Excel导出
 */
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Checkbox,
  Tooltip,
  Skeleton,
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  Chip,
} from '@mui/material';
import { Button } from '@mui/material';
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
  MoreVertical,
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
} from '@tanstack/react-table';
import { useAppStore } from '@/store';
import { useExportData } from '@/hooks/useDataTable';

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
  options?: { value: string; label: string }[];
  value?: string;
  onChange?: (_value: string) => void;
}

/**
 * DataTable属性
 */
export interface DataTableProps<TData, TValue> {
  /** 列定义 */
  columns: ColumnDef<TData, TValue>[];

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

  /** 选择变化回调（selectionKey存在时传入string[]，否则传入Set<string>） */
  onSelectionChange?: (keys: Set<string> | string[]) => void;

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
  sx?: any;

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

  /** 选择key */
  selectionKey?: keyof TData;

  /** 已选中的id列表（受控） */
  selectedIds?: string[];
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
  searchPlaceholder = '搜索...',
  showSearch = true,
  showFilters = true,
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
  showRefresh = false,
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
  rowHeight = 52,
  enableStickyHeader = false,
  showRowNumber = false,
  enableAdvancedFilter = false,
  advancedFilters = [],
  striped = true,
  compact = false,
  emptyState,
  selectionKey,
  selectedIds = [],
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: currentPage,
    pageSize: pageSize,
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
  const addNotification = useAppStore((state) => state.addNotification);

  const { exportToCSV, exportToExcel } = useExportData(columns);

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
      pagination: { pageIndex: currentPage, pageSize: pageSize },
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
  }, [selectedKeys, table, getRowKey, handleSelectionChange, selectedIds, selectionKey, onSelectionChange]);

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

  const handleExportCSV = useCallback(() => {
    setExportAnchorEl(null);
    const result = exportToCSV(
      table.getFilteredRowModel().rows.map((r) => r.original),
      exportFileName
    );
    if (result.success) {
      addNotification({
        title: '导出成功',
        message: '数据已成功导出为 CSV 文件',
        type: 'success',
      });
    } else {
      addNotification({
        title: '导出失败',
        message: '导出过程中发生错误',
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
        title: '导出成功',
        message: '数据已成功导出为 Excel 文件',
        type: 'success',
      });
    } else {
      addNotification({
        title: '导出失败',
        message: '导出过程中发生错误',
        type: 'error',
      });
    }
  }, [exportToExcel, table, exportFileName, addNotification]);

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
              <Box sx={{ position: 'relative', width: '100%', maxWidth: 320 }}>
                <Search
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 16,
                    height: 16,
                    color: 'rgba(0,0,0,0.25)',
                  }}
                />
                <input
                  type='text'
                  placeholder={searchPlaceholder}
                  value={localSearch}
                  onChange={(event) => handleSearch(event.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 40px',
                    border: '1px solid',
                    borderColor: '#e0e0e0',
                    borderRadius: 4,
                    fontSize: 14,
                    backgroundColor: 'white',
                    outline: 'none',
                  }}
                />
              </Box>
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

      {/* 列设置菜单 */}
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
          重置列配置
        </MenuItem>
      </Menu>

      {/* 表格区域 */}
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
                        onChange={(e) => handleSelectAll()}
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
                      展开
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
                        加载中...
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length ? (
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
                        {/* 选择列 */}
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
                        {/* 行号列 */}
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
                        {/* 展开列 */}
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
                            >
                              {isExpanded ? (
                                <ChevronUp sx={{ width: 18, height: 18 }} />
                              ) : (
                                <ChevronDown sx={{ width: 18, height: 18 }} />
                              )}
                            </IconButton>
                          </TableCell>
                        )}
                        {/* 数据列 */}
                        {row.getVisibleCells().map((cell) => (
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
                      {/* 展开行 */}
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
            {showSelection && selectedKeys.size > 0 && (
              <Typography
                variant='body2'
                color='text.secondary'
              >
                已选择 {selectedKeys.size} 条记录
              </Typography>
            )}
            {/* 总数信息 */}
            <Typography
              variant='body2'
              color='text.secondary'
            >
              共 {totalRecords} 条记录
            </Typography>
            {/* 每页条数选择 */}
            {onPageSizeChange && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  每页
                </Typography>
                <select
                  value={pageSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  style={{
                    border: '1px solid',
                    borderColor: '#e0e0e0',
                    borderRadius: 4,
                    padding: '4px 8px',
                    fontSize: 14,
                    backgroundColor: 'white',
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
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
              上一页
            </Button>
            <IconButton
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              sx={{ display: { xs: 'flex', sm: 'none' } }}
            >
              <ChevronLeft sx={{ width: 20, height: 20 }} />
            </IconButton>

            {/* 当前页码 */}
            <Typography
              variant='body2'
              sx={{ minWidth: 100, textAlign: 'center' }}
            >
              第 {currentPageIndex + 1} / {totalPageCount} 页
            </Typography>

            {/* 下一页 */}
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
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              sx={{ display: { xs: 'flex', sm: 'none' } }}
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

// ============ 默认导出 ============

const MemoizedDataTable = React.memo(DataTable) as typeof DataTable;
export default MemoizedDataTable;
