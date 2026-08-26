import { designTokens } from '@topems/tokens';
/**
 * TreePageTemplate - 树形结构+详情面板布局模板
 * 适用于部门管理、分类管理等场景
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
  Avatar,
  Chip,
  useTheme,
  useMediaQuery,
  Skeleton,
  Tooltip,
  Button,
} from '@mui/material';
import i18n from '@/i18n';
import {
  Search,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Plus,
  Building2,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { EmptyState } from '@topems/shared-components';

/**
 * 树形节点类型
 */
export interface TreeNode<T = any> {
  id: string;
  name: string;
  type: 'folder' | 'item';
  children?: TreeNode<T>[];
  data?: T;
  icon?: React.ReactNode;
  disabled?: boolean;
  accentColor?: string; // custom accent color for the node (hex or CSS color)
}

/**
 * 树形配置
 */
export interface TreeConfig {
  idField?: string;
  nameField?: string;
  childrenField?: string;
  iconField?: string;
  disabledField?: string;
}

/**
 * 统计卡片类型
 */
export interface StatCard {
  id: string;
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
}

/**
 * 操作按钮类型
 */
export interface TreeAction {
  label: string;
  icon?: React.ReactNode;
  onClick: (node: TreeNode) => void;
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
  disabled?: (node: TreeNode) => boolean;
  divider?: boolean;
}

/**
 * TreePageTemplate属性
 */
export interface TreePageTemplateProps {
  /** 页面标题 */
  title: string;
  /** 页面副标题 */
  subtitle?: string;
  /** 统计数据 */
  stats?: StatCard[];
  /** 统计卡片列数 */
  statsColumns?: number;
  /** 树形数据 */
  data: TreeNode[];
  /** 树形配置 */
  treeConfig?: TreeConfig;
  /** 加载状态 */
  loading?: boolean;
  /** 搜索placeholder */
  searchPlaceholder?: string;
  /** 筛选选项 */
  filterOptions?: {
    label: string;
    value: string;
  }[];
  /** 当前筛选值 */
  filterValue?: string;
  /** 筛选变更回调 */
  onFilterChange?: (value: string) => void;
  /** 搜索变更回调 */
  onSearch?: (keyword: string) => void;
  /** 搜索重置回调 */
  onReset?: () => void;
  /** 新增按钮点击回调 */
  onAdd?: () => void;
  /** 新增按钮文本 */
  addButtonText?: string;
  /** 新增按钮图标 */
  addButtonIcon?: React.ReactNode;
  /** 行操作按钮列表 */
  rowActions?: TreeAction[];
  /** 选中节点变更回调 */
  onSelect?: (node: TreeNode | null) => void;
  /** 当前选中的节点ID */
  selectedId?: string;
  /** 详情面板渲染 */
  detailPanel?: React.ReactNode | ((selectedNode: TreeNode | null) => React.ReactNode);
  /** 详情面板标题 */
  detailPanelTitle?: string;
  /** 空状态配置 */
  emptyState?: {
    emoji?: string;
    title?: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
  };
  /** 刷新回调 */
  onRefresh?: () => void;
  /** 节点渲染自定义 */
  renderNode?: (
    node: TreeNode,
    info: {
      isExpanded: boolean;
      isSelected: boolean;
      hasChildren: boolean;
      level: number;
    }
  ) => React.ReactNode;
  /** 自定义树形宽度 */
  treeWidth?: number | string;
  /** 最小面板宽度 */
  minDetailWidth?: number;
  /** 是否显示搜索 */
  showSearch?: boolean;
  /** 是否显示筛选 */
  showFilter?: boolean;
  /** 是否显示新增按钮 */
  showAddButton?: boolean;
  /** 是否显示刷新按钮 */
  showRefresh?: boolean;
  /** 自定义工具栏 */
  customToolbar?: React.ReactNode;
  /** 树形区域类名 */
  treePanelClassName?: string;
  /** 详情区域类名 */
  detailPanelClassName?: string;
  /** 是否显示连接线 - shows vertical/horizontal connector lines between tree nodes */
  showConnectors?: boolean;
}

/**
 * TreePageTemplate - 树形结构+详情面板布局模板
 */
