import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Typography,
  IconButton,
  Tooltip,
  Checkbox,
  Skeleton,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Collapse,
  useTheme,
  useMediaQuery,
  Breadcrumbs,
  Link,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from '@mui/material';
import {
  AlertTriangle as WarningIcon,
  MoreHorizontal,
  ChevronRight,
  Columns3,
  RefreshCw,
  Download,
  FileText,
  FileSpreadsheet,
} from 'lucide-react';
import { EmptyState, ErrorEmptyState, BackButton } from '@topems/shared-components';
import { Link as RouterLink } from 'react-router-dom';
import { useAutoBreadcrumbs } from '@/hooks';
import { logger } from '@/utils/logger';

// 从子组件导入类型和组件
import type { ListPageTemplateProps, ColumnConfig, RowAction } from './list';
import { loadColumnConfig, saveColumnConfig } from './list/types';
import { ListSearchBar } from './list/ListSearchBar';
import { ListBatchActions } from './list/ListBatchActions';
import { ListColumnConfig } from './list/ListColumnConfig';

// ============ 列表页模板组件 ============

/**
 * 列表页模板组件
 * 提供完整的列表页面布局，包括搜索、筛选、排序、分页、行操作等功能
 *
 * @example
 * ```tsx
 * <ListPageTemplate
 *   title="用户列表"
 *   columns={[
 *     { id: 'name', label: '姓名', sortable: true },
 *     { id: 'email', label: '邮箱' },
 *   ]}
 *   data={users}
 *   selectable
 *   batchActions={[
 *     { label: '批量删除', icon: <Trash2 />, color: 'error', confirm: true },
 *   ]}
 *   filters={[
 *     { id: 'status', label: '状态', type: 'multiselect', options: statusOptions },
 *   ]}
 *   columnConfigurable
 *   showRowNumber
 * />
 * ```
 */
