import React, { useState } from 'react';
import type { BoxProps } from '@mui/material';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Skeleton,
  useTheme,
  useMediaQuery,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Stack,
} from '@mui/material';
import { Grid } from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  MoreVertical,
  RefreshCw,
  Download,
  Maximize,
  LayoutGrid,
  List,
  LayoutDashboard,
} from 'lucide-react';
import type { BreadcrumbItem } from './PageHeader';
import { PageHeader } from './PageHeader';
import { logger } from '@/utils/logger';

// ============ 类型定义 ============

// 图表类型
export type ChartType = 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'radar' | 'gauge';

// 图表数据点
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  [key: string]: any;
}

// 图表系列
export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  color?: string;
  type?: ChartType;
}

// 图表配置
export interface ChartConfig {
  // 是否显示图例
  showLegend?: boolean;
  // 是否显示网格
  showGrid?: boolean;
  // 是否显示工具提示
  showTooltip?: boolean;
  // 是否动画
  animated?: boolean;
  // 颜色主题
  colorTheme?: string[];
  // X轴配置
  xAxis?: {
    label?: string;
    show?: boolean;
    type?: 'category' | 'value' | 'time';
  };
  // Y轴配置
  yAxis?: {
    label?: string;
    show?: boolean;
    min?: number;
    max?: number;
  };
  // 自定义配置
  customOptions?: Record<string, any>;
}

export interface StatCard {
  id: string;
  title: string;
  value: string | number;
  unit?: string;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  onClick?: () => void;
  // 新增：趋势数据
  trend?: number[];
  // 新增：进度条
  progress?: number;
  progressLabel?: string;
  // 新增：副标题
  subtitle?: string;
  // 新增：标签
  tags?: Array<{ label: string; color?: string }>;
  // 新增：卡片样式
  variant?: 'elevation' | 'outlined';
  // 新增：尺寸
  size?: 'small' | 'medium' | 'large';
}

export interface ChartCard {
  id: string;
  title: string;
  subtitle?: string;
  chart: React.ReactNode;
  height?: number;
  actions?: React.ReactNode;
  // 新增：图表类型
  type?: ChartType;
  // 新增：图表数据
  data?: ChartDataPoint[] | ChartSeries[];
  // 新增：图表配置
  config?: ChartConfig;
  // 新增：刷新回调
  onRefresh?: () => void;
  // 新增：下载回调
  onDownload?: () => void;
  // 新增：全屏回调
  onFullscreen?: () => void;
  // 新增：加载状态
  loading?: boolean;
  // 新增：错误状态
  error?: string;
  // 新增：卡片样式
  variant?: 'elevation' | 'outlined';
  // 新增：是否可展开
  expandable?: boolean;
  defaultExpanded?: boolean;
}

export interface RecentItem {
  id: string;
  title: string;
  description?: string;
  time?: string;
  avatar?: React.ReactNode;
  onClick?: () => void;
  // 新增：状态
  status?: 'success' | 'warning' | 'error' | 'info' | 'default';
  // 新增：标签
  tags?: Array<{ label: string; color?: string }>;
  // 新增：图标
  icon?: React.ReactNode;
}

export interface QuickAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  color?: string;
  // 新增：描述
  description?: string;
  // 新增：是否禁用
  disabled?: boolean;
  // 新增：徽章
  badge?: number | string;
  // 新增：样式变体
  variant?: 'card' | 'button' | 'icon';
}

// 卡片分组配置
export interface CardGroup {
  id: string;
  title: string;
  cards: StatCard[];
  // 新增：布局配置
  layout?: 'grid' | 'carousel' | 'tabs';
  // 新增：是否可折叠
  collapsible?: boolean;
  defaultExpanded?: boolean;
  // 新增：图标
  icon?: React.ReactNode;
  // 新增：操作按钮
  actions?: React.ReactNode;
}

// 布局断点配置
export interface LayoutBreakpoints {
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
}

// 布局配置
export interface LayoutConfig {
  // 统计卡片布局
  statsLayout?: 'grid' | 'carousel' | 'tabs';
  // 统计卡片断点配置
  statsBreakpoints?: LayoutBreakpoints;
  // 图表布局
  chartsLayout?: 'grid' | 'stack' | 'tabs';
  // 图表断点配置
  chartsBreakpoints?: LayoutBreakpoints;
  // 是否启用拖拽排序
  enableDragAndDrop?: boolean;
  // 是否启用响应式
  responsive?: boolean;
  // 自定义间距
  spacing?: number;
  // 自定义内边距
  padding?: number;
}