export const TreePageTemplate: React.FC<TreePageTemplateProps> = ({
  title,
  subtitle,
  stats,
  statsColumns = 4,
  data,
  treeConfig: _treeConfig,
  loading = false,
  searchPlaceholder = i18n.t('components.tree_page_template.k0'),
  filterOptions,
  filterValue,
  onFilterChange,
  onSearch,
  onReset,
  onAdd,
  addButtonText = i18n.t('templates.tree_page_template.k0'),
  addButtonIcon,
  rowActions = [],
  onSelect,
  selectedId,
  detailPanel,
  detailPanelTitle,
  emptyState,
  onRefresh,
  renderNode: customRenderNode,
  treeWidth = 360,
  minDetailWidth = 400,
  showSearch = true,
  showFilter = true,
  showAddButton = true,
  showRefresh = true,
  customToolbar,
  treePanelClassName,
  detailPanelClassName,
  showConnectors = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // 状态
  const [searchText, setSearchText] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [internalSelectedId, setInternalSelectedId] = useState<string | undefined>(selectedId);

  // 使用props或内部状态
  const activeSelectedId = selectedId !== undefined ? selectedId : internalSelectedId;
  const setActiveSelectedId = useMemo(
    () => (selectedId !== undefined ? () => {} : setInternalSelectedId),
    [selectedId]
  );

  // 节点展开/折叠
  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // 节点选择
  const handleSelect = useCallback(
    (node: TreeNode) => {
      setActiveSelectedId(node.id);
      onSelect?.(node);
    },
    [onSelect, setActiveSelectedId]
  );

  // 搜索处理
  const handleSearch = useCallback(() => {
    onSearch?.(searchText);
  }, [onSearch, searchText]);

  // 重置处理
  const handleReset = useCallback(() => {
    setSearchText('');
    onReset?.();
  }, [onReset]);

  // 获取选中的节点
  const selectedNode = useMemo(() => {
    if (!activeSelectedId) return null;

    const findNode = (nodes: TreeNode[]): TreeNode | null => {
      for (const node of nodes) {
        if (node.id === activeSelectedId) return node;
        if (node.children) {
          const found = findNode(node.children);
          if (found) return found;
        }
      }
      return null;
    };

    return findNode(data) || null;
  }, [activeSelectedId, data]);

  // 过滤后的数据
  const filteredData = useMemo(() => {
    if (!searchText.trim()) return data;

    const search = searchText.toLowerCase();

    const filterNode = (node: TreeNode): TreeNode | null => {
      const matches = node.name.toLowerCase().includes(search);
      const filteredChildren = (node.children || [])
        .map(filterNode)
        .filter((n): n is TreeNode => n !== null);

      if (matches || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      return null;
    };

    return data.map(filterNode).filter((n): n is TreeNode => n !== null);
  }, [data, searchText]);

  // 渲染树节点
  const renderTreeItem = useCallback(
    (node: TreeNode, level: number = 0): React.ReactNode => {
      const hasChildren = !!(node.children && node.children.length > 0);
      const isExpanded = expandedIds.has(node.id);
      const isSelected = activeSelectedId === node.id;

      // 如果有自定义渲染器
      if (customRenderNode) {
        return (
          <Box key={node.id}>
            {customRenderNode(node, {
              isExpanded,
              isSelected,
              hasChildren,
              level,
            })}
          </Box>
        );
      }

      // 计算 accentColor 相关样式
      const nodeAccentColor = node.accentColor;
      const selectedBg = nodeAccentColor ? `${nodeAccentColor}15` : 'primary.light';
      const selectedColor = nodeAccentColor || 'primary.main';
      const accentBorderLeft = nodeAccentColor ? `3px solid ${nodeAccentColor}` : 'none';

      // 默认渲染器
      return (
        <Box key={node.id}>
          <Box
            sx={{
              position: showConnectors ? 'relative' : 'static',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 2,
              py: 1.5,
              borderRadius: 1,
              cursor: node.disabled ? 'not-allowed' : 'pointer',
              pl: `${level * 16 + 12}px`,
              bgcolor: isSelected ? selectedBg : 'transparent',
              color: isSelected ? selectedColor : node.disabled ? 'text.disabled' : 'text.primary',
              borderLeft: isSelected ? accentBorderLeft : 'none',
              opacity: node.disabled ? 0.5 : 1,
              '&:hover': {
                bgcolor: isSelected ? selectedBg : 'action.hover',
              },
              transition: 'all 0.15s ease',
            }}
            onClick={() => !node.disabled && handleSelect(node)}
          >
            {/* 展开/折叠按钮 */}
            {hasChildren ? (
              <IconButton
                size='small'
                sx={{ p: 0.25 }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!node.disabled) toggleExpand(node.id);
                }}
                aria-label={i18n.t('templates.tree_page_template.k1')}
              >
                {isExpanded ? (
                  <ChevronDown sx={{ width: 16, height: 16 }} />
                ) : (
                  <ChevronRight sx={{ width: 16, height: 16 }} />
                )}
              </IconButton>
            ) : (
              <Box sx={{ width: 24 }} />
            )}

            {/* 图标 */}
            {node.icon ? (
              node.icon
            ) : (
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: isSelected ? selectedBg : 'grey.100',
                }}
              >
                {node.type === 'folder' ? (
                  <Building2
                    sx={{
                      width: 16,
                      height: 16,
                      color: isSelected ? selectedColor : 'success.main',
                    }}
                  />
                ) : (
                  <Users
                    sx={{
                      width: 16,
                      height: 16,
                      color: isSelected ? selectedColor : 'primary.main',
                    }}
                  />
                )}
              </Box>
            )}

            {/* 名称 */}
            <Typography
              variant='body2'
              sx={{
                flex: 1,
                fontWeight: isSelected ? 600 : 400,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {node.name}
            </Typography>

            {/* 子节点数量 */}
            {hasChildren && (
              <Chip
                size='small'
                label={node.children?.length}
                sx={{
                  height: 20,
                  fontSize: designTokens.typography.fontSize.scale['0.75rem'],
                  bgcolor: isSelected ? nodeAccentColor || 'primary.main' : 'grey.200',
                  color: isSelected ? 'var(--color-primary-foreground)' : 'text.secondary',
                }}
              />
            )}
          </Box>

          {/* 子节点 */}
          {hasChildren && isExpanded && (
            <Box
              sx={{
                ml: 1.5,
                borderLeft: showConnectors ? '2px solid' : 'none',
                borderColor: 'divider',
                pl: 2,
              }}
            >
              {node.children?.map((child) => renderTreeItem(child, level + 1))}
            </Box>
          )}
        </Box>
      );
    },
    [expandedIds, activeSelectedId, handleSelect, toggleExpand, customRenderNode, showConnectors]
  );

  // 渲染统计卡片
  const renderStatCards = () => {
    if (!stats || stats.length === 0) return null;

    return (
      <Paper sx={{ mb: 3, p: 2, borderRadius: 3 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              md: `repeat(${Math.min(statsColumns, stats.length)}, 1fr)`,
            },
            gap: 2,
          }}
        >
          {stats.map((stat) => (
            <Box
              key={stat.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 2,
                bgcolor: 'grey.50',
                borderRadius: 3,
              }}
            >
              {stat.icon && (
                <Avatar
                  sx={{
                    bgcolor: `${stat.color || 'primary'}.light`,
                    color: `${stat.color || 'primary'}.main`,
                    width: 40,
                    height: 40,
                  }}
                >
                  {stat.icon}
                </Avatar>
              )}
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {stat.title}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography
                    variant='h5'
                    sx={{ fontWeight: 700 }}
                  >
                    {stat.value}
                  </Typography>
                  {stat.trend && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 1 }}>
                      {stat.trend.direction === 'down' ? (
                        <TrendingDown sx={{ fontSize: 14, color: 'error.main' }} />
                      ) : stat.trend.direction === 'neutral' ? (
                        <Minus sx={{ fontSize: 14, color: 'text.secondary' }} />
                      ) : (
                        <TrendingUp sx={{ fontSize: 14, color: 'success.main' }} />
                      )}
                      <Typography
                        variant='caption'
                        sx={{
                          color:
                            stat.trend.direction === 'up'
                              ? 'success.main'
                              : stat.trend.direction === 'down'
                                ? 'error.main'
                                : 'text.secondary',
                        }}
                      >
                        {Math.abs(stat.trend.value)}%
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </Paper>
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
          {showRefresh && (
            <Tooltip title={i18n.t('templates.tree_page_template.k2')}>
              <IconButton
                onClick={onRefresh}
                disabled={loading}
                aria-label={i18n.t('templates.tree_page_template.k3')}
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
          {showAddButton && onAdd && (
            <Button
              variant='contained'
              startIcon={addButtonIcon || <Plus style={{ width: 18, height: 18 }} />}
              onClick={onAdd}
            >
              {addButtonText}
            </Button>
          )}
        </Box>
      </Box>

      {/* 统计卡片 */}
      {renderStatCards()}

      {/* 自定义工具栏 */}
      {customToolbar && <Box sx={{ mb: 2 }}>{customToolbar}</Box>}

      {/* 主内容区 - 树形+详情 */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              md: typeof treeWidth === 'number' ? `${treeWidth}px 1fr` : `${treeWidth} 1fr`,
            },
            minHeight: isMobile ? 'auto' : 500,
          }}
        >
          {/* 左侧树形区域 */}
          <Box
            className={treePanelClassName}
            sx={{
              borderRight: 1,
              borderColor: 'divider',
              bgcolor: 'grey.50',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* 搜索和筛选 */}
            <Box sx={{ p: 2 }}>
              {showSearch && (
                <TextField
                  type='text'
                  placeholder={searchPlaceholder}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  size='small'
                  fullWidth
                  sx={{ mb: showFilter ? 2 : 0 }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position='start'>
                          <Search
                            sx={{
                              width: 18,
                              height: 18,
                              color: 'text.secondary',
                            }}
                          />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              )}

              {showFilter && filterOptions && filterOptions.length > 0 && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <FormControl
                    size='small'
                    sx={{ minWidth: 120, flex: 1 }}
                  >
                    <Select
                      value={filterValue || 'all'}
                      onChange={(e) => onFilterChange?.(e.target.value)}
                      displayEmpty
                    >
                      {filterOptions.map((option) => (
                        <MenuItem
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button
                    variant='outlined'
                    size='small'
                    onClick={handleSearch}
                  >
                    {i18n.t('components.tree_page_template.k0')}
                  </Button>
                  <Button
                    variant='outlined'
                    size='small'
                    onClick={handleReset}
                  >
                    {i18n.t('components.tree_page_template.k1')}
                  </Button>
                </Box>
              )}
            </Box>

            {/* 树形列表 */}
            <Box
              sx={{
                flex: 1,
                overflow: 'auto',
                px: 1,
                pb: 2,
                maxHeight: `calc(100vh - ${isMobile ? 400 : 320}px)`,
              }}
            >
              {loading ? (
                <Box sx={{ p: 4 }}>
                  {[1, 2, 3].map((i) => (
                    <Skeleton
                      key={i}
                      height={48}
                      sx={{ mb: 1 }}
                    />
                  ))}
                </Box>
              ) : filteredData.length === 0 ? (
                <EmptyState
                  emoji={emptyState?.emoji || '📂'}
                  title={emptyState?.title || i18n.t('templates.tree_page_template.k4')}
                  description={emptyState?.description}
                  actionLabel={emptyState?.actionLabel}
                  onAction={emptyState?.onAction}
                />
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {filteredData.map((node) => renderTreeItem(node))}
                </Box>
              )}
            </Box>
          </Box>

          {/* 右侧详情区域 */}
          <Box
            className={detailPanelClassName}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              minWidth: minDetailWidth,
            }}
          >
            {selectedNode ? (
              <>
                {/* 详情面板头部 */}
                {detailPanelTitle && (
                  <Box
                    sx={{
                      p: 2,
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
                      {detailPanelTitle}
                    </Typography>

                    {/* 行操作按钮 */}
                    {rowActions.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {rowActions.map((action, index) => (
                          <Tooltip
                            key={index}
                            title={action.label}
                          >
                            <IconButton
                              size='small'
                              sx={{
                                color: `${action.color || 'primary'}.main`,
                              }}
                              onClick={() => action.onClick(selectedNode)}
                              disabled={action.disabled?.(selectedNode)}
                              aria-label={action.label}
                            >
                              {action.icon}
                            </IconButton>
                          </Tooltip>
                        ))}
                      </Box>
                    )}
                  </Box>
                )}

                {/* 详情内容 */}
                <Box
                  sx={{
                    flex: 1,
                    p: 3,
                    overflow: 'auto',
                    maxHeight: `calc(100vh - ${isMobile ? 280 : 200}px)`,
                  }}
                >
                  {typeof detailPanel === 'function' ? detailPanel(selectedNode) : detailPanel}
                </Box>
              </>
            ) : (
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 4,
                }}
              >
                <EmptyState
                  emoji='👈'
                  title={i18n.t('templates.tree_page_template.k5')}
                  description={i18n.t('templates.tree_page_template.k6')}
                />
              </Box>
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default TreePageTemplate;
