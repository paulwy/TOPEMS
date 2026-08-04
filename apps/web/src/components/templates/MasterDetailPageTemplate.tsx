/**
 * MasterDetailPageTemplate - 主从布局模板
 * 适用于左侧列表 + 右侧详情/编辑的常见业务场景
 * 响应式：移动端折叠为单列或使用 Drawer 展示详情
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { BoxProps } from '@mui/material';
import {
  Box,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Skeleton,
  Drawer,
  useTheme,
  useMediaQuery,
  Button,
  Chip,
} from '@mui/material';
import { Search, Plus, X, PanelLeftClose, PanelLeftOpen, ChevronsRight } from 'lucide-react';
import type { BreadcrumbItem, PageAction } from './PageHeader';
import { PageHeader } from './PageHeader';
import { EmptyState, ErrorEmptyState } from '@topems/shared-components';

// ============ 类型定义 ============

/**
 * 列定义 - 简化版，用于主从布局的列表列
 */
export interface MasterColumn<T = unknown> {
  /** 列唯一标识 */
  id: string;
  /** 列标题 */
  label: string;
  /** 列宽度 */
  width?: number | string;
  /** 列最小宽度 */
  minWidth?: number;
  /** 对齐方式 */
  align?: 'left' | 'center' | 'right';
  /** 自定义渲染 */
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
  /** 数据字段名 (render 未提供时直接取值) */
  field?: string;
  /** 是否可排序 */
  sortable?: boolean;
  /** 是否在移动端显示 */
  showOnMobile?: boolean;
}

/**
 * 行操作按钮
 */
export interface MasterRowAction<T = unknown> {
  label: string;
  icon?: React.ReactNode;
  onClick: (row: T) => void;
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
  disabled?: (row: T) => boolean;
  show?: (row: T) => boolean;
  variant?: 'contained' | 'outlined' | 'text';
}

/**
 * 排序配置
 */
export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * 分页配置
 */
export interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

/**
 * MasterDetailPageTemplate 属性
 */
export interface MasterDetailPageTemplateProps<T = unknown> extends BoxProps {
  // ---- 页面信息 ----
  /** 页面标题 */
  title: string;
  /** 页面副标题 */
  subtitle?: string;
  /** 面包屑导航 */
  breadcrumbs?: BreadcrumbItem[];
  /** 是否启用自动面包屑（默认 true） */
  autoBreadcrumbs?: boolean;
  /** 页面描述 */
  description?: string;

  // ---- 数据 ----
  /** 列表数据 */
  items: T[];
  /** 列定义 */
  columns: MasterColumn<T>[];
  /** 获取行唯一标识 */
  getRowId: (row: T) => string | number;
  /** 搜索占位符 */
  searchPlaceholder?: string;
  /** 排序配置 */
  sort?: SortConfig;
  /** 排序变化回调 */
  onSortChange?: (sort: SortConfig) => void;
  /** 分页配置 */
  pagination?: PaginationConfig;

  // ---- 状态 ----
  /** 加载状态 */
  loading?: boolean;
  /** 错误信息 */
  error?: string;

  // ---- 右侧详情/编辑 ----
  /** 详情渲染函数（传入选中项，null 表示无选中） */
  renderDetail: (
    item: T | null,
    context: {
      isEditing: boolean;
      onEditStart: () => void;
      onEditCancel: () => void;
      onEditSave: (data: unknown) => void;
      onClose: () => void;
    }
  ) => React.ReactNode;
  /** 右侧面板标题 (非选中时) */
  detailEmptyTitle?: string;
  /** 右侧面板提示 (非选中时) */
  detailEmptyDescription?: string;

  // ---- 操作 ----
  /** 新增回调 */
  onAdd?: () => void;
  /** 新增按钮文本 */
  addButtonText?: string;
  /** 新增按钮图标 */
  addButtonIcon?: React.ReactNode;
  /** 列表行操作 */
  rowActions?: MasterRowAction<T>[];
  /** 列表头部操作按钮 */
  actions?: PageAction[];
  /** 刷新回调 */
  onRefresh?: () => void;