export function ListPageTemplate<T>({
  title,
  subtitle,
  breadcrumbs: manualBreadcrumbs,
  autoBreadcrumbs = true,
  backButton,
  columns,
  data,
  loading,
  error,
  getRowId = (row: T) => (row as unknown as Record<string, unknown>).id as string | number,
  onRowClick,
  selectable,
  onSelectionChange,
  selection,
  sortable,
  defaultSortBy,
  defaultSortOrder = 'asc',
  onSort,
  pagination,
  // 兼容旧版扁平化分页属性
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  searchable,
  searchPlaceholder = '搜索...',
  searchValue,
  onSearch,
  onSearchChange,
  globalSearch,
  filters,
  filtersValue,
  onFilterChange,
  actions,
  renderRowActions,
  rowActions,
  onRefresh,
  showBatchActionBar = true,
  emptyMessage = '暂无数据',
  emptyIcon,
  headerContent,
  filterContent,
  footerContent,
  // 新增属性
  expandable,
  defaultExpandedIds = [],
  onExpandedChange,
  columnConfigurable,
  defaultColumnConfig = [],
  onColumnConfigChange,
  persistColumnConfig = false,
  columnConfigStorageKey = 'default',
  showRowNumber = false,
  striped = false,
  primaryActionButton,
  // 移动端卡片视图属性
  mobileCardRender,
  mobileCardTitleKey,
  mobileCardSubtitleKey,
  mobileCardDisplayFields,
  mobileCardFieldLabels,
  // 导出功能
  exportable,
  exportFileName,
  exportFormat = 'csv',
  exportTransform,
  // 筛选记忆
  persistFilters,
  filterStorageKey,
  // 搜索记忆
  persistSearch,
  // 空状态操作
  emptyActionButton,
  // 快捷筛选
  quickFilters,
  // 批量操作
  batchActions,
  enableBatchSelection,
  // 选择 - selectedIds 单独解构避免进入 ...props 传递给 DOM
  selectedIds: selectedIdsProp,
  // 排除自定义属性的剩余props
  ...props
}: ListPageTemplateProps<T>) {
  // 兼容旧版扁平化分页属性
  const resolvedPagination =
    pagination ||
    (page !== undefined && pageSize !== undefined && total !== undefined
      ? {
          page,
          pageSize,
          total,
          onPageChange: onPageChange || (() => {}),
          onPageSizeChange,
        }
      : undefined);

  // 兼容旧版 onSearchChange
  const resolvedOnSearch = onSearch || onSearchChange;

  // 兼容旧版 filterContent
  const resolvedHeaderContent = filterContent ? (
    <>
      {headerContent}
      {filterContent}
    </>
  ) : (
    headerContent
  );
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const autoItems = useAutoBreadcrumbs({
    includeHome: true,
  });

  const breadcrumbs =
    manualBreadcrumbs && manualBreadcrumbs.length > 0
      ? manualBreadcrumbs
      : autoBreadcrumbs
        ? autoItems
        : undefined;

  const [sortBy, setSortBy] = useState(defaultSortBy || '');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(defaultSortOrder);
  const [searchInput, setSearchInput] = useState(() => {
    if (persistSearch) {
      const key = filterStorageKey || window.location.pathname;
      try {
        const stored = localStorage.getItem(`listpage:search:${key}`);
        if (stored) {
          return stored;
        }
      } catch {
        // ignore
      }
    }
    return searchValue || '';
  });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRow, setSelectedRow] = useState<T | null>(null);

  // 批量选择状态 - 从 localStorage 恢复
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(() => {
    const key = filterStorageKey || window.location.pathname;
    try {
      const stored = localStorage.getItem(`listpage:selectedIds:${key}`);
      if (stored) {
        return new Set(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
    return new Set();
  });

  // 批量操作状态
  const [batchOperationState, setBatchOperationState] = useState<{
    isProcessing: boolean;
    processed: number;
    total: number;
    actionLabel: string;
    isCancelled: boolean;
  }>({
    isProcessing: false,
    processed: 0,
    total: 0,
    actionLabel: '',
    isCancelled: false,
  });

  // 批量操作取消控制器
  const batchAbortController = useRef<AbortController | null>(null);

  // 批量操作确认对话框
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    onClick: (selectedRows: T[]) => void;
    label: string;
  } | null>(null);

  // 行展开状态
  const [expandedIds, setExpandedIds] = useState<(string | number)[]>(defaultExpandedIds);

  // 列配置状态
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(() => {
    if (defaultColumnConfig.length > 0) {
      return defaultColumnConfig;
    }
    if (persistColumnConfig) {
      const stored = loadColumnConfig(columnConfigStorageKey);
      if (stored.length > 0) {
        return stored;
      }
    }
    return columns.map((col, index) => ({
      id: col.id,
      visible: true,
      order: col.order ?? index,
    }));
  });

  // 列配置 Popover 状态
  const [columnConfigAnchor, setColumnConfigAnchor] = useState<HTMLElement | null>(null);

  // 导出状态
  const [exporting, setExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [exportAnchorEl, setExportAnchorEl] = useState<HTMLElement | null>(null);

  // 列配置持久化
  useEffect(() => {
    if (persistColumnConfig) {
      saveColumnConfig(columnConfigStorageKey, columnConfig);
    }
  }, [columnConfig, persistColumnConfig, columnConfigStorageKey]);

  // 批量选择状态持久化
  useEffect(() => {
    const key = filterStorageKey || window.location.pathname;
    try {
      localStorage.setItem(`listpage:selectedIds:${key}`, JSON.stringify([...selectedIds]));
    } catch {
      // ignore
    }
  }, [selectedIds, filterStorageKey]);

  // 筛选记忆功能
  const [localFilters, setLocalFilters] = useState<Record<string, any>>(() => {
    if (persistFilters) {
      const key = filterStorageKey || window.location.pathname;
      try {
        const stored = localStorage.getItem(`listpage:filters:${key}`);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch {
        // ignore
      }
    }
    return filtersValue || {};
  });

  useEffect(() => {
    if (persistFilters && onFilterChange) {
      const key = filterStorageKey || window.location.pathname;
      localStorage.setItem(`listpage:filters:${key}`, JSON.stringify(localFilters));
    }
  }, [localFilters, persistFilters, filterStorageKey, onFilterChange]);

  useEffect(() => {
    if (persistSearch) {
      const key = filterStorageKey || window.location.pathname;
      localStorage.setItem(`listpage:search:${key}`, searchInput);
    }
  }, [searchInput, persistSearch, filterStorageKey]);

  // 批量选择逻辑
  const hasBatchActions = batchActions && batchActions.length > 0;
  const isBatchSelectionEnabled = enableBatchSelection || hasBatchActions;

  const handleBatchSelect = useCallback(
    (row: T, event?: React.MouseEvent) => {
      const rowId = getRowId(row);
      if (event?.ctrlKey || event?.metaKey) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(rowId)) {
            next.delete(rowId);
          } else {
            next.add(rowId);
          }
          return next;
        });
      } else {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(rowId)) {
            next.delete(rowId);
          } else {
            next.add(rowId);
          }
          return next;
        });
      }
    },
    [getRowId]
  );

  const handleBatchSelectAll = useCallback(() => {
    if (selectedIds.size === data.length) {
      setSelectedIds(new Set());
    } else {
      const allIds = new Set(data.map((row) => getRowId(row)));
      setSelectedIds(allIds);
    }
  }, [selectedIds.size, data, getRowId]);

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        const target = event.target as HTMLElement;
        const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';
        if (isBatchSelectionEnabled && !isInput) {
          event.preventDefault();
          handleBatchSelectAll();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBatchSelectionEnabled, handleBatchSelectAll]);

  const getSelectedRows = useCallback(() => {
    return data.filter((row) => selectedIds.has(getRowId(row)));
  }, [data, selectedIds, getRowId]);

  const handleBatchAction = useCallback(
    (action: {
      onClick: (selectedRows: T[]) => void;
      label: string;
      confirm?: boolean;
      confirmMessage?: string;
    }) => {
      const rows = getSelectedRows();
      if (action.confirm !== false) {
        setPendingAction({ onClick: action.onClick, label: action.label });
        setConfirmDialogOpen(true);
      } else {
        action.onClick(rows);
        setSelectedIds(new Set());
      }
    },
    [getSelectedRows]
  );

  const handleConfirmBatchAction = useCallback(() => {
    if (pendingAction) {
      const rows = getSelectedRows();
      batchAbortController.current = new AbortController();
      setBatchOperationState({
        isProcessing: true,
        processed: 0,
        total: rows.length,
        actionLabel: pendingAction.label,
        isCancelled: false,
      });
      pendingAction.onClick(rows);
      setConfirmDialogOpen(false);
      setPendingAction(null);
    }
  }, [pendingAction, getSelectedRows]);

  const handleCancelBatchOperation = useCallback(() => {
    batchAbortController.current?.abort();
    setBatchOperationState((prev) => ({
      ...prev,
      isCancelled: true,
    }));
  }, []);

  const handleCancelConfirm = useCallback(() => {
    setConfirmDialogOpen(false);
    setPendingAction(null);
  }, []);

  const updateBatchProgress = useCallback((processed: number, total: number) => {
    setBatchOperationState((prev) => ({
      ...prev,
      processed,
      total,
      isProcessing: processed < total,
    }));
    if (processed >= total) {
      setSelectedIds(new Set());
    }
  }, []);

  const handleFilterChange = useCallback(
    (newFilters: Record<string, any>) => {
      setLocalFilters(newFilters);
      onFilterChange?.(newFilters);
    },
    [onFilterChange]
  );

  const handleQuickFilter = useCallback(
    (quickFilter: { filters: Record<string, any>; searchValue?: string }) => {
      setLocalFilters(quickFilter.filters);
      onFilterChange?.(quickFilter.filters);
      if (quickFilter.searchValue !== undefined) {
        setSearchInput(quickFilter.searchValue);
        resolvedOnSearch?.(quickFilter.searchValue);
      }
    },
    [onFilterChange, resolvedOnSearch]
  );

  // 获取可见的列（按order排序）
  const visibleColumns = useMemo(() => {
    if (!columnConfigurable) return columns;

    const sortedColumns = [...columns].sort((a, b) => {
      const orderA = columnConfig.find((c) => c.id === a.id)?.order ?? a.order ?? 0;
      const orderB = columnConfig.find((c) => c.id === b.id)?.order ?? b.order ?? 0;
      return orderA - orderB;
    });

    return sortedColumns.filter((col) => {
      const config = columnConfig.find((c) => c.id === col.id);
      return config ? config.visible : true;
    });
  }, [columns, columnConfig, columnConfigurable]);

  const effectiveSelectedIds = selection?.selected ?? selectedIdsProp ?? Array.from(selectedIds);
  const effectiveOnSelectionChange = selection?.onChange ?? onSelectionChange;

  // 处理排序
  const handleSort = useCallback(
    (columnId: string) => {
      const newOrder = sortBy === columnId && sortOrder === 'asc' ? 'desc' : 'asc';
      setSortBy(columnId);
      setSortOrder(newOrder);
      onSort?.(columnId, newOrder);
    },
    [sortBy, sortOrder, onSort]
  );

  // 处理选择
  const handleSelectAll = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.checked) {
        const allIds = data.map((row) => getRowId?.(row) ?? (row as unknown as Record<string, unknown>).id as string | number);
        effectiveOnSelectionChange?.(allIds);
      } else {
        effectiveOnSelectionChange?.([]);
      }
    },
    [data, getRowId, effectiveOnSelectionChange]
  );

  const handleSelectRow = useCallback(
    (row: T) => {
      const rowId = getRowId?.(row) ?? (row as unknown as Record<string, unknown>).id as string | number;
      const newSelected = effectiveSelectedIds.includes(rowId)
        ? effectiveSelectedIds.filter((id) => id !== rowId)
        : [...effectiveSelectedIds, rowId];
      effectiveOnSelectionChange?.(newSelected);
    },
    [effectiveSelectedIds, getRowId, effectiveOnSelectionChange]
  );

  // 处理搜索
  const handleSearch = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setSearchInput(value);
      resolvedOnSearch?.(value);
    },
    [resolvedOnSearch]
  );

  // 处理行操作菜单
  const handleRowActionClick = useCallback((event: React.MouseEvent<HTMLElement>, row: T) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedRow(row);
  }, []);

  const handleRowActionClose = useCallback(() => {
    setAnchorEl(null);
    setSelectedRow(null);
  }, []);

  const handleRowAction = useCallback(
    (action: RowAction<T>) => {
      if (selectedRow) {
        action.onClick?.(selectedRow);
      }
      handleRowActionClose();
    },
    [selectedRow, handleRowActionClose]
  );

  // 处理行展开
  const handleExpandRow = useCallback(
    (row: T) => {
      const rowId = getRowId?.(row) ?? (row as unknown as Record<string, unknown>).id as string | number;
      const newExpanded = expandedIds.includes(rowId)
        ? expandedIds.filter((id) => id !== rowId)
        : [...expandedIds, rowId];
      setExpandedIds(newExpanded);
      onExpandedChange?.(newExpanded);
    },
    [expandedIds, getRowId, onExpandedChange]
  );

  // 处理列配置变化
  const handleColumnVisibilityChange = useCallback(
    (columnId: string, visible: boolean) => {
      const newConfig = columnConfig.map((col) =>
        col.id === columnId ? { ...col, visible } : col
      );
      setColumnConfig(newConfig);
      onColumnConfigChange?.(newConfig);
    },
    [columnConfig, onColumnConfigChange]
  );

  // 处理列配置批量变更（全选/全不选）
  const handleColumnConfigChange = useCallback(
    (config: ColumnConfig[]) => {
      setColumnConfig(config);
      onColumnConfigChange?.(config);
    },
    [onColumnConfigChange]
  );

  // 重置列配置
  const handleResetColumnConfig = useCallback(() => {
    const defaultConfig = columns.map((col, index) => ({
      id: col.id,
      visible: true,
      order: col.order ?? index,
    }));
    setColumnConfig(defaultConfig);
    onColumnConfigChange?.(defaultConfig);
    setColumnConfigAnchor(null);
  }, [columns, onColumnConfigChange]);

  // 导出功能
  const handleExport = useCallback(
    async (format?: string) => {
      if (!exportable || data.length === 0 || exporting) return;

      try {
        setExporting(true);
        setExportAnchorEl(null);

        const finalFormat = format || exportFormat;
        const headers = visibleColumns.map((col) => col.label || col.header || col.id);
        const exportData = data.map((row) => {
          const transformed = exportTransform
            ? exportTransform(row)
            : (row as unknown as Record<string, unknown>);
          return headers
            .map((header) => {
              const col = visibleColumns.find(
                (c) => c.label === header || c.header === header || c.id === header
              );
              const colId = col?.id || header;
              const value = transformed[colId] ?? '';
              if (typeof value === 'string') {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return String(value ?? '');
            })
            .join(',');
        });

        const csvContent = [headers.join(','), ...exportData].join('\n');
        const blob = new Blob([`\uFEFF${csvContent}`], {
          type:
            finalFormat === 'excel'
              ? 'application/vnd.ms-excel;charset=utf-8;'
              : 'text/csv;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const timestamp = new Date().toISOString().split('T')[0];
        const ext = finalFormat === 'excel' ? 'xls' : 'csv';
        link.setAttribute('download', `${exportFileName || 'export'}-${timestamp}.${ext}`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setExportComplete(true);
        setTimeout(() => {
          setExportComplete(false);
        }, 2000);
      } catch (error) {
        logger.error('导出失败:', error);
      } finally {
        setExporting(false);
      }
    },
    [exportable, data, visibleColumns, exportTransform, exportFormat, exportFileName, exporting]
  );

  // 渲染表格头部
  const renderTableHead = () => (
    <TableHead>
      <TableRow>
        {selectable && (
          <TableCell
            padding='checkbox'
            sx={{
              width: 48,
              position: 'sticky',
              left: 0,
              zIndex: 2,
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'grey.50',
            }}
          >
            <Checkbox
              indeterminate={
                effectiveSelectedIds.length > 0 && effectiveSelectedIds.length < data.length
              }
              checked={data.length > 0 && effectiveSelectedIds.length === data.length}
              onChange={handleSelectAll}
            />
          </TableCell>
        )}
        {isBatchSelectionEnabled && !selectable && (
          <TableCell
            padding='checkbox'
            sx={{
              width: 48,
              position: 'sticky',
              left: 0,
              zIndex: 2,
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'grey.50',
            }}
          >
            <Checkbox
              indeterminate={selectedIds.size > 0 && selectedIds.size < data.length}
              checked={data.length > 0 && selectedIds.size === data.length}
              onChange={handleBatchSelectAll}
            />
          </TableCell>
        )}
        {showRowNumber && (
          <TableCell
            sx={{
              width: 60,
              position: selectable ? 'sticky' : 'relative',
              left: selectable ? 48 : 0,
              zIndex: 2,
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'grey.50',
            }}
          >
            #
          </TableCell>
        )}
        {expandable && (
          <TableCell
            padding='checkbox'
            sx={{ width: 48 }}
          />
        )}
        {visibleColumns.map((column) => (
          <TableCell
            key={column.id}
            align={column.align || 'left'}
            width={column.width}
            sx={{
              minWidth: column.minWidth,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            {column.renderHeader ? (
              column.renderHeader(column)
            ) : sortable && column.sortable !== false ? (
              <TableSortLabel
                active={sortBy === column.id}
                direction={sortBy === column.id ? sortOrder : 'asc'}
                onClick={() => handleSort(column.id)}
              >
                {column.label || column.header}
              </TableSortLabel>
            ) : (
              column.label || column.header
            )}
          </TableCell>
        ))}
        {rowActions && rowActions.length > 0 && (
          <TableCell
            align='right'
            sx={{ width: 80 }}
          >
            操作
          </TableCell>
        )}
        {columnConfigurable && (
          <TableCell
            align='right'
            sx={{ width: 48 }}
          >
            <Tooltip title='配置列'>
              <IconButton
                size='small'
                onClick={(e) => setColumnConfigAnchor(e.currentTarget)}
              >
                <Columns3 style={{ width: 18, height: 18 }} />
              </IconButton>
            </Tooltip>
          </TableCell>
        )}
      </TableRow>
    </TableHead>
  );

  // 渲染展开行内容
  const renderExpandedRow = (row: T, index: number) => {
    if (typeof expandable === 'function') {
      return expandable(row, index);
    }
    return null;
  };

  // 渲染表格内容
  const renderTableBody = () => {
    if (loading) {
      return Array.from({ length: 5 }).map((_, index) => (
        <TableRow key={index}>
          {selectable && (
            <TableCell padding='checkbox'>
              <Skeleton
                variant='rectangular'
                width={20}
                height={20}
              />
            </TableCell>
          )}
          {showRowNumber && (
            <TableCell>
              <Skeleton
                variant='text'
                width={30}
              />
            </TableCell>
          )}
          {expandable && (
            <TableCell padding='checkbox'>
              <Skeleton
                variant='rectangular'
                width={20}
                height={20}
              />
            </TableCell>
          )}
          {visibleColumns.map((column) => (
            <TableCell key={column.id}>
              <Skeleton
                variant='text'
                width='80%'
              />
            </TableCell>
          ))}
          {rowActions && rowActions.length > 0 && (
            <TableCell>
              <Skeleton
                variant='text'
                width={60}
              />
            </TableCell>
          )}
          {columnConfigurable && <TableCell />}
        </TableRow>
      ));
    }

    if (error) {
      return (
        <TableRow>
          <TableCell
            colSpan={
              visibleColumns.length +
              (selectable ? 1 : 0) +
              (showRowNumber ? 1 : 0) +
              (expandable ? 1 : 0) +
              (rowActions ? 1 : 0) +
              (columnConfigurable ? 1 : 0)
            }
            align='center'
            sx={{ py: 8 }}
          >
            <ErrorEmptyState
              error={error}
              onRetry={onRefresh}
            />
          </TableCell>
        </TableRow>
      );
    }

    if (data.length === 0) {
      return (
        <TableRow>
          <TableCell
            colSpan={
              visibleColumns.length +
              (selectable ? 1 : 0) +
              (showRowNumber ? 1 : 0) +
              (expandable ? 1 : 0) +
              (rowActions ? 1 : 0) +
              (columnConfigurable ? 1 : 0)
            }
            align='center'
            sx={{ py: 8 }}
          >
            <EmptyState
              icon={emptyIcon}
              title={emptyMessage}
              description='暂无数据，点击添加按钮创建新记录'
              action={
                emptyActionButton
                  ? { label: emptyActionButton.label, onClick: emptyActionButton.onClick }
                  : undefined
              }
            />
          </TableCell>
        </TableRow>
      );
    }

    return data.map((row, index) => {
      const rowId = getRowId?.(row) ?? (row as unknown as Record<string, unknown>).id as string | number;
      const isSelected = effectiveSelectedIds.includes(rowId);
      const isExpanded = expandedIds.includes(rowId);

      return (
        <React.Fragment key={rowId}>
          <TableRow
            hover
            selected={isSelected}
            onClick={() => onRowClick?.(row)}
            sx={{
              '&:nth-of-type(even)': striped ? { bgcolor: 'action.hover' } : {},
              '&:hover': {
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(59,130,246,0.08)' : 'primary.50',
                transition: 'background-color 150ms ease',
              },
              '&.Mui-selected': {
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(59,130,246,0.12)' : 'primary.50',
              },
              cursor: onRowClick ? 'pointer' : 'default',
              transition: 'background-color 150ms ease',
            }}
          >
            {selectable && (
              <TableCell
                padding='checkbox'
                sx={{
                  position: 'sticky',
                  left: 0,
                  zIndex: 1,
                  bgcolor: 'inherit',
                }}
              >
                <Checkbox
                  checked={isSelected}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectRow(row);
                  }}
                />
              </TableCell>
            )}
            {isBatchSelectionEnabled && !selectable && (
              <TableCell
                padding='checkbox'
                sx={{
                  position: 'sticky',
                  left: 0,
                  zIndex: 1,
                  bgcolor: 'inherit',
                }}
              >
                <Checkbox
                  checked={selectedIds.has(rowId)}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBatchSelect(row);
                  }}
                />
              </TableCell>
            )}
            {showRowNumber && (
              <TableCell
                sx={{
                  position: selectable ? 'sticky' : 'relative',
                  left: selectable ? 48 : 0,
                  zIndex: 1,
                  bgcolor: 'inherit',
                }}
              >
                {resolvedPagination
                  ? resolvedPagination.page * resolvedPagination.pageSize + index + 1
                  : index + 1}
              </TableCell>
            )}
            {expandable && (
              <TableCell padding='checkbox'>
                <IconButton
                  size='small'
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExpandRow(row);
                  }}
                >
                  <ChevronRight
                    style={{
                      width: 18,
                      height: 18,
                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                    }}
                  />
                </IconButton>
              </TableCell>
            )}
            {visibleColumns.map((column) => (
              <TableCell
                key={column.id}
                align={column.align || 'left'}
              >
                {column.render
                  ? column.render(row, index)
                  : String((row as unknown as Record<string, unknown>)[column.id])}
              </TableCell>
            ))}
            {rowActions && rowActions.length > 0 && (
              <TableCell align='right'>
                {isMobile ? (
                  <IconButton
                    size='small'
                    onClick={(e) => handleRowActionClick(e, row)}
                  >
                    <MoreHorizontal style={{ width: 18, height: 18 }} />
                  </IconButton>
                ) : (
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: 0.5,
                    }}
                  >
                    {rowActions.slice(0, 3).map((action, actionIndex) => {
                      if (action.show && !action.show(row)) return null;
                      return (
                        <Tooltip
                          key={actionIndex}
                          title={action.label}
                        >
                          <IconButton
                            size='small'
                            onClick={(e) => {
                              e.stopPropagation();
                              action.onClick?.(row);
                            }}
                            color={action.color}
                          >
                            {action.icon || <MoreHorizontal style={{ width: 16, height: 16 }} />}
                          </IconButton>
                        </Tooltip>
                      );
                    })}
                    {rowActions.length > 3 && (
                      <IconButton
                        size='small'
                        onClick={(e) => handleRowActionClick(e, row)}
                      >
                        <MoreHorizontal style={{ width: 16, height: 16 }} />
                      </IconButton>
                    )}
                  </Box>
                )}
              </TableCell>
            )}
            {columnConfigurable && <TableCell />}
          </TableRow>
          {expandable && isExpanded && (
            <TableRow>
              <TableCell
                colSpan={
                  visibleColumns.length +
                  (selectable ? 1 : 0) +
                  (showRowNumber ? 1 : 0) +
                  (expandable ? 1 : 0) +
                  (rowActions ? 1 : 0) +
                  (columnConfigurable ? 1 : 0)
                }
                sx={{ py: 0 }}
              >
                <Collapse
                  in={isExpanded}
                  timeout='auto'
                  unmountOnExit
                >
                  <Box sx={{ py: 2, px: 1 }}>{renderExpandedRow(row, index)}</Box>
                </Collapse>
              </TableCell>
            </TableRow>
          )}
        </React.Fragment>
      );
    });
  };

  // 渲染分页
  const renderPagination = () => {
    if (!resolvedPagination) return null;

    return (
      <TablePagination
        component='div'
        count={resolvedPagination.total}
        page={resolvedPagination.page}
        onPageChange={(_, page) => resolvedPagination.onPageChange(page)}
        rowsPerPage={resolvedPagination.pageSize}
        onRowsPerPageChange={(e) => resolvedPagination.onPageSizeChange?.(Number(e.target.value))}
        rowsPerPageOptions={[10, 20, 50, 100]}
        labelRowsPerPage='每页行数'
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} 共 ${count} 条`}
      />
    );
  };

  // 渲染移动端卡片视图
  const shouldUseMobileCard =
    isMobile && (Boolean(mobileCardRender) || Boolean(mobileCardTitleKey));

  const renderMobileCardView = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 1.5 }}>
          {[1, 2, 3, 4].map((i) => (
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

    if (!data || data.length === 0) {
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

    // 构建字段标签映射（从 columns 配置自动生成）
    const autoFieldLabels: Record<string, string> = {};
    visibleColumns.forEach((col) => {
      autoFieldLabels[col.id] = col.label || col.id;
    });
    const fieldLabels = { ...autoFieldLabels, ...(mobileCardFieldLabels || {}) };

    // 确定展示字段
    const displayFields =
      mobileCardDisplayFields ||
      visibleColumns
        .filter((c) => c.id !== mobileCardTitleKey && c.id !== mobileCardSubtitleKey)
        .slice(0, 4)
        .map((c) => c.id);

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 1.5 }}>
        {data.map((row, index) => {
          const rowId = getRowId ? getRowId(row) : ((row as unknown as Record<string, unknown>).id as string | number ?? index);
          const isSelected = selectedIds.has(rowId);

          // 优先使用自定义渲染函数
          if (mobileCardRender) {
            return (
              <Box
                key={rowId}
                onClick={() => onRowClick?.(row)}
                sx={{
                  cursor: onRowClick ? 'pointer' : 'default',
                  '&:active': onRowClick ? { opacity: 0.8 } : {},
                }}
              >
                {mobileCardRender(row, index)}
              </Box>
            );
          }

          // 默认卡片渲染
          const rowObj = row as unknown as Record<string, unknown>;
          const title = mobileCardTitleKey
            ? rowObj[mobileCardTitleKey]
            : rowObj.name || rowObj.title || rowObj.code || `项目 ${index + 1}`;
          const subtitle = mobileCardSubtitleKey ? rowObj[mobileCardSubtitleKey] : '';

          return (
            <Box
              key={rowId}
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
              {/* 卡片头部：标题 + 选择框 + 行操作 */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 1,
                  mb: displayFields.length > 0 ? 1 : 0,
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {selectable && (
                    <Checkbox
                      size='small'
                      checked={isSelected || false}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => handleSelectRow(row)}
                      sx={{ p: 0.5 }}
                    />
                  )}
                  {rowActions && rowActions.length > 0 && (
                    <IconButton
                      size='small'
                      onClick={(e) => handleRowActionClick(e, row)}
                    >
                      <MoreHorizontal style={{ width: 18, height: 18 }} />
                    </IconButton>
                  )}
                </Box>
              </Box>

              {/* 卡片内容：字段列表 */}
              {displayFields.length > 0 && (
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75 }}>
                  {displayFields.map((field) => {
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
                        sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}
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
  };

  return (
    <Box {...props}>
      {/* 页面头部：面包屑、标题、操作按钮 */}
      {(breadcrumbs || title) && (
        <Box
          sx={{
            px: { xs: 2, sm: 3 },
            py: 2,
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          {/* 面包屑导航 */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <Breadcrumbs
              separator={<ChevronRight size={14} />}
              sx={{ mb: 1 }}
            >
              {breadcrumbs.map((crumb, index) =>
                crumb.href ? (
                  <Link
                    key={index}
                    component={RouterLink}
                    to={crumb.href}
                    color='inherit'
                    underline='hover'
                    sx={{ fontSize: '0.875rem' }}
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <Typography
                    key={index}
                    color='text.primary'
                    sx={{ fontSize: '0.875rem' }}
                  >
                    {crumb.label}
                  </Typography>
                )
              )}
            </Breadcrumbs>
          )}

          {/* 标题栏 */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {/* 返回按钮 */}
              {backButton && (
                <BackButton
                  onClick={backButton.onClick}
                  href={backButton.href}
                  size='small'
                  sx={{ bgcolor: 'action.hover' }}
                />
              )}

              {/* 标题和副标题 */}
              <Box>
                {title && (
                  <Typography
                    variant='h5'
                    sx={{ fontWeight: 600, color: 'text.primary' }}
                  >
                    {title}
                  </Typography>
                )}
                {subtitle && (
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ mt: 0.25 }}
                  >
                    {subtitle}
                  </Typography>
                )}
              </Box>
            </Box>

            {/* 操作按钮 */}
            {(primaryActionButton || (actions && actions.length > 0)) && (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {primaryActionButton && (
                  <Button
                    variant='contained'
                    startIcon={primaryActionButton.icon}
                    onClick={primaryActionButton.onClick}
                    sx={
                      primaryActionButton.gradient
                        ? {
                            background: primaryActionButton.gradient,
                            color: '#fff',
                            '&:hover': { opacity: 0.9 },
                          }
                        : {}
                    }
                  >
                    {primaryActionButton.label}
                  </Button>
                )}
                {/* 刷新按钮 */}
                {onRefresh && (
                  <Tooltip title='刷新'>
                    <IconButton
                      onClick={onRefresh}
                      size='small'
                    >
                      <RefreshCw size={18} />
                    </IconButton>
                  </Tooltip>
                )}
                {/* 导出按钮 */}
                {exportable && (
                  <div>
                    <Tooltip
                      title={exporting ? '导出中...' : exportComplete ? '导出成功' : '导出数据'}
                    >
                      <IconButton
                        onClick={(e) => setExportAnchorEl(e.currentTarget)}
                        size='small'
                        disabled={data.length === 0 || exporting}
                        color={exportComplete ? 'primary' : 'inherit'}
                      >
                        <Download size={18} />
                      </IconButton>
                    </Tooltip>
                    <Menu
                      anchorEl={exportAnchorEl}
                      open={Boolean(exportAnchorEl)}
                      onClose={() => setExportAnchorEl(null)}
                    >
                      <MenuItem onClick={() => handleExport('csv')}>
                        <ListItemIcon>
                          <FileText style={{ width: 16, height: 16 }} />
                        </ListItemIcon>
                        <ListItemText>导出 CSV</ListItemText>
                      </MenuItem>
                      <MenuItem onClick={() => handleExport('excel')}>
                        <ListItemIcon>
                          <FileSpreadsheet style={{ width: 16, height: 16 }} />
                        </ListItemIcon>
                        <ListItemText>导出 Excel</ListItemText>
                      </MenuItem>
                    </Menu>
                  </div>
                )}
                {/* 自定义操作按钮 */}
                {(actions || []).map((action, index) => (
                  <Button
                    key={index}
                    variant={action.variant || 'contained'}
                    size='small'
                    startIcon={action.icon}
                    onClick={action.onClick}
                    sx={{ whiteSpace: 'nowrap' }}
                  >
                    {action.label}
                  </Button>
                ))}
                {/* 批量操作按钮 */}
                {hasBatchActions && selectedIds.size > 0 && (
                  <div>
                    <Button
                      variant='outlined'
                      size='small'
                      color='primary'
                      sx={{ whiteSpace: 'nowrap' }}
                    >
                      已选择 {selectedIds.size} 项
                    </Button>
                    {batchActions?.map((action, index) => (
                      <Button
                        key={index}
                        variant='contained'
                        size='small'
                        startIcon={action.icon}
                        onClick={() => handleBatchAction(action)}
                        disabled={action.disabled || selectedIds.size === 0}
                        color={action.color || 'primary'}
                        sx={{ whiteSpace: 'nowrap' }}
                      >
                        {action.label}
                      </Button>
                    ))}
                    <Button
                      variant='text'
                      size='small'
                      onClick={() => setSelectedIds(new Set())}
                      sx={{ whiteSpace: 'nowrap' }}
                    >
                      取消选择
                    </Button>
                  </div>
                )}
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* 批量操作栏 */}
      <ListBatchActions
        show={showBatchActionBar && !!selectable}
        selectedCount={effectiveSelectedIds.length}
        selectedRows={getSelectedRows()}
        onClearSelection={() => effectiveOnSelectionChange?.([])}
        batchActions={batchActions || []}
        onBatchAction={handleBatchAction}
      />

      {/* 搜索和筛选 */}
      <ListSearchBar
        searchable={searchable}
        searchPlaceholder={searchPlaceholder}
        searchInput={searchInput}
        onSearchChange={handleSearch}
        globalSearch={globalSearch}
        filters={filters}
        filtersValue={localFilters}
        onFilterChange={handleFilterChange}
        quickFilters={quickFilters}
        onQuickFilter={handleQuickFilter}
      />

      {/* 自定义头部内容 */}
      {resolvedHeaderContent}

      {/* 数据展示：移动端使用卡片视图，桌面端使用表格 */}
      {shouldUseMobileCard ? (
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
          {renderMobileCardView()}
          {renderPagination()}
        </Paper>
      ) : (
        <TableContainer
          component={Paper}
          sx={{ borderRadius: 3 }}
        >
          <Table>
            {renderTableHead()}
            <TableBody>{renderTableBody()}</TableBody>
          </Table>
          {renderPagination()}
        </TableContainer>
      )}

      {/* 自定义底部内容 */}
      {footerContent}

      {/* 列配置 */}
      <ListColumnConfig
        open={columnConfigurable ? Boolean(columnConfigAnchor) : false}
        anchorEl={columnConfigAnchor}
        onClose={() => setColumnConfigAnchor(null)}
        columns={columns}
        columnConfig={columnConfig}
        onVisibilityChange={handleColumnVisibilityChange}
        onReset={handleResetColumnConfig}
        onConfigChange={handleColumnConfigChange}
      />

      {/* 行操作菜单 */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleRowActionClose}
      >
        {rowActions?.map((action, index) => {
          if (action.show && selectedRow && !action.show(selectedRow)) return null;

          return (
            <React.Fragment key={index}>
              {action.divider && <Divider />}
              <MenuItem onClick={() => handleRowAction(action)}>
                {action.icon && (
                  <ListItemIcon sx={{ color: `${action.color}.main` }}>{action.icon}</ListItemIcon>
                )}
                <ListItemText>{action.label}</ListItemText>
              </MenuItem>
            </React.Fragment>
          );
        })}
      </Menu>

      {/* 批量操作确认对话框 */}
      <Dialog
        open={confirmDialogOpen}
        onClose={handleCancelConfirm}
        sx={{ '& .MuiDialog-paper': { borderRadius: 2, minWidth: 400 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>确认{pendingAction?.label}</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <WarningIcon sx={{ color: 'warning.main', fontSize: 28 }} />
            <Typography variant='body1'>
              确定要对 <strong>{selectedIds.size}</strong> 条选中的数据执行
              <strong>{pendingAction?.label}</strong> 操作吗？
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ gap: 2 }}>
          <Button onClick={handleCancelConfirm}>取消</Button>
          <Button
            onClick={handleConfirmBatchAction}
            color='primary'
            variant='contained'
          >
            确认{pendingAction?.label}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 批量操作进度显示 */}
      <Dialog
        open={batchOperationState.isProcessing}
        sx={{ '& .MuiDialog-paper': { borderRadius: 2, minWidth: 400 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {batchOperationState.isCancelled
            ? `${batchOperationState.actionLabel}已取消`
            : `${batchOperationState.actionLabel}中...`}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant='body1'>
              {batchOperationState.isCancelled ? (
                <span>操作已取消，正在回滚...</span>
              ) : (
                <span>
                  正在处理{' '}
                  <strong>
                    {batchOperationState.processed}/{batchOperationState.total}
                  </strong>{' '}
                  条数据
                </span>
              )}
            </Typography>
          </Box>
          <LinearProgress
            variant='determinate'
            value={(batchOperationState.processed / batchOperationState.total) * 100}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </DialogContent>
        <DialogActions sx={{ gap: 2 }}>
          {!batchOperationState.isCancelled && (
            <Button
              onClick={handleCancelBatchOperation}
              color='error'
            >
              取消操作
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// 重新导出类型以保持向后兼容
export type {
  ColumnDef,
  FilterOption,
  RowAction,
  ExpandedRowRenderProps,
  ColumnConfig,
  BatchAction,
  ListPageTemplateProps,
} from './list/types';

export type { FilterConfig } from '@topems/shared-components';

const MemoizedListPageTemplate = React.memo(ListPageTemplate) as typeof ListPageTemplate;
export default MemoizedListPageTemplate;
