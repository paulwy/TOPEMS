import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { BoxProps } from '@mui/material';
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
  TextField,
  InputAdornment,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Collapse,
  useTheme,
  useMediaQuery,
  Popover,
  Switch,
  List,
  ListItem,
  OutlinedInput,
  Select,
  FormControl,
  InputLabel,
  FormControlLabel,
  Breadcrumbs,
  Link,
  ButtonGroup,
} from '@mui/material';
import { Button } from '@mui/material';
import { EmptyState, ErrorEmptyState } from '../mui/EmptyState';
import {
  Search,
  Filter,
  MoreHorizontal,
  ChevronDown,
  ArrowUpDown,
  Eye,
  Edit,
  Trash2,
  Download,
  RefreshCw,
  ChevronRight,
  Settings2,
  Columns3,
  ArrowLeft,
  Trash,
  Copy,
  DownloadCloud,
  Check,
  X,
  RotateCcw,
} from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';
import { useAutoBreadcrumbs } from '@/hooks';

// 从 FilterBar 导入 FilterConfig 类型以确保类型一致
import type { FilterConfig } from '../mui/FilterBar';

// ============ 类型定义 ============

/**
 * 列定义接口
 * @template T - 数据行类型
 */
export interface ColumnDef<T = any> {
  /** 列唯一标识 */
  id: string;
  /** 列标题 */
  label?: string;
  /** @deprecated 请使用 label 字段 */
  header?: string;
  /** @deprecated 字段已通过 id 标识，无需额外配置 */
  accessor?: string;
  /** 列宽度 */
  width?: number | string;
  /** 最小宽度 */
  minWidth?: number;
  /** 文本对齐方式 */
  align?: 'left' | 'center' | 'right';
  /** 是否可排序 */
  sortable?: boolean;
  /** 自定义单元格渲染 */
  render?: (row: T, index: number) => React.ReactNode;
  /** 自定义表头渲染 */
  renderHeader?: (column: ColumnDef<T>) => React.ReactNode;
  /** 是否可配置显示/隐藏 */
  configurable?: boolean;
  /** 列顺序（用于列配置中的排序） */
  order?: number;
}

/**
 * 筛选选项接口
 */
export interface FilterOption {
  /** 显示标签 */
  label: string;
  /** 选项值 */
  value: string | number;
}

// 使用从 FilterBar 导入的 FilterConfig
export type { FilterConfig } from '../mui/FilterBar';

/**
 * 行操作接口
 * @template T - 数据行类型
 */
export interface RowAction<T = any> {
  /** 操作标签 */
  label: string;
  /** 操作图标 */
  icon?: React.ReactNode;
  /** 点击回调 */
  onClick?: (row: T) => void;
  /** 跳转链接 */
  href?: string;
  /** 按钮颜色 */
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'success' | 'info';
  /** 条件显示 */
  show?: (row: T) => boolean;
  /** 是否显示分隔线 */
  divider?: boolean;
  /** 是否需要确认 */
  confirm?: boolean;
  /** 确认提示信息 */
  confirmMessage?: string;
}

/**
 * 展开行渲染属性
 * @template T - 数据行类型
 */
export interface ExpandedRowRenderProps<T = any> {
  /** 当前行数据 */
  row: T;
  /** 行索引 */
  index: number;
}

/**
 * 列配置接口（用于列显示/隐藏配置）
 */
export interface ColumnConfig {
  /** 列ID */
  id: string;
  /** 是否显示 */
  visible: boolean;
  /** 列顺序 */
  order?: number;
}

/**
 * 批量操作接口
 */
export interface BatchAction {
  /** 操作标签 */
  label: string;
  /** 操作图标 */
  icon?: React.ReactNode;
  /** 按钮颜色 */
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'success' | 'info';
  /** 点击回调 */
  onClick?: () => void;
  /** 是否需要确认 */
  confirm?: boolean;
  /** 确认提示信息 */
  confirmMessage?: string;
  /** 是否在有选择时显示 */
  showWhenSelected?: boolean;
  /** 最小选择数量 */
  minSelected?: number;
}

