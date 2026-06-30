import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
} from '@mui/material';
import { EmptyState, ErrorEmptyState } from '../common/EmptyState';
import { MoreHorizontal, ChevronRight, Columns3, RefreshCw } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';
import { useAutoBreadcrumbs } from '@/hooks';
import { BackButton } from '../common';

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
  batchActions = [],
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
              '&:nth-of-type(even)': striped ? { bgcolor: 'action.hover' } : {},
              '&:hover': { bgcolor: 'primary.50' },
              '&.Mui-selected': { bgcolor: 'primary.50' },
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
                  size='sm'
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
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* 批量操作栏 */}
      <ListBatchActions
        show={showBatchActionBar && !!selectable}
        selectedCount={effectiveSelectedIds.length}
        onClearSelection={() => effectiveOnSelectionChange?.([])}
        batchActions={batchActions}
      />

      {/* 搜索和筛选 */}
      <ListSearchBar
        searchable={searchable}
        searchPlaceholder={searchPlaceholder}
        searchInput={searchInput}
        onSearchChange={handleSearch}
        globalSearch={globalSearch}
        filters={filters}
        filtersValue={filtersValue}
        onFilterChange={onFilterChange}
      />

      {/* 自定义头部内容 */}
      {resolvedHeaderContent}

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

export type { FilterConfig } from '../common/FilterBar';

const MemoizedListPageTemplate = React.memo(ListPageTemplate) as typeof ListPageTemplate;
export default MemoizedListPageTemplate;