export interface DashboardTemplateProps extends BoxProps {
  // 页面信息
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];

  // 统计卡片
  stats?: StatCard[];
  // 新增：卡片分组
  cardGroups?: CardGroup[];

  // 图表
  charts?: ChartCard[];

  // 最近事项
  recentItems?: RecentItem[];
  recentTitle?: string;

  // 快捷操作
  quickActions?: QuickAction[];
  quickActionsTitle?: string;

  // 状态
  loading?: boolean;

  // 子组件
  headerContent?: React.ReactNode;
  children?: React.ReactNode;
  statsArea?: React.ReactNode;
  chartsArea?: React.ReactNode;
  recentItemsArea?: React.ReactNode;
  quickActionsArea?: React.ReactNode;

  // 新增：布局配置
  layout?: LayoutConfig;
  // 新增：刷新回调
  onRefresh?: () => void;
  // 新增：自定义渲染器
  customRenderers?: {
    statCard?: (stat: StatCard) => React.ReactNode;
    chartCard?: (chart: ChartCard) => React.ReactNode;
    recentItem?: (item: RecentItem) => React.ReactNode;
    quickAction?: (action: QuickAction) => React.ReactNode;
  };
  // 新增：持久化配置
  persistConfig?: boolean;
  configKey?: string;
}

// ============ 统计卡片组件 ============

const StatCardComponent: React.FC<StatCard & { loading?: boolean }> = ({
  title,
  value,
  unit,
  change,
  changeLabel,
  icon,
  color = 'primary',
  onClick,
  loading,
  trend,
  progress,
  progressLabel,
  subtitle,
  tags,
  variant = 'elevation',
  size = 'medium',
}) => {
  const colorMap: Record<string, string> = {
    primary: 'primary.main',
    secondary: 'secondary.main',
    success: 'success.dark',
    warning: 'warning.main',
    error: 'error.main',
    info: 'info.main',
  };

  const bgColor = colorMap[color] || colorMap.primary;

  const sizeStyles = {
    small: {
      padding: 1.5,
      iconSize: 36,
      titleSize: 'body2' as const,
      valueSize: 'h5' as const,
    },
    medium: {
      padding: 2,
      iconSize: 48,
      titleSize: 'body2' as const,
      valueSize: 'h4' as const,
    },
    large: {
      padding: 3,
      iconSize: 56,
      titleSize: 'body1' as const,
      valueSize: 'h3' as const,
    },
  };

  const currentSize = sizeStyles[size];

  return (
    <Card
      variant={variant}
      sx={{
        borderRadius: 2,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': onClick
          ? {
              transform: 'translateY(-2px)',
              boxShadow: 4,
            }
          : {},
      }}
      onClick={onClick}
    >
      <CardContent sx={{ padding: currentSize.padding }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography
                variant={currentSize.titleSize}
                color='text.secondary'
              >
                {title}
              </Typography>
              {tags && tags.length > 0 && (
                <Stack
                  direction='row'
                  spacing={0.5}
                >
                  {tags.map((tag, index) => (
                    <Chip
                      key={index}
                      label={tag.label}
                      size='small'
                      sx={{
                        height: 20,
                        fontSize: '0.65rem',
                        bgcolor: tag.color || `${bgColor}20`,
                        color: tag.color || bgColor,
                      }}
                    />
                  ))}
                </Stack>
              )}
            </Box>
            {subtitle && (
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{ display: 'block', mb: 0.5 }}
              >
                {subtitle}
              </Typography>
            )}
            {loading ? (
              <>
                <Skeleton
                  width={80}
                  height={32}
                />
                <Skeleton
                  width={60}
                  height={20}
                />
              </>
            ) : (
              <>
                <Typography
                  variant={currentSize.valueSize}
                  sx={{ fontWeight: 700 }}
                >
                  {value}
                  {unit && (
                    <Typography
                      component='span'
                      variant='body2'
                      color='text.secondary'
                      sx={{ ml: 0.5 }}
                    >
                      {unit}
                    </Typography>
                  )}
                </Typography>
                {change !== undefined && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      mt: 0.5,
                    }}
                  >
                    {change > 0 ? (
                      <TrendingUp style={{ width: 14, height: 14, color: 'success.dark' }} />
                    ) : change < 0 ? (
                      <TrendingDown style={{ width: 14, height: 14, color: 'error.main' }} />
                    ) : (
                      <Minus style={{ width: 14, height: 14, color: 'text.disabled' }} />
                    )}
                    <Typography
                      variant='caption'
                      sx={{
                        color:
                          change > 0
                            ? 'success.main'
                            : change < 0
                              ? 'error.main'
                              : 'text.secondary',
                      }}
                    >
                      {change > 0 ? '+' : ''}
                      {change}
                      {changeLabel && ` ${changeLabel}`}
                    </Typography>
                  </Box>
                )}
                {progress !== undefined && (
                  <Box sx={{ mt: 1 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        mb: 0.5,
                      }}
                    >
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        {progressLabel || '进度'}
                      </Typography>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        {progress}%
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        width: '100%',
                        height: 6,
                        bgcolor: 'grey.200',
                        borderRadius: 3,
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          width: `${progress}%`,
                          height: '100%',
                          bgcolor: bgColor,
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </Box>
                  </Box>
                )}
              </>
            )}
          </Box>
          {icon && (
            <Box
              sx={{
                width: currentSize.iconSize,
                height: currentSize.iconSize,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: `${bgColor}15`,
                color: bgColor,
              }}
            >
              {icon}
            </Box>
          )}
        </Box>
        {trend && trend.length > 0 && !loading && (
          <Box sx={{ mt: 2, height: 40 }}>
            <MiniTrendChart
              data={trend}
              color={bgColor}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// 迷你趋势图组件
const MiniTrendChart: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      width='100%'
      height='100%'
      preserveAspectRatio='none'
    >
      <polyline
        points={points}
        fill='none'
        stroke={color}
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );
};

