/**
 * CardListTemplate - 卡片式列表布局模板
 * 适用于任务卡片、设备卡片、订单卡片等场景
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Skeleton,
  Tooltip,
  Pagination,
  Collapse,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Button } from '@/components/ui/Button';
import { Search, RefreshCw, Filter, Plus, ChevronDown, ChevronUp, Grid, List } from 'lucide-react';
import { EmptyState } from '@/components/mui';

/**
 * 统计卡片类型
 */
export interface MetricStatCard {
  id: string;
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  gradient?: [string, string];
  subtitle?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
}

/**
 * 筛选配置类型
 */
export interface FilterConfig {
  id: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'daterange';
  placeholder?: string;
  options?: { label: string; value: string }[];
  width?: number | string;
}

/**
 * 卡片操作类型
 */
export interface CardAction {
  label: string;
  icon?: React.ReactNode;
  onClick: (item: any) => void;
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
  disabled?: (item: any) => boolean;
  variant?: 'contained' | 'outlined' | 'text';
  divider?: boolean;
}

/**
 * 卡片渲染配置
 */
export interface CardRenderConfig {
  /** 标题字段或渲染函数 */
  title: string | ((item: any) => React.ReactNode);
  /** 描述字段或渲染函数 */
  description?: string | ((item: any) => React.ReactNode);
  /** 状态字段和配置 */
  status?: {
    field: string;
    options: Record<string, { label: string; color: string }>;
  };
  /** 元数据字段列表 */
  meta?: Array<{
    field: string;
    label?: string;
    format?: (value: any, item: any) => React.ReactNode;
    icon?: React.ReactNode;
  }>;
  /** 标签字段 */
  tags?: Array<{
    field: string;
    options?: Record<string, { label: string; color?: string }>;
  }>;
  /** 左侧图标 */
  icon?: React.ReactNode | ((item: any) => React.ReactNode);
  /** 左侧图标背景色 */
  iconBgColor?: string | ((item: any) => string);
}

/**
 * CardListTemplate属性
 */
export interface CardListTemplateProps {
  /** 页面标题 */
  title: string;
  /** 页面副标题 */
  subtitle?: string;
  /** 统计数据（顶部MetricCard） */
  metricStats?: MetricStatCard[];
  /** 统计数据列数 */
  metricColumns?: number;
  /** 列表数据 */
  data: any[];
  /** 卡片渲染配置 */
  cardConfig: CardRenderConfig;
  /** 加载状态 */
  loading?: boolean;
  /** 空状态配置 */
  emptyState?: {
    emoji?: string;
    title?: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
  };
  /** 搜索配置 */
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  /** 筛选配置列表 */
  filters?: FilterConfig[];
  /** 当前筛选值 */
  filterValues?: Record<string, any>;
  /** 筛选变更回调 */
  onFilterChange?: (filters: Record<string, any>) => void;
  /** 重置筛选回调 */
  onFilterReset?: () => void;
  /** 搜索回调 */
  onSearch?: () => void;
  /** 新增按钮配置 */
  addButton?: {
    text?: string;
    icon?: React.ReactNode;
    onClick: () => void;
  };
  /** 刷新回调 */
  onRefresh?: () => void;
  /** 分页配置 */
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
  };
  /** 卡片操作按钮列表 */
  cardActions?: CardAction[];
  /** 卡片点击回调 */
  onCardClick?: (item: any) => void;
  /** 是否显示统计概览 */
  showStatsOverview?: boolean;
  /** 统计概览展开状态 */
  statsOverviewExpanded?: boolean;
  /** 统计概览展开变更回调 */
  onStatsOverviewToggle?: (expanded: boolean) => void;
  /** 卡片网格列数 */
  gridColumns?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
  };
  /** 是否显示视图切换 */
  showViewToggle?: boolean;
  /** 当前视图模式 */
  viewMode?: 'grid' | 'list';
  /** 视图模式变更回调 */
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  /** 自定义工具栏 */
  customToolbar?: React.ReactNode;
  /** 是否显示筛选折叠面板 */
  showFilterCollapse?: boolean;
  /** 默认筛选展开状态 */
  defaultFilterExpanded?: boolean;
  /** 卡片高度固定 */
  fixedCardHeight?: number | string;
}