  // ---- 搜索 ----
  /** 搜索值（受控） */
  searchValue?: string;
  /** 搜索变化回调 */
  onSearchChange?: (value: string) => void;

  // ---- 布局 ----
  /** 左侧面板宽度 (px) */
  masterWidth?: number;
  /** 移动端是否使用 Drawer 展示详情 */
  useDrawerOnMobile?: boolean;
  /** 是否允许折叠左侧面板 */
  collapsible?: boolean;
  /** 默认左侧面板是否折叠 */
  defaultCollapsed?: boolean;

  // ---- 自定义 ----
  /** 列表顶部自定义内容 */
  masterHeaderContent?: React.ReactNode;
  /** 列表底部自定义内容 */
  masterFooterContent?: React.ReactNode;
  /** 选中项变化回调 */
  onSelectionChange?: (item: T | null) => void;
  /** 当前选中的项 ID（受控模式） */
  selectedId?: string | number;
  /** 空列表提示 */
  emptyMessage?: string;
  /** 空列表图标 */
  emptyIcon?: React.ReactNode;

  // ---- 编辑模式 ----
  /** 是否启用内置编辑状态管理 */
  enableEditMode?: boolean;
  /** 编辑保存回调 */
  onEditSave?: (item: T, data: unknown) => void;
  /** 编辑取消回调 */
  onEditCancel?: () => void;
}

// ============ 组件 ============