// ============ 图表卡片组件 ============

const ChartCardComponent: React.FC<ChartCard> = ({
  title,
  subtitle,
  chart,
  height = 400,
  actions,
  type,
  onRefresh,
  onDownload,
  onFullscreen,
  loading,
  error,
  variant = 'elevation',
  expandable,
  defaultExpanded = true,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleRefresh = () => {
    handleMenuClose();
    onRefresh?.();
  };

  const handleDownload = () => {
    handleMenuClose();
    onDownload?.();
  };

  const handleFullscreen = () => {
    handleMenuClose();
    onFullscreen?.();
  };

  return (
    <Paper
      variant={variant}
      sx={{
        borderRadius: 2,
        height: expandable && !expanded ? 'auto' : height,
        display: 'flex',
        flexDirection: 'column',
        transition: 'height 0.3s ease',
      }}
    >
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
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600 }}
            >
              {title}
            </Typography>
            {type && (
              <Chip
                label={type}
                size='small'
                sx={{ height: 20, fontSize: '0.65rem' }}
              />
            )}
          </Box>
          {subtitle && (
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {actions}
          {(onRefresh || onDownload || onFullscreen || expandable) && (
            <>
              {expandable && (
                <IconButton
                  size='small'
                  onClick={() => setExpanded(!expanded)}
                  sx={{
                    transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s',
                  }}
                >
                  <TrendingUp style={{ width: 18, height: 18 }} />
                </IconButton>
              )}
              <IconButton
                size='small'
                onClick={handleMenuOpen}
              >
                <MoreVertical style={{ width: 18, height: 18 }} />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
              >
                {onRefresh && (
                  <MenuItem onClick={handleRefresh}>
                    <ListItemIcon>
                      <RefreshCw style={{ width: 18, height: 18 }} />
                    </ListItemIcon>
                    <ListItemText>刷新</ListItemText>
                  </MenuItem>
                )}
                {onDownload && (
                  <MenuItem onClick={handleDownload}>
                    <ListItemIcon>
                      <Download style={{ width: 18, height: 18 }} />
                    </ListItemIcon>
                    <ListItemText>下载</ListItemText>
                  </MenuItem>
                )}
                {onFullscreen && (
                  <MenuItem onClick={handleFullscreen}>
                    <ListItemIcon>
                      <Maximize style={{ width: 18, height: 18 }} />
                    </ListItemIcon>
                    <ListItemText>全屏</ListItemText>
                  </MenuItem>
                )}
              </Menu>
            </>
          )}
        </Box>
      </Box>
      {(!expandable || expanded) && (
        <Box sx={{ p: 2, flex: 1, overflow: 'hidden' }}>
          {loading ? (
            <Skeleton
              variant='rectangular'
              width='100%'
              height='100%'
            />
          ) : error ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'error.main',
              }}
            >
              <Typography>{error}</Typography>
            </Box>
          ) : (
            chart
          )}
        </Box>
      )}
    </Paper>
  );
};