export interface ListPageTemplateProps<T = any> extends BoxProps {
  // 页面信息
  title?: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  /** 是否启用自动面包屑（默认启用） */
  autoBreadcrumbs?: boolean;
  /** 返回按钮配置 */
  backButton?: {
    href?: string;
    onClick?: () => void;
  };

  // 数据
  columns: ColumnDef<T>[];
  data: T[];
  loading?: boolean;
  error?: string;

  // 行标识
  getRowId?: (row: T) => string | number;
  onRowClick?: (row: T) => void;

  // 选择
  selectable?: boolean;
  selectedIds?: (string | number)[];
  onSelectionChange?: (ids: (string | number)[]) => void;
  /** 批量选择配置 */
  selection?: {
    selected?: (string | number)[];
    onChange?: (ids: (string | number)[]) => void;
  };

  // 排序
  sortable?: boolean;
  defaultSortBy?: string;
  defaultSortOrder?: 'asc' | 'desc';
  onSort?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;

  // 分页
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
  };

  // 搜索
  searchable?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearch?: (value: string) => void;
  /** 全局搜索配置 - 支持搜索多个字段 */
  globalSearch?: {
    fields: string[];
    placeholder?: string;
  };

  // 筛选
  filters?: FilterConfig[];
  /** 受控的筛选值（与 onFilterChange 配合使用） */
  filtersValue?: Record<string, any>;
  onFilterChange?: (filters: Record<string, any>) => void;

  // 操作
  actions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick?: () => void;
    variant?: 'contained' | 'outlined' | 'text';
  }>;
  rowActions?: RowAction<T>[];
  /**
   * 自定义行操作渲染函数（与 rowActions 二选一，优先级更高）
   */
  renderRowActions?: (row: T, index: number) => React.ReactNode;
  /**
   * 自定义操作按钮区域（渲染在筛选栏下方、表格上方）
   * @deprecated 推荐使用 headerContent
   */
  customActions?: React.ReactNode;
  onRefresh?: () => void;
  /** 批量操作按钮 */
  batchActions?: BatchAction[];
  /** 是否在顶部显示批量操作栏 */
  showBatchActionBar?: boolean;

  // 空状态
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;

  // 自定义
  headerContent?: React.ReactNode;
  footerContent?: React.ReactNode;

  // ============ 新增功能 ============

  /**
   * 行展开配置
   * 设置为 true 启用行展开功能，或传入自定义渲染函数
   */
  expandable?: boolean | ((row: T, index: number) => React.ReactNode);
  /** 默认展开的行ID数组 */
  defaultExpandedIds?: (string | number)[];
  /** 展开状态变化回调 */
  onExpandedChange?: (expandedIds: (string | number)[]) => void;

  /**
   * 列配置功能
   * 设置为 true 显示列配置按钮，允许用户显示/隐藏列
   */
  columnConfigurable?: boolean;
  /** 默认列配置 */
  defaultColumnConfig?: ColumnConfig[];
  /** 列配置变化回调 */
  onColumnConfigChange?: (config: ColumnConfig[]) => void;
  /** 是否持久化列配置到localStorage */
  persistColumnConfig?: boolean;
  /** 列配置存储的key */
  columnConfigStorageKey?: string;

  /** 是否显示行号 */
  showRowNumber?: boolean;
}

// ============ 工具函数 ============

/**
 * 从localStorage读取列配置
 */