/**
 * CardListTemplate - 卡片式列表布局模板
 */
export const CardListTemplate: React.FC<CardListTemplateProps> = ({
  title,
  subtitle,
  metricStats = [],
  metricColumns = 6,
  data,
  cardConfig,
  loading = false,
  emptyState,
  search,
  filters = [],
  filterValues = {},
  onFilterChange,
  onFilterReset,
  onSearch,
  addButton,
  onRefresh,
  pagination,
  cardActions = [],
  onCardClick,
  showStatsOverview = true,
  statsOverviewExpanded = true,
  onStatsOverviewToggle,
  gridColumns = { xs: 1, sm: 2, md: 3, lg: 4 },
  showViewToggle = false,
  viewMode: controlledViewMode,
  onViewModeChange,
  customToolbar,
  showFilterCollapse = false,
  defaultFilterExpanded = false,
  fixedCardHeight,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // 内部状态
  const [internalViewMode, setInternalViewMode] = useState<'grid' | 'list'>('grid');
  const [filterExpanded, setFilterExpanded] = useState(defaultFilterExpanded);

  // 使用受控或内部状态
  const viewMode = controlledViewMode !== undefined ? controlledViewMode : internalViewMode;
  const setViewMode = onViewModeChange || setInternalViewMode;

  // 筛选变更处理
  const handleFilterChange = useCallback(
    (filterId: string, value: any) => {
      const newFilters = { ...filterValues, [filterId]: value };
      onFilterChange?.(newFilters);
    },
    [filterValues, onFilterChange]
  );

  // 重置筛选
  const handleReset = useCallback(() => {
    onFilterReset?.();
  }, [onFilterReset]);

  // 渲染统计卡片
  const renderMetricCards = () => {
    if (!metricStats || metricStats.length === 0) return null;

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            sm: 'repeat(3, 1fr)',
            md: `repeat(${Math.min(metricColumns, metricStats.length)}, 1fr)`,
          },
          gap: 2,
        }}
      >
        {metricStats.map((stat) => (
          <Paper
            key={stat.id}
            sx={{
              p: 2,
              borderRadius: 2,
              background: stat.gradient
                ? `linear-gradient(135deg, ${stat.gradient[0]}, ${stat.gradient[1]})`
                : undefined,
              bgcolor: stat.gradient ? undefined : 'grey.50',
              color: stat.gradient ? 'white' : 'inherit',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              {stat.icon && (
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: stat.gradient
                      ? 'rgba(255,255,255,0.2)'
                      : `${stat.color || 'primary'}.light`,
                    color: stat.gradient ? 'white' : `${stat.color || 'primary'}.main`,
                  }}
                >
                  {stat.icon}
                </Box>
              )}
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant='caption'
                  sx={{
                    opacity: stat.gradient ? 0.8 : 1,
                    color: stat.gradient ? 'rgba(255,255,255,0.8)' : 'text.secondary',
                  }}
                >
                  {stat.title}
                </Typography>
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 700 }}
                >
                  {stat.value}
                </Typography>
                {stat.subtitle && (
                  <Typography
                    variant='caption'
                    sx={{
                      color: stat.gradient ? 'rgba(255,255,255,0.7)' : 'text.secondary',
                    }}
                  >
                    {stat.subtitle}
                  </Typography>
                )}
              </Box>
            </Box>

            {/* 趋势指示器 */}
            {stat.trend && (
              <Chip
                size='small'
                label={`${stat.trend.value > 0 ? '+' : ''}${stat.trend.value}%`}
                sx={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  bgcolor:
                    stat.trend.direction === 'up'
                      ? stat.gradient
                        ? 'rgba(255,255,255,0.2)'
                        : 'success.light'
                      : stat.trend.direction === 'down'
                        ? stat.gradient
                          ? 'rgba(255,255,255,0.2)'
                          : 'error.light'
                        : 'grey.200',
                  color: stat.gradient
                    ? 'white'
                    : stat.trend.direction === 'up'
                      ? 'success.main'
                      : stat.trend.direction === 'down'
                        ? 'error.main'
                        : 'text.secondary',
                  fontWeight: 500,
                }}
              />
            )}
          </Paper>
        ))}
      </Box>
    );
  };

  // 渲染筛选区
  const renderFilters = () => {
    if (filters.length === 0) return null;

    const filterContent = (
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        {filters.map((filter) => {
          const value = filterValues?.[filter.id];

          if (filter.type === 'text') {
            return (
              <TextField
                key={filter.id}
                size='small'
                placeholder={filter.placeholder || filter.label}
                value={value || ''}
                onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch?.()}
                sx={{ minWidth: filter.width || 200 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position='start'>
                        <Search
                          sx={{
                            width: 16,
                            height: 16,
                            color: 'text.secondary',
                          }}
                        />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            );
          }

          if (filter.type === 'select' && filter.options) {
            return (
              <FormControl
                key={filter.id}
                size='small'
                sx={{ minWidth: filter.width || 150 }}
              >
                <InputLabel>{filter.label}</InputLabel>
                <Select
                  value={value || ''}
                  label={filter.label}
                  onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                >
                  {filter.options.map((option) => (
                    <MenuItem
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            );
          }

          return null;
        })}

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant='contained'
            size='small'
            onClick={onSearch}
          >
            搜索
          </Button>
          <Button
            variant='outlined'
            size='small'
            onClick={handleReset}
          >
            重置
          </Button>
        </Box>
      </Box>
    );

    if (showFilterCollapse) {
      return (
        <Paper sx={{ mb: 2, p: 2, borderRadius: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              mb: filterExpanded ? 2 : 0,
            }}
            onClick={() => setFilterExpanded(!filterExpanded)}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Filter sx={{ width: 18, height: 18, color: 'text.secondary' }} />
              <Typography
                variant='subtitle2'
                color='text.secondary'
              >
                筛选条件
              </Typography>
            </Box>
            <IconButton size='small'>
              {filterExpanded ? (
                <ChevronUp sx={{ width: 18, height: 18 }} />
              ) : (
                <ChevronDown sx={{ width: 18, height: 18 }} />
              )}
            </IconButton>
          </Box>
          <Collapse in={filterExpanded}>{filterContent}</Collapse>
        </Paper>
      );
    }

    return <Paper sx={{ mb: 2, p: 2, borderRadius: 2 }}>{filterContent}</Paper>;
  };

  // 渲染单个卡片
  const renderCard = (item: any, index: number) => {
    const title =
      typeof cardConfig.title === 'function' ? cardConfig.title(item) : item[cardConfig.title];

    const description = cardConfig.description
      ? typeof cardConfig.description === 'function'
        ? cardConfig.description(item)
        : item[cardConfig.description]
      : null;

    const icon = cardConfig.icon
      ? typeof cardConfig.icon === 'function'
        ? cardConfig.icon(item)
        : cardConfig.icon
      : null;

    const iconBgColor = cardConfig.iconBgColor
      ? typeof cardConfig.iconBgColor === 'function'
        ? cardConfig.iconBgColor(item)
        : cardConfig.iconBgColor
      : 'primary.light';

    const statusConfig = cardConfig.status?.field
      ? cardConfig.status?.options?.[item[cardConfig.status.field]]
      : undefined;
    const statusColor = statusConfig?.color || 'default';
    const statusLabel =
      statusConfig?.label || (cardConfig.status?.field ? item[cardConfig.status.field] : '');

    return (
      <Paper
        key={item.id || index}
        sx={{
          borderRadius: 2,
          overflow: 'hidden',
          cursor: onCardClick ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
          '&:hover': {
            boxShadow: onCardClick ? 4 : 1,
            transform: onCardClick ? 'translateY(-2px)' : 'none',
          },
          height: fixedCardHeight,
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={() => onCardClick?.(item)}
      >
        <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* 卡片头部 */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
            {/* 图标 */}
            {icon && (
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: iconBgColor,
                  flexShrink: 0,
                }}
              >
                {icon}
              </Box>
            )}

            {/* 标题和描述 */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography
                  variant='subtitle1'
                  sx={{
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {title}
                </Typography>
                {statusConfig && (
                  <Chip
                    size='small'
                    label={statusLabel}
                    sx={{
                      bgcolor: `${statusColor}.light`,
                      color: `${statusColor}.main`,
                      fontWeight: 500,
                      height: 22,
                    }}
                  />
                )}
              </Box>
              {description && (
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {description}
                </Typography>
              )}
            </Box>
          </Box>

          {/* 元数据 */}
          {cardConfig.meta && cardConfig.meta.length > 0 && (
            <Box sx={{ flex: 1 }}>
              {cardConfig.meta.map((meta, idx) => {
                const value = item[meta.field];
                const formattedValue = meta.format ? meta.format(value, item) : value;

                return (
                  <Box
                    key={idx}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 1,
                      color: 'text.secondary',
                    }}
                  >
                    {meta.icon && (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          color: 'text.disabled',
                        }}
                      >
                        {meta.icon}
                      </Box>
                    )}
                    {meta.label && (
                      <Typography
                        variant='caption'
                        sx={{ minWidth: 60 }}
                      >
                        {meta.label}:
                      </Typography>
                    )}
                    <Typography
                      variant='body2'
                      sx={{ flex: 1 }}
                    >
                      {formattedValue || '-'}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          )}

          {/* 标签 */}
          {cardConfig.tags && cardConfig.tags.length > 0 && (
            <Box
              sx={{
                display: 'flex',
                gap: 0.5,
                flexWrap: 'wrap',
                mt: 'auto',
                pt: 1,
              }}
            >
              {cardConfig.tags.map((tag, idx) => {
                const tagValue = item[tag.field];
                const tagConfig = tag.options?.[tagValue];

                return (
                  <Chip
                    key={idx}
                    size='small'
                    label={tagConfig?.label || tagValue}
                    sx={{
                      bgcolor: tagConfig?.color || 'grey.100',
                      color: tagConfig?.color
                        ? `${tagConfig.color}.contrastText`
                        : 'text.secondary',
                      height: 22,
                    }}
                  />
                );
              })}
            </Box>
          )}
        </Box>

        {/* 操作按钮 */}
        {cardActions.length > 0 && (
          <Box
            sx={{
              px: 2,
              py: 1.5,
              borderTop: 1,
              borderColor: 'divider',
              display: 'flex',
              gap: 1,
              bgcolor: 'grey.50',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {cardActions.map((action, idx) => (
              <Button
                key={idx}
                size='small'
                variant={action.variant || 'text'}
                color={action.color || 'primary'}
                onClick={() => action.onClick(item)}
                disabled={action.disabled?.(item)}
                startIcon={action.icon}
                sx={{ textTransform: 'none' }}
              >
                {action.label}
              </Button>
            ))}
          </Box>
        )}
      </Paper>
    );
  };

  // 渲染分页
  const renderPagination = () => {
    if (!pagination) return null;

    const totalPages = Math.ceil(pagination.total / pagination.pageSize);

    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <Pagination
          count={totalPages}
          page={pagination.page}
          onChange={(_, p) => pagination.onPageChange(p)}
          color='primary'
          showFirstButton
          showLastButton
        />
      </Box>
    );
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* 页面标题栏 */}
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant='h5'
            sx={{ fontWeight: 600, mb: 0.5 }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {subtitle}
            </Typography>
          )}
        </Box>

        {/* 操作按钮 */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {showViewToggle && (
            <Box
              sx={{
                display: 'flex',
                bgcolor: 'grey.100',
                borderRadius: 1,
                p: 0.5,
              }}
            >
              <IconButton
                size='small'
                onClick={() => setViewMode('grid')}
                sx={{
                  bgcolor: viewMode === 'grid' ? 'background.paper' : 'transparent',
                  boxShadow: viewMode === 'grid' ? 1 : 0,
                }}
              >
                <Grid sx={{ width: 16, height: 16 }} />
              </IconButton>
              <IconButton
                size='small'
                onClick={() => setViewMode('list')}
                sx={{
                  bgcolor: viewMode === 'list' ? 'background.paper' : 'transparent',
                  boxShadow: viewMode === 'list' ? 1 : 0,
                }}
              >
                <List sx={{ width: 16, height: 16 }} />
              </IconButton>
            </Box>
          )}

          {onRefresh && (
            <Tooltip title='刷新'>
              <IconButton
                onClick={onRefresh}
                disabled={loading}
              >
                <RefreshCw
                  sx={{
                    width: 18,
                    height: 18,
                    animation: loading ? 'spin 1s linear infinite' : 'none',
                    '@keyframes spin': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' },
                    },
                  }}
                />
              </IconButton>
            </Tooltip>
          )}

          {addButton && (
            <Button
              variant='contained'
              startIcon={addButton.icon || <Plus style={{ width: 18, height: 18 }} />}
              onClick={addButton.onClick}
            >
              {addButton.text || '新增'}
            </Button>
          )}
        </Box>
      </Box>

      {/* 自定义工具栏 */}
      {customToolbar && <Box sx={{ mb: 2 }}>{customToolbar}</Box>}

      {/* 统计概览 */}
      {showStatsOverview && metricStats.length > 0 && (
        <Paper sx={{ mb: 3, p: 2, borderRadius: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              mb: statsOverviewExpanded ? 2 : 0,
            }}
            onClick={() => onStatsOverviewToggle?.(!statsOverviewExpanded)}
          >
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600 }}
            >
              数据概览
            </Typography>
            <IconButton size='small'>
              {statsOverviewExpanded ? (
                <ChevronUp sx={{ width: 18, height: 18 }} />
              ) : (
                <ChevronDown sx={{ width: 18, height: 18 }} />
              )}
            </IconButton>
          </Box>
          <Collapse in={statsOverviewExpanded}>{renderMetricCards()}</Collapse>
        </Paper>
      )}

      {/* 筛选区 */}
      {renderFilters()}

      {/* 卡片列表 */}
      <Paper sx={{ borderRadius: 2 }}>
        {loading ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: `repeat(${gridColumns.sm || 2}, 1fr)`,
                md: `repeat(${gridColumns.md || 3}, 1fr)`,
                lg: `repeat(${gridColumns.lg || 4}, 1fr)`,
              },
              gap: 2,
              p: 2,
            }}
          >
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton
                key={i}
                height={200}
                sx={{ borderRadius: 2 }}
              />
            ))}
          </Box>
        ) : data.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <EmptyState
              emoji={emptyState?.emoji || '📋'}
              title={emptyState?.title || '暂无数据'}
              description={emptyState?.description}
              actionLabel={emptyState?.actionLabel}
              onAction={emptyState?.onAction}
            />
          </Box>
        ) : (
          <>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: `repeat(${gridColumns.sm || 2}, 1fr)`,
                  md: `repeat(${gridColumns.md || 3}, 1fr)`,
                  lg: `repeat(${gridColumns.lg || 4}, 1fr)`,
                },
                gap: 2,
                p: 2,
              }}
            >
              {data.map((item, index) => renderCard(item, index))}
            </Box>

            {/* 分页 */}
            {renderPagination()}
          </>
        )}
      </Paper>
    </Box>
  );
};

export default CardListTemplate;