// ============ 卡片分组组件 ============

const CardGroupComponent: React.FC<CardGroup & { loading?: boolean }> = ({
  title,
  cards,
  layout = 'grid',
  collapsible,
  defaultExpanded = true,
  icon,
  actions,
  loading,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Paper sx={{ borderRadius: 2, mb: 2 }}>
      <Box
        sx={{
          p: 2,
          borderBottom: expanded ? 1 : 0,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {icon}
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600 }}
          >
            {title}
          </Typography>
          {collapsible && (
            <IconButton
              size='small'
              onClick={() => setExpanded(!expanded)}
            >
              <TrendingUp
                style={{
                  width: 18,
                  height: 18,
                  transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s',
                }}
              />
            </IconButton>
          )}
        </Box>
        {actions}
      </Box>
      {expanded && (
        <Box sx={{ p: 2 }}>
          {layout === 'tabs' && (
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => setActiveTab(newValue)}
              sx={{ mb: 2 }}
            >
              {cards.map((card) => (
                <Tab
                  key={card.id}
                  label={card.title}
                />
              ))}
            </Tabs>
          )}
          {layout === 'tabs' ? (
            <Box>
              {cards[activeTab] && (
                <StatCardComponent
                  {...cards[activeTab]}
                  loading={loading}
                />
              )}
            </Box>
          ) : (
            <Grid
              container
              spacing={2}
            >
              {cards.map((card) => (
                <Grid
                  key={card.id}
                  size={{ xs: 12, sm: 6, md: 3 }}
                >
                  <StatCardComponent
                    {...card}
                    loading={loading}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}
    </Paper>
  );
};

// ============ 仪表盘模板组件 ============

export const DashboardTemplate: React.FC<DashboardTemplateProps> = ({
  title,
  subtitle,
  breadcrumbs,
  stats,
  cardGroups,
  charts,
  recentItems,
  recentTitle = '最近事项',
  quickActions,
  quickActionsTitle = '快捷操作',
  loading,
  headerContent,
  children,
  statsArea,
  chartsArea,
  recentItemsArea,
  quickActionsArea,
  layout,
  onRefresh,
  customRenderers,
  persistConfig,
  configKey = 'dashboard-config',
  ...props
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));

  // 状态管理
  const [statsLayout, setStatsLayout] = useState<'grid' | 'carousel' | 'tabs'>(
    layout?.statsLayout || 'grid'
  );
  const [chartsLayout, setChartsLayout] = useState<'grid' | 'stack' | 'tabs'>(
    (layout?.chartsLayout || 'grid') as 'grid' | 'stack' | 'tabs'
  );
  const [activeChartTab, setActiveChartTab] = useState(0);
  const [statsTab, setStatsTab] = useState(0);

  // 从localStorage加载配置
  React.useEffect(() => {
    if (persistConfig) {
      const savedConfig = localStorage.getItem(configKey);
      if (savedConfig) {
        try {
          const config = JSON.parse(savedConfig) as {
            statsLayout?: 'grid' | 'carousel' | 'tabs';
            chartsLayout?: 'grid' | 'stack' | 'tabs';
          };
          if (config.statsLayout) setStatsLayout(config.statsLayout);
          if (config.chartsLayout) setChartsLayout(config.chartsLayout);
        } catch (e: unknown) {
          logger.error('Failed to load dashboard config:', e);
        }
      }
    }
  }, [persistConfig, configKey]);

  // 保存配置到localStorage
  React.useEffect(() => {
    if (persistConfig) {
      const config = { statsLayout, chartsLayout };
      localStorage.setItem(configKey, JSON.stringify(config));
    }
  }, [persistConfig, configKey, statsLayout, chartsLayout]);

  // 响应式断点配置
  const statsBreakpoints = layout?.statsBreakpoints || {
    xs: 12,
    sm: 6,
    md: 4,
    lg: 3,
    xl: 3,
  };

  const chartsBreakpoints = layout?.chartsBreakpoints || {
    xs: 12,
    sm: 12,
    md: 6,
    lg: 6,
    xl: 6,
  };

  const spacing = layout?.spacing || 2;
  const padding = layout?.padding || 0;

  // 渲染统计卡片
  const renderStats = () => {
    // 如果有自定义统计区域，直接渲染
    if (statsArea) return statsArea;

    if (!stats || stats.length === 0) return null;

    if (customRenderers?.statCard) {
      return (
        <Box sx={{ mb: 3 }}>
          <Grid
            container
            spacing={spacing}
          >
            {stats.map((stat) => (
              <Grid
                key={stat.id}
                size={12}
              >
                {customRenderers.statCard?.(stat)}
              </Grid>
            ))}
          </Grid>
        </Box>
      );
    }

    if (statsLayout === 'tabs') {
      return (
        <Paper sx={{ borderRadius: 2, mb: 3 }}>
          <Tabs
            value={statsTab}
            onChange={(_, newValue) => setStatsTab(newValue)}
          >
            {stats.map((stat) => (
              <Tab
                key={stat.id}
                label={stat.title}
              />
            ))}
          </Tabs>
          <Box sx={{ p: 2 }}>
            {stats[statsTab] && (
              <StatCardComponent
                {...stats[statsTab]}
                loading={loading}
              />
            )}
          </Box>
        </Paper>
      );
    }

    return (
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          {layout?.statsLayout === undefined && (
            <Stack
              direction='row'
              spacing={1}
            >
              <Tooltip title='网格视图'>
                <IconButton
                  size='small'
                  color={statsLayout === 'grid' ? 'primary' : 'default'}
                  onClick={() => setStatsLayout('grid')}
                >
                  <LayoutGrid style={{ width: 18, height: 18 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title='列表视图'>
                <IconButton
                  size='small'
                  color={statsLayout === 'carousel' ? 'primary' : 'default'}
                  onClick={() => setStatsLayout('carousel')}
                >
                  <List style={{ width: 18, height: 18 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          )}
        </Box>
        <Grid
          container
          spacing={spacing}
        >
          {stats.map((stat) => (
            <Grid
              key={stat.id}
              size={statsBreakpoints}
            >
              <StatCardComponent
                {...stat}
                loading={loading}
              />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  // 渲染卡片分组
  const renderCardGroups = () => {
    if (!cardGroups || cardGroups.length === 0) return null;

    return (
      <Box sx={{ mb: 3 }}>
        {cardGroups.map((group) => (
          <CardGroupComponent
            key={group.id}
            {...group}
            loading={loading}
          />
        ))}
      </Box>
    );
  };

  // 渲染图表
  const renderCharts = () => {
    // 如果有自定义图表区域，直接渲染
    if (chartsArea) return chartsArea;

    if (!charts || charts.length === 0) return null;

    if (customRenderers?.chartCard) {
      return (
        <Box sx={{ mb: 3 }}>
          <Grid
            container
            spacing={spacing}
          >
            {charts.map((chart) => (
              <Grid
                key={chart.id}
                size={12}
              >
                {customRenderers.chartCard?.(chart)}
              </Grid>
            ))}
          </Grid>
        </Box>
      );
    }

    if (chartsLayout === 'tabs') {
      return (
        <Paper sx={{ borderRadius: 2, mb: 3 }}>
          <Tabs
            value={activeChartTab}
            onChange={(_, newValue) => setActiveChartTab(newValue)}
          >
            {charts.map((chart) => (
              <Tab
                key={chart.id}
                label={chart.title}
              />
            ))}
          </Tabs>
          <Box sx={{ p: 2 }}>
            {charts[activeChartTab] && (
              <ChartCardComponent
                {...charts[activeChartTab]}
                loading={loading}
              />
            )}
          </Box>
        </Paper>
      );
    }

    if (chartsLayout === 'stack') {
      return (
        <Box sx={{ mb: 3 }}>
          <Stack spacing={spacing}>
            {charts.map((chart) => (
              <ChartCardComponent
                key={chart.id}
                {...chart}
                loading={loading}
              />
            ))}
          </Stack>
        </Box>
      );
    }

    const currentChartsLayout = chartsLayout as 'grid' | 'stack' | 'tabs';

    return (
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          {layout?.chartsLayout === undefined && (
            <Stack
              direction='row'
              spacing={1}
            >
              <Tooltip title='网格视图'>
                <IconButton
                  size='small'
                  color={currentChartsLayout === 'grid' ? 'primary' : 'default'}
                  onClick={() => setChartsLayout('grid')}
                >
                  <LayoutGrid style={{ width: 18, height: 18 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title='堆叠视图'>
                <IconButton
                  size='small'
                  color={currentChartsLayout === 'stack' ? 'primary' : 'default'}
                  onClick={() => setChartsLayout('stack')}
                >
                  <LayoutDashboard style={{ width: 18, height: 18 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title='标签视图'>
                <IconButton
                  size='small'
                  color={currentChartsLayout === 'tabs' ? 'primary' : 'default'}
                  onClick={() => setChartsLayout('tabs')}
                >
                  <List style={{ width: 18, height: 18 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          )}
        </Box>
        <Grid
          container
          spacing={spacing}
        >
          {charts.map((chart) => (
            <Grid
              key={chart.id}
              size={charts.length === 1 ? 12 : 6}
            >
              <ChartCardComponent
                {...chart}
                loading={loading}
              />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  // 渲染最近事项
  const renderRecentItems = () => {
    // 如果有自定义最近事项区域，直接渲染
    if (recentItemsArea) return recentItemsArea;

    if (!recentItems || recentItems.length === 0) return null;

    if (customRenderers?.recentItem) {
      return (
        <Paper sx={{ borderRadius: 2 }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600 }}
            >
              {recentTitle}
            </Typography>
          </Box>
          <Box sx={{ p: 0 }}>
            {customRenderers?.recentItem &&
              recentItems.map((item) => customRenderers.recentItem?.(item))}
          </Box>
        </Paper>
      );
    }

    return (
      <Paper sx={{ borderRadius: 2 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600 }}
          >
            {recentTitle}
          </Typography>
        </Box>
        <Box sx={{ p: 0 }}>
          {loading
            ? Array.from({ length: 5 }).map((_, index) => (
                <Box
                  key={index}
                  sx={{
                    p: 2,
                    borderBottom: index < 4 ? 1 : 0,
                    borderColor: 'divider',
                  }}
                >
                  <Skeleton
                    variant='text'
                    width='60%'
                  />
                  <Skeleton
                    variant='text'
                    width='40%'
                  />
                </Box>
              ))
            : recentItems.map((item, index) => (
                <Box
                  key={item.id}
                  sx={{
                    p: 2,
                    borderBottom: index < recentItems.length - 1 ? 1 : 0,
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    cursor: item.onClick ? 'pointer' : 'default',
                    '&:hover': item.onClick
                      ? {
                          bgcolor: 'action.hover',
                        }
                      : {},
                  }}
                  onClick={item.onClick}
                >
                  {(item.avatar || item.icon) && (
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: item.status ? `${item.status}.light` : 'grey.100',
                        color: item.status ? `${item.status}.main` : 'grey.600',
                      }}
                    >
                      {item.avatar || item.icon}
                    </Box>
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography
                        variant='body2'
                        sx={{
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.title}
                      </Typography>
                      {item.status && item.status !== 'default' && (
                        <Chip
                          label={item.status}
                          size='small'
                          color={item.status}
                          sx={{ height: 20, fontSize: '0.65rem' }}
                        />
                      )}
                    </Box>
                    {item.description && (
                      <Typography
                        variant='caption'
                        color='text.secondary'
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'block',
                        }}
                      >
                        {item.description}
                      </Typography>
                    )}
                    {item.tags && item.tags.length > 0 && (
                      <Stack
                        direction='row'
                        spacing={0.5}
                        sx={{ mt: 0.5 }}
                      >
                        {item.tags.map((tag, tagIndex) => (
                          <Chip
                            key={tagIndex}
                            label={tag.label}
                            size='small'
                            sx={{
                              height: 18,
                              fontSize: '0.6rem',
                              bgcolor: tag.color || 'grey.100',
                              color: tag.color || 'grey.700',
                            }}
                          />
                        ))}
                      </Stack>
                    )}
                  </Box>
                  {item.time && (
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {item.time}
                    </Typography>
                  )}
                </Box>
              ))}
        </Box>
      </Paper>
    );
  };

  // 渲染快捷操作
  const renderQuickActions = () => {
    // 如果有自定义快捷操作区域，直接渲染
    if (quickActionsArea) return quickActionsArea;

    if (!quickActions || quickActions.length === 0) return null;

    if (customRenderers?.quickAction) {
      return (
        <Paper sx={{ borderRadius: 2 }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600 }}
            >
              {quickActionsTitle}
            </Typography>
          </Box>
          <Box sx={{ p: 2 }}>
            {customRenderers?.quickAction &&
              quickActions.map((action) => customRenderers.quickAction?.(action))}
          </Box>
        </Paper>
      );
    }

    return (
      <Paper sx={{ borderRadius: 2 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600 }}
          >
            {quickActionsTitle}
          </Typography>
        </Box>
        <Box
          sx={{
            p: 2,
            display: 'grid',
            gridTemplateColumns: `repeat(${isMobile ? 2 : isTablet ? 3 : 4}, 1fr)`,
            gap: 2,
          }}
        >
          {loading
            ? Array.from({ length: 4 }).map((_, index) => (
                <Skeleton
                  key={index}
                  variant='rectangular'
                  height={80}
                  sx={{ borderRadius: 1 }}
                />
              ))
            : quickActions.map((action) => (
                <Tooltip
                  key={action.id}
                  title={action.description || ''}
                >
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 1,
                      border: 1,
                      borderColor: 'divider',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 1,
                      cursor: action.disabled ? 'not-allowed' : 'pointer',
                      opacity: action.disabled ? 0.5 : 1,
                      transition: 'all 0.2s',
                      '&:hover': action.disabled
                        ? {}
                        : {
                            borderColor: 'primary.main',
                            bgcolor: 'primary.light',
                          },
                    }}
                    onClick={action.disabled ? undefined : action.onClick}
                  >
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'primary.light',
                        color: 'primary.main',
                        position: 'relative',
                      }}
                    >
                      {action.icon}
                      {action.badge && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: -4,
                            right: -4,
                            minWidth: 18,
                            height: 18,
                            borderRadius: 9,
                            bgcolor: 'error.main',
                            color: 'error.contrastText',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.65rem',
                            fontWeight: 600,
                          }}
                        >
                          {action.badge}
                        </Box>
                      )}
                    </Box>
                    <Typography
                      variant='caption'
                      sx={{ fontWeight: 500 }}
                    >
                      {action.label}
                    </Typography>
                  </Box>
                </Tooltip>
              ))}
        </Box>
      </Paper>
    );
  };

  return (
    <Box
      sx={{ padding: padding }}
      {...props}
    >
      {/* 页面头部 */}
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={breadcrumbs}
        loading={loading}
      >
        {headerContent}
        {onRefresh && (
          <Tooltip title='刷新'>
            <IconButton
              size='small'
              onClick={onRefresh}
              sx={{ ml: 1 }}
            >
              <RefreshCw style={{ width: 18, height: 18 }} />
            </IconButton>
          </Tooltip>
        )}
      </PageHeader>

      {/* 统计卡片 */}
      {renderStats()}

      {/* 卡片分组 */}
      {renderCardGroups()}

      {/* 图表 */}
      {renderCharts()}

      {/* 最近事项和快捷操作 */}
      {(recentItems || quickActions) && (
        <Grid
          container
          spacing={spacing}
        >
          {recentItems && (
            <Grid size={{ xs: 12, md: quickActions ? 8 : 12 }}>{renderRecentItems()}</Grid>
          )}
          {quickActions && (
            <Grid size={{ xs: 12, md: recentItems ? 4 : 12 }}>{renderQuickActions()}</Grid>
          )}
        </Grid>
      )}

      {/* 子组件 */}
      {children}
    </Box>
  );
};

export default DashboardTemplate;