export function MasterDetailPageTemplate<T>({
  title,
  subtitle,
  breadcrumbs,
  autoBreadcrumbs = true,
  description,
  items,
  columns,
  getRowId,
  searchPlaceholder = '搜索...',
  sort,
  onSortChange,
  pagination,
  loading,
  error,
  renderDetail,
  detailEmptyTitle = '选择项目查看详情',
  detailEmptyDescription = '从左侧列表中选择一个项目，查看详细信息',
  onAdd,
  addButtonText = '新增',
  addButtonIcon,
  rowActions = [],
  actions,
  onRefresh,
  searchValue: controlledSearchValue,
  onSearchChange,
  masterWidth = 480,
  useDrawerOnMobile = true,
  collapsible = true,
  defaultCollapsed = false,
  masterHeaderContent,
  masterFooterContent,
  onSelectionChange,
  selectedId: controlledSelectedId,
  emptyMessage = '暂无数据',
  emptyIcon,
  enableEditMode = false,
  onEditSave,
  onEditCancel: _onEditCancel,
  ...props
}: MasterDetailPageTemplateProps<T>) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // 内部状态
  const [internalSearchValue, setInternalSearchValue] = useState('');
  const [internalSelectedId, setInternalSelectedId] = useState<string | number | undefined>(
    controlledSelectedId
  );
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [isEditing, setIsEditing] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // 受控 / 非受控
  const searchValue =
    controlledSearchValue !== undefined ? controlledSearchValue : internalSearchValue;
  const activeSelectedId =
    controlledSelectedId !== undefined ? controlledSelectedId : internalSelectedId;

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (controlledSearchValue === undefined) {
        setInternalSearchValue(value);
      }
      onSearchChange?.(value);
    },
    [controlledSearchValue, onSearchChange]
  );

  // 当前选中项
  const selectedItem = useMemo(() => {
    if (activeSelectedId === undefined) return null;
    return items.find((item) => getRowId(item) === activeSelectedId) || null;
  }, [items, activeSelectedId, getRowId]);

  // 选择处理
  const handleSelectItem = useCallback(
    (item: T) => {
      const id = getRowId(item);
      if (controlledSelectedId === undefined) {
        setInternalSelectedId(id);
      }
      setIsEditing(false);
      onSelectionChange?.(item);
      // 移动端打开 Drawer
      if (isMobile && useDrawerOnMobile) {
        setMobileDrawerOpen(true);
      }
    },
    [controlledSelectedId, getRowId, onSelectionChange, isMobile, useDrawerOnMobile]
  );

  const handleCloseDetail = useCallback(() => {
    if (controlledSelectedId === undefined) {
      setInternalSelectedId(undefined);
    }
    setIsEditing(false);
    onSelectionChange?.(null);
    if (isMobile && useDrawerOnMobile) {
      setMobileDrawerOpen(false);
    }
  }, [controlledSelectedId, onSelectionChange, isMobile, useDrawerOnMobile]);

  // 编辑模式
  const handleEditStart = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleEditCancel = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleEditSave = useCallback(
    (data: unknown) => {
      if (selectedItem && onEditSave) {
        onEditSave(selectedItem, data);
      }
      setIsEditing(false);
    },
    [selectedItem, onEditSave]
  );

  // 排序处理
  const handleSort = useCallback(
    (columnId: string) => {
      if (!onSortChange) return;
      const newDirection = sort?.field === columnId && sort.direction === 'asc' ? 'desc' : 'asc';
      onSortChange({ field: columnId, direction: newDirection });
    },
    [sort, onSortChange]
  );

  // 过滤数据
  const filteredItems = useMemo(() => {
    if (!searchValue.trim()) return items;
    const keyword = searchValue.toLowerCase();
    return items.filter((item) =>
      columns.some((col) => {
        const val = col.field ? (item as unknown as Record<string, unknown>)[col.field] : '';
        return String(val).toLowerCase().includes(keyword);
      })
    );
  }, [items, searchValue, columns]);

  // 渲染列表头部
  const renderMasterHeader = () => (
    <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography
          variant='subtitle2'
          sx={{ fontWeight: 600 }}
        >
          {description || '列表'}
          {!loading && (
            <Chip
              label={pagination ? pagination.total : filteredItems.length}
              size='small'
              sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
            />
          )}
        </Typography>
        {collapsible && !isMobile && (
          <Tooltip title={collapsed ? '展开面板' : '收起面板'}>
            <IconButton
              size='small'
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? (
                <PanelLeftOpen style={{ width: 16, height: 16 }} />
              ) : (
                <PanelLeftClose style={{ width: 16, height: 16 }} />
              )}
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* 搜索栏 */}
      <TextField
        size='small'
        placeholder={searchPlaceholder}
        value={searchValue}
        onChange={handleSearchChange}
        fullWidth
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 1.5,
            bgcolor: 'grey.50',
          },
        }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position='start'>
                <Search style={{ width: 16, height: 16, color: theme.palette.text.secondary }} />
              </InputAdornment>
            ),
            endAdornment: searchValue ? (
              <InputAdornment position='end'>
                <IconButton
                  size='small'
                  edge='end'
                  onClick={() => {
                    if (controlledSearchValue === undefined) setInternalSearchValue('');
                    onSearchChange?.('');
                  }}
                >
                  <X style={{ width: 14, height: 14 }} />
                </IconButton>
              </InputAdornment>
            ) : null,
          },
        }}
      />

      {/* 自定义头部内容 */}
      {masterHeaderContent}
    </Box>
  );

  // 渲染列表项
  const renderItem = (item: T, index: number) => {
    const rowId = getRowId(item);
    const isSelected = activeSelectedId === rowId;

    // 获取主列（第一个 showOnMobile 不为 false 的列，或第一列）
    const primaryColumn = columns[0];
    const secondaryColumn = columns.find((c) => c.id !== primaryColumn?.id);

    return (
      <Box
        key={rowId}
        onClick={() => handleSelectItem(item)}
        sx={{
          px: 2,
          py: 1.5,
          cursor: 'pointer',
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: isSelected ? 'primary.main' : 'transparent',
          color: isSelected ? 'primary.contrastText' : 'text.primary',
          transition: 'background-color 0.15s ease',
          '&:hover': {
            bgcolor: isSelected ? 'primary.dark' : 'action.hover',
          },
        }}
      >
        {/* 桌面端渲染所有列 */}
        {!isMobile ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {columns.map((col) => {
              const value = col.field
                ? (item as unknown as Record<string, unknown>)[col.field]
                : undefined;
              return (
                <Box
                  key={col.id}
                  sx={{
                    flex: col.width ? 'none' : 1,
                    width: col.width,
                    minWidth: col.minWidth,
                    textAlign: col.align || 'left',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col.render ? (
                    col.render(value, item, index)
                  ) : (
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: col.id === columns[0].id ? 500 : 400 }}
                    >
                      {value != null ? String(value) : '-'}
                    </Typography>
                  )}
                </Box>
              );
            })}
            {rowActions.length > 0 && (
              <Box
                sx={{
                  display: 'flex',
                  gap: 0.5,
                  flexShrink: 0,
                  opacity: 0,
                  transition: 'opacity 0.15s',
                  'tr:hover &': { opacity: 1 },
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {rowActions.map((action, actionIndex) => {
                  if (action.show && !action.show(item)) return null;
                  return (
                    <Tooltip
                      key={actionIndex}
                      title={action.label}
                    >
                      <IconButton
                        size='small'
                        onClick={() => action.onClick(item)}
                        disabled={action.disabled?.(item)}
                        sx={{
                          color: isSelected
                            ? 'rgba(255,255,255,0.8)'
                            : `${action.color || 'primary'}.main`,
                          '&:hover': {
                            color: isSelected ? '#fff' : `${action.color || 'primary'}.dark`,
                          },
                        }}
                      >
                        {action.icon || <ChevronsRight style={{ width: 14, height: 14 }} />}
                      </IconButton>
                    </Tooltip>
                  );
                })}
              </Box>
            )}
          </Box>
        ) : (
          /* 移动端渲染精简视图 */
          <Box>
            {primaryColumn && (
              <Typography
                variant='body2'
                sx={{ fontWeight: 600, mb: 0.25 }}
              >
                {primaryColumn.render
                  ? primaryColumn.render(
                      primaryColumn.field
                        ? (item as unknown as Record<string, unknown>)[primaryColumn.field!]
                        : undefined,
                      item,
                      index
                    )
                  : primaryColumn.field
                    ? String((item as unknown as Record<string, unknown>)[primaryColumn.field!])
                    : '-'}
              </Typography>
            )}
            {secondaryColumn && (
              <Typography
                variant='caption'
                sx={{ color: isSelected ? 'rgba(255,255,255,0.7)' : 'text.secondary' }}
              >
                {secondaryColumn.render
                  ? secondaryColumn.render(
                      secondaryColumn.field
                        ? (item as unknown as Record<string, unknown>)[secondaryColumn.field!]
                        : undefined,
                      item,
                      index
                    )
                  : secondaryColumn.field
                    ? String((item as unknown as Record<string, unknown>)[secondaryColumn.field!])
                    : '-'}
              </Typography>
            )}
          </Box>
        )}
      </Box>
    );
  };

  // 渲染列表区域
  const renderMasterList = () => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: isMobile ? 'background.paper' : 'grey.50',
      }}
    >
      {renderMasterHeader()}

      {/* 列表主体 */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          // 自定义滚动条
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'grey.300',
            borderRadius: 2,
          },
        }}
      >
        {loading ? (
          <Box sx={{ p: 2 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton
                key={i}
                height={56}
                sx={{ mb: 1, borderRadius: 1 }}
              />
            ))}
          </Box>
        ) : error ? (
          <Box sx={{ p: 4 }}>
            <ErrorEmptyState
              error={error}
              onRetry={onRefresh}
            />
          </Box>
        ) : filteredItems.length === 0 ? (
          <Box sx={{ p: 4 }}>
            <EmptyState
              icon={emptyIcon}
              title={emptyMessage}
            />
          </Box>
        ) : (
          <Box>
            {/* 列头（仅桌面端） */}
            {!isMobile && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  px: 2,
                  py: 1,
                  borderBottom: 1,
                  borderColor: 'divider',
                  bgcolor: 'grey.100',
                }}
              >
                {columns.map((col) => (
                  <Box
                    key={col.id}
                    onClick={() => col.sortable && handleSort(col.id)}
                    sx={{
                      flex: col.width ? 'none' : 1,
                      width: col.width,
                      minWidth: col.minWidth,
                      textAlign: col.align || 'left',
                      cursor: col.sortable ? 'pointer' : 'default',
                      userSelect: 'none',
                    }}
                  >
                    <Typography
                      variant='caption'
                      sx={{ fontWeight: 600, color: 'text.secondary' }}
                    >
                      {col.label}
                      {col.sortable && sort?.field === col.id && (
                        <Typography
                          component='span'
                          sx={{ ml: 0.5 }}
                        >
                          {sort.direction === 'asc' ? ' ↑' : ' ↓'}
                        </Typography>
                      )}
                    </Typography>
                  </Box>
                ))}
                {rowActions.length > 0 && <Box sx={{ width: 80 }} />}
              </Box>
            )}
            {filteredItems.map((item, index) => renderItem(item, index))}
          </Box>
        )}
      </Box>

      {/* 分页 */}
      {pagination && !loading && filteredItems.length > 0 && (
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderTop: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography
            variant='caption'
            color='text.secondary'
          >
            共 {pagination.total} 条
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Button
              size='small'
              disabled={pagination.page <= 0}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
            >
              上一页
            </Button>
            <Typography
              variant='body2'
              sx={{ px: 1, alignSelf: 'center' }}
            >
              {pagination.page + 1} /{' '}
              {Math.max(1, Math.ceil(pagination.total / pagination.pageSize))}
            </Typography>
            <Button
              size='small'
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize) - 1}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
            >
              下一页
            </Button>
          </Box>
        </Box>
      )}

      {/* 底部自定义内容 */}
      {masterFooterContent}
    </Box>
  );

  // 渲染详情面板
  const renderDetailPanel = () => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'auto',
      }}
    >
      {/* 详情面板头部 */}
      <Box
        sx={{
          px: 3,
          py: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography
          variant='subtitle1'
          sx={{ fontWeight: 600 }}
        >
          {selectedItem
            ? detailEmptyTitle.includes('选择')
              ? '详情'
              : detailEmptyTitle
            : detailEmptyTitle}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {selectedItem && enableEditMode && !isEditing && (
            <Button
              size='small'
              variant='outlined'
              onClick={handleEditStart}
            >
              编辑
            </Button>
          )}
          {(selectedItem || (isMobile && useDrawerOnMobile)) && (
            <Tooltip title='关闭'>
              <IconButton
                size='small'
                onClick={handleCloseDetail}
              >
                <X style={{ width: 18, height: 18 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* 详情内容 */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        {selectedItem ? (
          renderDetail(selectedItem, {
            isEditing,
            onEditStart: handleEditStart,
            onEditCancel: handleEditCancel,
            onEditSave: handleEditSave,
            onClose: handleCloseDetail,
          })
        ) : (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 300,
            }}
          >
            <EmptyState
              title={detailEmptyTitle}
              description={detailEmptyDescription}
            />
          </Box>
        )}
      </Box>
    </Box>
  );

  // 移动端 Drawer
  if (isMobile && useDrawerOnMobile && selectedItem) {
    return (
      <Box {...props}>
        <PageHeader
          title={title}
          subtitle={subtitle}
          breadcrumbs={breadcrumbs}
          autoBreadcrumbs={autoBreadcrumbs}
          actions={actions}
          onRefresh={onRefresh}
          loading={loading}
        />

        {/* 操作按钮 */}
        {(onAdd || onRefresh) && (
          <Box sx={{ px: 2, py: 1, display: 'flex', gap: 1 }}>
            {onAdd && (
              <Button
                variant='contained'
                size='small'
                startIcon={addButtonIcon || <Plus style={{ width: 16, height: 16 }} />}
                onClick={onAdd}
              >
                {addButtonText}
              </Button>
            )}
          </Box>
        )}

        {/* 列表 */}
        <Paper sx={{ borderRadius: 2, mx: 2, overflow: 'hidden' }}>{renderMasterList()}</Paper>

        {/* 移动端 Drawer 详情 */}
        <Drawer
          anchor='bottom'
          open={mobileDrawerOpen}
          onClose={handleCloseDetail}
          slotProps={{
            paper: {
              sx: { maxHeight: '85vh', borderRadius: '16px 16px 0 0' },
            },
          }}
        >
          {renderDetailPanel()}
        </Drawer>
      </Box>
    );
  }

  // 移动端不使用 Drawer
  if (isMobile && !useDrawerOnMobile) {
    return (
      <Box {...props}>
        <PageHeader
          title={title}
          subtitle={subtitle}
          breadcrumbs={breadcrumbs}
          autoBreadcrumbs={autoBreadcrumbs}
          actions={actions}
          onRefresh={onRefresh}
          loading={loading}
        />

        {(onAdd || onRefresh) && (
          <Box sx={{ px: 2, py: 1, display: 'flex', gap: 1 }}>
            {onAdd && (
              <Button
                variant='contained'
                size='small'
                startIcon={addButtonIcon || <Plus style={{ width: 16, height: 16 }} />}
                onClick={onAdd}
              >
                {addButtonText}
              </Button>
            )}
          </Box>
        )}

        {/* 移动端：选中项在列表下方展示 */}
        <Paper sx={{ borderRadius: 2, mx: 2, overflow: 'hidden', mb: 2 }}>
          {renderMasterList()}
        </Paper>

        {selectedItem && (
          <Paper sx={{ borderRadius: 2, mx: 2, overflow: 'hidden' }}>{renderDetailPanel()}</Paper>
        )}
      </Box>
    );
  }

  // 桌面端：主从分栏布局
  return (
    <Box {...props}>
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={breadcrumbs}
        autoBreadcrumbs={autoBreadcrumbs}
        actions={actions}
        onRefresh={onRefresh}
        loading={loading}
      />

      <Paper
        sx={{
          borderRadius: 2,
          overflow: 'hidden',
          display: 'flex',
          minHeight: `calc(100vh - 200px)`,
        }}
      >
        {/* 左侧主列表 */}
        {!collapsed && (
          <Box
            sx={{
              width: masterWidth,
              flexShrink: 0,
              borderRight: 1,
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              transition: 'width 0.3s ease',
            }}
          >
            {/* 列表顶部操作 */}
            {onAdd && (
              <Box sx={{ px: 2, pt: 2, pb: 1 }}>
                <Button
                  variant='contained'
                  size='small'
                  fullWidth
                  startIcon={addButtonIcon || <Plus style={{ width: 16, height: 16 }} />}
                  onClick={onAdd}
                >
                  {addButtonText}
                </Button>
              </Box>
            )}
            {renderMasterList()}
          </Box>
        )}

        {/* 折叠提示按钮 */}
        {collapsed && (
          <Box
            sx={{
              width: 48,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              pt: 2,
              borderRight: 1,
              borderColor: 'divider',
            }}
          >
            <Tooltip
              title='展开面板'
              placement='right'
            >
              <IconButton
                size='small'
                onClick={() => setCollapsed(false)}
              >
                <PanelLeftOpen style={{ width: 18, height: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {/* 右侧详情 */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {renderDetailPanel()}
        </Box>
      </Paper>
    </Box>
  );
}

export default MasterDetailPageTemplate;