const loadColumnConfig = (key: string): ColumnConfig[] => {
  try {
    const stored = localStorage.getItem(`listpage:${key}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore
  }
  return [];
};

/**
 * 保存列配置到localStorage
 */
const saveColumnConfig = (key: string, config: ColumnConfig[]): void => {
  try {
    localStorage.setItem(`listpage:${key}`, JSON.stringify(config));
  } catch {
    // ignore
  }
};

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
  getRowId,
  onRowClick,
  selectable,
  selectedIds = [],
  onSelectionChange,
  selection,
  sortable,
  defaultSortBy,
  defaultSortOrder = 'asc',
  onSort,
  pagination,
  searchable,
  searchPlaceholder = '搜索...',
  searchValue,
  onSearch,
  globalSearch,
  filters,
  filtersValue,
  onFilterChange,
  actions,
  renderRowActions,
  rowActions,
  onRefresh,
  batchActions = [],
  showBatchActionBar = true,
  emptyMessage = '暂无数据',
  emptyIcon,
  headerContent,
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
  // 排除自定义属性的剩余props
  ...props
}: ListPageTemplateProps<T>) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const autoItems = useAutoBreadcrumbs({
    includeHome: true,
  });

  const breadcrumbs = manualBreadcrumbs && manualBreadcrumbs.length > 0
    ? manualBreadcrumbs
    : autoBreadcrumbs
    ? autoItems
    : undefined;

  const [sortBy, setSortBy] = useState(defaultSortBy || '');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(defaultSortOrder);
  const [searchInput, setSearchInput] = useState(searchValue || '');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRow, setSelectedRow] = useState<T | null>(null);

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

  // 列配置持久化
  useEffect(() => {
    if (persistColumnConfig) {
      saveColumnConfig(columnConfigStorageKey, columnConfig);
    }
  }, [columnConfig, persistColumnConfig, columnConfigStorageKey]);

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

  const effectiveSelectedIds = selection?.selected ?? selectedIds;
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
        const allIds = data.map((row) => getRowId?.(row) ?? (row as any).id);
        effectiveOnSelectionChange?.(allIds);
      } else {
        effectiveOnSelectionChange?.([]);
      }
    },
    [data, getRowId, effectiveOnSelectionChange]
  );

  const handleSelectRow = useCallback(
    (row: T) => {
      const rowId = getRowId?.(row) ?? (row as any).id;
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
      onSearch?.(value);
    },
    [onSearch]
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
      const rowId = getRowId?.(row) ?? (row as any).id;
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
              bgcolor: 'grey.50',
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
        {showRowNumber && (
          <TableCell
            sx={{
              width: 60,
              position: selectable ? 'sticky' : 'relative',
              left: selectable ? 48 : 0,
              zIndex: 2,
              bgcolor: 'grey.50',
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
            />
          </TableCell>
        </TableRow>
      );
    }

    return data.map((row, index) => {
      const rowId = getRowId?.(row) ?? (row as any).id;
      const isSelected = effectiveSelectedIds.includes(rowId);
      const isExpanded = expandedIds.includes(rowId);

      return (
        <React.Fragment key={rowId}>
          <TableRow
            hover
            selected={isSelected}
            onClick={() => onRowClick?.(row)}
            sx={{
              cursor: onRowClick ? 'pointer' : 'default',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
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
            {showRowNumber && (
              <TableCell
                sx={{
                  position: selectable ? 'sticky' : 'relative',
                  left: selectable ? 48 : 0,
                  zIndex: 1,
                  bgcolor: 'inherit',
                }}
              >
                {pagination ? pagination.page * pagination.pageSize + index + 1 : index + 1}
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
                  : String((row as Record<string, unknown>)[column.id])}
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
    if (!pagination) return null;

    return (
      <TablePagination
        component='div'
        count={pagination.total}
        page={pagination.page}
        onPageChange={(_, page) => pagination.onPageChange(page)}
        rowsPerPage={pagination.pageSize}
        onRowsPerPageChange={(e) => pagination.onPageSizeChange?.(Number(e.target.value))}
        rowsPerPageOptions={[10, 20, 50, 100]}
        labelRowsPerPage='每页行数'
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} 共 ${count} 条`}
      />
    );
  };

  // 渲染筛选器
  const renderFilter = (filter: FilterConfig) => {
    const commonProps = {
      size: 'small' as const,
      label: filter.label,
      value: filter.value || (filter.type === 'multiselect' ? [] : ''),
      onChange: (e: { target: { value: unknown } }) => {
        filter.onChange?.(e.target.value, filter);
        onFilterChange?.({ [filter.id]: e.target.value });
      },
      sx: { minWidth: 150 },
    };

    switch (filter.type) {
      case 'multiselect':
        return (
          <FormControl
            key={filter.id}
            size='small'
            sx={{ minWidth: 180 }}
          >
            <InputLabel>{filter.label}</InputLabel>
            <Select
              {...commonProps}
              multiple
              input={<OutlinedInput label={filter.label} />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value: unknown) => {
                    const option = filter.options?.find((opt) => opt.value === value);
                    return (
                      <Chip
                        key={String(value)}
                        label={option?.label || String(value)}
                        size='small'
                      />
                    );
                  })}
                </Box>
              )}
            >
              {filter.searchable && (
                <TextField
                  size='small'
                  placeholder='搜索...'
                  sx={{ px: 1, my: 1, minWidth: 150 }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position='start'>
                          <Search style={{ width: 16, height: 16 }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              )}
              {filter.options?.map((option) => (
                <MenuItem
                  key={option.value}
                  value={option.value}
                >
                  <Checkbox checked={commonProps.value.includes(option.value)} />
                  <ListItemText primary={option.label} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'text':
        return (
          <TextField
            key={filter.id}
            {...commonProps}
            placeholder='搜索...'
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position='start'>
                    <Search style={{ width: 18, height: 18 }} />
                  </InputAdornment>
                ),
              },
            }}
          />
        );

      case 'date':
        return (
          <TextField
            key={filter.id}
            {...commonProps}
            type='date'
            slotProps={{
              inputLabel: { shrink: true },
            }}
          />
        );

      default:
        return (
          <TextField
            key={filter.id}
            {...commonProps}
            select
          >
            <MenuItem value=''>全部</MenuItem>
            {filter.options?.map((option) => (
              <MenuItem
                key={option.value}
                value={option.value}
              >
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        );
    }
  };

  // 渲染搜索和筛选
  const renderSearchAndFilters = () => {
    if (!searchable && !globalSearch && !filters) return null;

    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          mb: 2,
          flexWrap: 'wrap',
        }}
      >
        {(searchable || globalSearch) && (
          <TextField
            size='small'
            placeholder={globalSearch?.placeholder || searchPlaceholder}
            value={searchInput}
            onChange={handleSearch}
            sx={{ minWidth: 250 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position='start'>
                    <Search style={{ width: 18, height: 18 }} />
                  </InputAdornment>
                ),
              },
            }}
          />
        )}

        {filters?.map((filter) => renderFilter(filter))}

        {onRefresh && (
          <Tooltip title='刷新'>
            <IconButton
              size='small'
              onClick={onRefresh}
            >
              <RefreshCw style={{ width: 18, height: 18 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    );
  };

  // 渲染批量操作栏
  const renderBatchActionBar = () => {
    if (!showBatchActionBar || !selectable || effectiveSelectedIds.length === 0) {
      return null;
    }

    const availableActions = batchActions.filter((action) => {
      if (action.minSelected && effectiveSelectedIds.length < action.minSelected) {
        return false;
      }
      if (action.showWhenSelected === false) {
        return false;
      }
      return true;
    });

    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          mb: 2,
          p: 2,
          bgcolor: 'primary.50',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'primary.200',
        }}
      >
        <Typography
          variant='body2'
          sx={{ fontWeight: 500, color: 'primary.main' }}
        >
          已选择 {effectiveSelectedIds.length} 条记录
        </Typography>

        <Button
          size='small'
          variant='outlined'
          onClick={() => effectiveOnSelectionChange?.([])}
          startIcon={<X size={16} />}
        >
          取消选择
        </Button>

        {availableActions.length > 0 && (
          <ButtonGroup
            size='small'
            variant='outlined'
          >
            {availableActions.map((action, index) => (
              <Button
                key={index}
                color={action.color || 'primary'}
                startIcon={action.icon}
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            ))}
          </ButtonGroup>
        )}
      </Box>
    );
  };

  // 渲染列配置 Popover
  const renderColumnConfig = () => {
    if (!columnConfigurable) return null;

    return (
      <Popover
        open={Boolean(columnConfigAnchor)}
        anchorEl={columnConfigAnchor}
        onClose={() => setColumnConfigAnchor(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        sx={{ minWidth: 280 }}
      >
        <Box sx={{ p: 2, minWidth: 280, maxWidth: 350 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600 }}
            >
              配置列显示
            </Typography>
            <Button
              size='small'
              onClick={handleResetColumnConfig}
              startIcon={<RotateCcw size={14} />}
            >
              重置
            </Button>
          </Box>

          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ mb: 2, fontSize: 12 }}
          >
            选择要显示的列
          </Typography>

          <List
            dense
            sx={{ maxHeight: 300, overflow: 'auto' }}
          >
            {columns.map((column) => {
              const config = columnConfig.find((c) => c.id === column.id);
              const isVisible = config ? config.visible : true;

              return (
                <ListItem
                  key={column.id}
                  sx={{ paddingY: 0.5 }}
                >
                  <FormControlLabel
                    control={
                      <Switch
                        checked={isVisible}
                        onChange={(e) => handleColumnVisibilityChange(column.id, e.target.checked)}
                        size='small'
                      />
                    }
                    label={column.label || column.header || column.id}
                    sx={{ margin: 0 }}
                  />
                </ListItem>
              );
            })}
          </List>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size='small'
              fullWidth
              onClick={() => {
                const allVisible = columns.map((col) => ({
                  id: col.id,
                  visible: true,
                }));
                setColumnConfig(allVisible);
                onColumnConfigChange?.(allVisible);
              }}
              startIcon={<Check size={14} />}
            >
              全选
            </Button>
            <Button
              size='small'
              fullWidth
              onClick={() => {
                const allHidden = columns.map((col) => ({
                  id: col.id,
                  visible: false,
                }));
                setColumnConfig(allHidden);
                onColumnConfigChange?.(allHidden);
              }}
              startIcon={<X size={14} />}
            >
              全不选
            </Button>
          </Box>
        </Box>
      </Popover>
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
                <Tooltip title='返回'>
                  <IconButton
                    onClick={backButton.onClick}
                    component={backButton.href ? RouterLink : 'button'}
                    to={backButton.href}
                    size='small'
                    sx={{ bgcolor: 'action.hover' }}
                  >
                    <ArrowLeft size={18} />
                  </IconButton>
                </Tooltip>
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
            {actions && actions.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
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
                {/* 自定义操作按钮 */}
                {actions.map((action, index) => (
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
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* 批量操作栏 */}
      {renderBatchActionBar()}

      {/* 搜索和筛选 */}
      {renderSearchAndFilters()}

      {/* 自定义头部内容 */}
      {headerContent}

      {/* 表格 */}
      <TableContainer
        component={Paper}
        sx={{ borderRadius: 2 }}
      >
        <Table>
          {renderTableHead()}
          <TableBody>{renderTableBody()}</TableBody>
        </Table>
        {renderPagination()}
      </TableContainer>

      {/* 自定义底部内容 */}
      {footerContent}

      {/* 列配置 */}
      {renderColumnConfig()}

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
    </Box>
  );
}

const MemoizedListPageTemplate = React.memo(ListPageTemplate) as typeof ListPageTemplate;
export default MemoizedListPageTemplate;
