import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { alpha } from '@mui/material/styles';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  TextField,
  InputAdornment,
  useTheme,
} from '@mui/material';
import i18n from '@/i18n';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Search as SearchIcon,
  FileText,
  DollarSign,
  BarChart3,
  Target,
  CreditCard,
  Calculator,
  Building,
  Users,
  Package,
  Warehouse,
  ClipboardList,
  CheckCircle,
  AlertCircle,
  Clock,
  Activity,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PageContainer } from '@/components/common';
import type { PageAction } from './PageHeader';
import type {
  EntitySchema,
  DashboardSchema,
  StatCardSchema,
  ChartSchema,
  DataTableSchema,
  DashboardColor,
  IconName,
} from '@/schema';
import { getColumns } from '@/schema';

import { CACHE_DURATIONS } from '@/lib/reactQuery';

// ============ 图标解析 ============

const ICON_MAP: Record<string, LucideIcon> = {
  FileText,
  TrendingUp: TrendingUpIcon,
  TrendingDown: TrendingDownIcon,
  DollarSign,
  BarChart3,
  Target,
  CreditCard,
  Calculator,
  Building,
  Users,
  Package,
  Warehouse,
  ClipboardList,
  CheckCircle,
  AlertCircle,
  Clock,
  Activity,
};

function resolveIcon(icon: IconName | React.ReactNode | undefined): React.ReactNode | undefined {
  if (!icon) return undefined;
  if (typeof icon === 'string') {
    const IconComponent = ICON_MAP[icon];
    if (IconComponent) return <IconComponent size={24} />;
    return undefined;
  }
  return icon;
}

// ============ 类型定义（新 API）============

export type { DashboardColor };

export interface StatCardConfig {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: DashboardColor;
  trend?: { value: number; label?: string };
  loading?: boolean;
}

export interface ChartConfig {
  title: string;
  type: 'bar' | 'line' | 'pie' | 'area' | 'scatter';
  data: Array<Record<string, unknown>>;
  xField: string;
  yField?: string | string[];
  seriesField?: string;
  height?: number;
  loading?: boolean;
  emptyText?: string;
}

export interface DataTableConfig {
  title: string;
  columns: any[];
  data: any[];
  loading?: boolean;
  searchable?: boolean;
}

// ============ 子组件 ============

const TrendIndicator: React.FC<{ value: number; label?: string }> = ({ value, label }) => {
  const theme = useTheme();
  const isUp = value > 0;
  const isDown = value < 0;
  const color = isUp
    ? theme.palette.success.main
    : isDown
      ? theme.palette.error.main
      : theme.palette.text.secondary;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {isUp ? (
        <TrendingUpIcon
          size={14}
          style={{ color }}
        />
      ) : isDown ? (
        <TrendingDownIcon
          size={14}
          style={{ color }}
        />
      ) : null}
      <Typography
        variant='caption'
        sx={{ color, fontWeight: 500 }}
      >
        {isUp ? '+' : ''}
        {value}
        {label ? ` ${label}` : ''}
      </Typography>
    </Box>
  );
};

export const StatCard: React.FC<StatCardConfig> = ({
  title,
  value,
  icon,
  color = 'primary',
  trend,
  loading,
}) => {
  const theme = useTheme();
  const paletteMap: Record<DashboardColor, string> = {
    primary: theme.palette.primary.main,
    secondary: theme.palette.secondary.main,
    success: theme.palette.success.main,
    error: theme.palette.error.main,
    warning: theme.palette.warning.main,
    info: theme.palette.info.main,
  };
  const accent = paletteMap[color];

  if (loading) {
    return (
      <Card
        variant='outlined'
        sx={{ borderRadius: 3, height: '100%' }}
      >
        <CardContent>
          <Skeleton
            variant='text'
            width='60%'
          />
          <Skeleton
            variant='rectangular'
            width='70%'
            height={32}
            sx={{ my: 1 }}
          />
          <Skeleton
            variant='text'
            width='40%'
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      variant='outlined'
      sx={{
        borderRadius: 3,
        height: '100%',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[3],
        },
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mb: 1 }}
            >
              {title}
            </Typography>
            <Typography
              variant='h4'
              sx={{ fontWeight: 700, lineHeight: 1.2 }}
            >
              {value}
            </Typography>
            {trend && (
              <Box sx={{ mt: 1 }}>
                <TrendIndicator
                  value={trend.value}
                  label={trend.label}
                />
              </Box>
            )}
          </Box>
          {icon && (
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: accent,
                bgcolor: alpha(accent, 0.1),
              }}
            >
              <Box sx={{ fontSize: 24 }}>{icon}</Box>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

// ============ 占位图表（简化 SVG/div 实现）============

const PlaceholderChart: React.FC<{ config: ChartConfig; isMain?: boolean }> = ({
  config,
  isMain,
}) => {
  const { title, type, data, xField, yField = 'value', height = 280, loading, emptyText } = config;
  const theme = useTheme();
  const [hovered, setHovered] = useState<number | null>(null);

  const yFieldKey = Array.isArray(yField) ? yField[0] : yField;

  if (loading) {
    return (
      <Card
        variant='outlined'
        sx={{ borderRadius: 3, height: '100%' }}
      >
        <CardContent>
          <Skeleton
            variant='text'
            width='40%'
            sx={{ mb: 2 }}
          />
          <Skeleton
            variant='rectangular'
            width='100%'
            height={height}
          />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card
        variant='outlined'
        sx={{ borderRadius: 3, height: '100%' }}
      >
        <CardContent>
          <Typography
            variant='subtitle2'
            gutterBottom
          >
            {title}
          </Typography>
          <Box
            sx={{
              height,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.disabled',
              fontSize: 14,
            }}
          >
            {emptyText || i18n.t('components.dashboard_template.k0')}
          </Box>
        </CardContent>
      </Card>
    );
  }

  const values = data.map((d) => Number(d[yFieldKey]) || 0);
  const max = Math.max(...values, 1);
  const W = 100;
  const H = 100;

  const barColor = theme.palette.primary.main;

  const renderBody = () => {
    switch (type) {
      case 'bar':
      case 'area':
      case 'line': {
        const points = values.map((v, i) => {
          const x = (i / Math.max(values.length - 1, 1)) * W;
          const y = H - (v / max) * (H - 10);
          return { x, y, v };
        });

        if (type === 'bar') {
          const barWidth = (W / values.length) * 0.7;
          return (
            <svg
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio='none'
              width='100%'
              height='100%'
            >
              {points.map((p, i) => (
                <rect
                  key={i}
                  x={(i / values.length) * W + (W / values.length - barWidth) / 2}
                  y={p.y}
                  width={barWidth}
                  height={H - p.y}
                  fill={barColor}
                  opacity={hovered === i ? 1 : 0.8}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                />
              ))}
            </svg>
          );
        }

        const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        const areaPath = `${path} L ${W} ${H} L 0 ${H} Z`;

        return (
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio='none'
            width='100%'
            height='100%'
          >
            {type === 'area' && (
              <path
                d={areaPath}
                fill={barColor}
                opacity={0.15}
              />
            )}
            <path
              d={path}
              fill='none'
              stroke={barColor}
              strokeWidth={1.5}
              strokeLinejoin='round'
            />
            {points.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={hovered === i ? 2 : 1.2}
                fill={barColor}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            ))}
          </svg>
        );
      }
      case 'pie': {
        const total = values.reduce((s, v) => s + v, 0) || 1;
        const colors = [
          theme.palette.primary.main,
          theme.palette.secondary.main,
          theme.palette.success.main,
          theme.palette.warning.main,
          theme.palette.error.main,
          theme.palette.info.main,
        ];
        let acc = 0;
        const cx = W / 2;
        const cy = H / 2;
        const r = Math.min(W, H) / 2 - 4;
        return (
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio='xMidYMid meet'
            width='100%'
            height='100%'
          >
            {values.map((v, i) => {
              const startAngle = (acc / total) * 2 * Math.PI - Math.PI / 2;
              acc += v;
              const endAngle = (acc / total) * 2 * Math.PI - Math.PI / 2;
              const x1 = cx + r * Math.cos(startAngle);
              const y1 = cy + r * Math.sin(startAngle);
              const x2 = cx + r * Math.cos(endAngle);
              const y2 = cy + r * Math.sin(endAngle);
              const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
              const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
              return (
                <path
                  key={i}
                  d={d}
                  fill={colors[i % colors.length]}
                  opacity={0.85}
                />
              );
            })}
          </svg>
        );
      }
      case 'scatter': {
        return (
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio='none'
            width='100%'
            height='100%'
          >
            {data.map((d, i) => {
              const xv = Number(d[xField]) || i;
              const yv = Number(d[yFieldKey]) || 0;
              const xPos = (xv / Math.max(...data.map((r) => Number(r[xField]) || 1), 1)) * W;
              const yPos = H - (yv / max) * (H - 10);
              return (
                <circle
                  key={i}
                  cx={xPos}
                  cy={yPos}
                  r={1.8}
                  fill={barColor}
                  opacity={0.7}
                />
              );
            })}
          </svg>
        );
      }
      default:
        return null;
    }
  };

  return (
    <Card
      variant='outlined'
      sx={{
        borderRadius: 3,
        height: '100%',
        minHeight: isMain ? height : height,
      }}
    >
      <CardContent sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600 }}
          >
            {title}
          </Typography>
          <Chip
            label={type}
            size='small'
            sx={{ height: 20, fontSize: '0.7rem' }}
          />
        </Box>
        <Box sx={{ flex: 1, minHeight: height - 40, position: 'relative' }}>
          {hovered !== null && data[hovered] && (
            <Box
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                bgcolor: 'action.active',
                color: 'common.white',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                fontSize: 12,
                zIndex: 10,
              }}
            >
              {String(data[hovered][xField])}: {String(data[hovered][yFieldKey])}
            </Box>
          )}
          {renderBody()}
        </Box>
      </CardContent>
    </Card>
  );
};

// ============ DataTable ============

const DataTable: React.FC<{ table: DataTableConfig }> = ({ table }) => {
  const { title, columns, data, loading, searchable } = table;
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!searchable || !search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const v = row[col.id];
        return v !== undefined && v !== null && String(v).toLowerCase().includes(q);
      })
    );
  }, [data, search, searchable, columns]);

  return (
    <Card
      variant='outlined'
      sx={{ borderRadius: 3 }}
    >
      <CardContent sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
        >
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600 }}
          >
            {title}
          </Typography>
          {searchable && (
            <TextField
              size='small'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={i18n.t('components.dashboard_template.k0')}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position='start'>
                      <SearchIcon size={16} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ width: 240 }}
            />
          )}
        </Box>
      </CardContent>
      <TableContainer>
        <Table size='small'>
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell
                  key={col.id}
                  sx={{
                    fontWeight: 600,
                    bgcolor: 'action.hover',
                    color: 'text.secondary',
                  }}
                >
                  {col.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  {columns.map((col) => (
                    <TableCell key={col.id}>
                      <Skeleton
                        variant='text'
                        width='80%'
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  align='center'
                  sx={{ py: 4, color: 'text.disabled' }}
                >
                  {i18n.t('components.dashboard_template.k1')}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row, idx) => (
                <TableRow
                  key={idx}
                  hover
                >
                  {columns.map((col) => (
                    <TableCell key={col.id}>
                      {col.render ? col.render(row[col.id], row, idx) : String(row[col.id] ?? '-')}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
};

// ============ 主组件 ============

export interface DashboardTemplateProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string; path?: string }>;
  stats?: StatCard[];
  charts?: ChartCard[];
  recentItems?: RecentItem[];
  recentTitle?: string;
  quickActions?: QuickAction[];
  quickActionsTitle?: string;
  loading?: boolean;
  onRefresh?: () => void;
  children?: React.ReactNode;
  statCards?: StatCardConfig[];
  chartCols?: number;
  mainChart?: ChartConfig;
  table?: DataTableConfig;
  actions?: Array<{ label: string; onClick: () => void; variant?: string }>;
}

const legacyToConfig = (s: StatCard): StatCardConfig => ({
  title: s.title,
  value: s.value,
  icon: s.icon,
  color: s.color,
  trend:
    s.change !== undefined
      ? { value: s.change, label: s.changeLabel }
      : s.trend && s.trend.length > 0
        ? {
            value: s.trend[s.trend.length - 1] - s.trend[0],
            label: i18n.t('components.dashboard_template.k1'),
          }
        : undefined,
});

const legacyChartToConfig = (c: ChartCard): ChartConfig => ({
  title: c.title,
  type: (c.type as ChartConfig['type']) || 'bar',
  data: (c.data as Array<Record<string, unknown>>) || [],
  xField: 'label',
  yField: 'value',
  height: c.height,
  loading: c.loading,
});

export const DashboardTemplate: React.FC<DashboardTemplateProps> = ({
  title,
  subtitle,
  breadcrumbs,
  statCards: statCardsProp,
  stats,
  charts: chartsProp,
  chartCols: chartColsProp,
  mainChart,
  table,
  children,
  actions,
  loading,
  onRefresh,
  recentItems,
  recentTitle = i18n.t('components.dashboard_template.k2'),
  quickActions,
  quickActionsTitle = i18n.t('components.dashboard_template.k3'),
}) => {
  const resolvedStatCards = useMemo<StatCardConfig[] | undefined>(() => {
    if (statCardsProp && statCardsProp.length > 0) return statCardsProp;
    if (stats && stats.length > 0) return stats.map(legacyToConfig);
    return;
  }, [statCardsProp, stats]);

  const resolvedCharts = useMemo<ChartConfig[] | undefined>(() => {
    if (chartsProp && chartsProp.length > 0) {
      // 判断是 ChartConfig 还是 ChartCard
      const first = chartsProp[0];
      if (first && typeof first === 'object' && 'xField' in first) {
        return chartsProp as unknown as ChartConfig[];
      }
      return (chartsProp as ChartCard[]).map(legacyChartToConfig);
    }
    return;
  }, [chartsProp]);

  const resolvedChartCols = chartColsProp ?? 2;

  const headerActions: PageAction[] | undefined = useMemo(() => {
    const list: PageAction[] = [];
    if (actions && actions.length > 0) {
      actions.forEach((a) => {
        list.push({
          label: a.label,
          onClick: a.onClick,
          variant: (a.variant as 'contained' | 'outlined' | 'text') || 'outlined',
        });
      });
    }
    if (onRefresh) {
      list.push({
        label: i18n.t('components.dashboard_template.k4'),
        onClick: onRefresh,
        variant: 'outlined',
      });
    }
    return list.length > 0 ? list : undefined;
  }, [actions, onRefresh]);

  const maxCols =
    resolvedChartCols === 1 ? 1 : resolvedChartCols === 3 ? 3 : resolvedChartCols >= 4 ? 4 : 2;

  return (
    <PageContainer
      title={title}
      subtitle={subtitle}
      autoBreadcrumbs={!breadcrumbs}
      headerProps={{
        breadcrumbs: breadcrumbs?.map((b) => ({
          label: b.label,
          href: b.path,
        })),
      }}
      actions={headerActions}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* StatCard 区域 */}
        {resolvedStatCards && resolvedStatCards.length > 0 && (
          <Grid
            container
            spacing={2}
          >
            {resolvedStatCards.map((card, i) => (
              <Grid
                key={i}
                size={{ xs: 12, sm: 6, md: Math.floor(24 / Math.min(resolvedStatCards.length, 4)) }}
              >
                <StatCard {...card} />
              </Grid>
            ))}
          </Grid>
        )}

        {/* 大图表区域 */}
        {mainChart && (
          <PlaceholderChart
            config={mainChart}
            isMain
          />
        )}

        {/* 图表网格 */}
        {resolvedCharts && resolvedCharts.length > 0 && (
          <Grid
            container
            spacing={2}
          >
            {resolvedCharts.map((chart, i) => (
              <Grid
                key={i}
                size={{
                  xs: 12,
                  md: 12 / maxCols,
                  lg: 12 / maxCols,
                }}
              >
                <PlaceholderChart config={chart} />
              </Grid>
            ))}
          </Grid>
        )}

        {/* 数据表格 */}
        {table && <DataTable table={table} />}

        {/* 子组件 */}
        {children}
      </Box>
    </PageContainer>
  );
};

export default DashboardTemplate;

// ============ 向后兼容类型别名 ============
// 以下类型用于兼容 DashboardTemplate.stories.tsx 及其他旧版调用方。
// 它们基于新 API 的简化派生，不保证与旧版完整行为一致。

/** @deprecated 使用 {@link StatCardConfig} 代替 */
export interface StatCard {
  id: string;
  title: string;
  value: string | number;
  unit?: string;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  color?: DashboardColor;
  onClick?: () => void;
  trend?: number[];
  progress?: number;
  progressLabel?: string;
  subtitle?: string;
  tags?: Array<{ label: string; color?: string }>;
  variant?: 'elevation' | 'outlined';
  size?: 'small' | 'medium' | 'large';
  customGradient?: string;
}

/** @deprecated 使用 {@link ChartConfig} 代替 */
export interface ChartCard {
  id: string;
  title: string;
  subtitle?: string;
  chart?: React.ReactNode;
  height?: number;
  actions?: React.ReactNode;
  type?: 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'radar' | 'gauge';
  data?: ChartConfig['data'];
  config?: ChartConfig;
  onRefresh?: () => void;
  onDownload?: () => void;
  onFullscreen?: () => void;
  loading?: boolean;
  error?: string;
  variant?: 'elevation' | 'outlined';
  expandable?: boolean;
  defaultExpanded?: boolean;
}

/** @deprecated 最近事项类型 */
export interface RecentItem {
  id: string;
  title: string;
  description?: string;
  time?: string;
  avatar?: React.ReactNode;
  onClick?: () => void;
  status?: 'success' | 'warning' | 'error' | 'info' | 'default';
  tags?: Array<{ label: string; color?: string }>;
  icon?: React.ReactNode;
}

/** @deprecated 快捷操作类型 */
export interface QuickAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  color?: string;
  description?: string;
  disabled?: boolean;
  badge?: number | string;
  variant?: 'card' | 'button' | 'icon';
}

/** @deprecated 使用 {@link DashboardTemplateProps} 代替 */
export type DashboardTemplateLegacyProps = DashboardTemplateProps;

// ============ Schema 派生工具 ============

/**
 * 从 EntitySchema 派生 DataTableConfig
 *
 * 让统计/分析页面可以直接使用 Schema 定义生成数据表格配置，
 * 避免手写列定义和数据映射。
 *
 * @example
 * ```tsx
 * import { dataTableFromSchema } from '@/components/templates/DashboardTemplate';
 *
 * const tableConfig = dataTableFromSchema(voucherSchema, {
 *   title: '最近凭证',
 *   data: recentVouchers,
 *   searchable: true,
 * });
 *
 * <DashboardTemplate
 *   title='财务统计'
 *   statCards={statCards}
 *   mainChart={chart}
 *   table={tableConfig}
 * />
 * ```
 */

export interface DataTableFromSchemaOptions {
  /** 表格标题（默认使用 Schema 的 title） */
  title?: string;
  /** 表格数据 */
  data: Array<Record<string, unknown>>;
  /** 是否可搜索 */
  searchable?: boolean;
  /** 仅显示指定字段（默认使用 Schema 中 showInList !== false 的字段） */
  fields?: string[];
  /** 列覆盖/自定义渲染 */
  columnOverrides?: Record<
    string,
    Partial<{
      label: string;
      render: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
    }>
  >;
  /** 加载状态 */
  loading?: boolean;
}

export function dataTableFromSchema(
  schema: EntitySchema,
  options: DataTableFromSchemaOptions
): DataTableConfig {
  const allColumns = getColumns(schema) as Array<{
    id: string;
    label: string;
    render?: (value: unknown, row: Record<string, unknown>, index: number) => React.ReactNode;
  }>;

  let filteredColumns = allColumns;
  if (options.fields && options.fields.length > 0) {
    const fieldSet = new Set(options.fields);
    filteredColumns = allColumns.filter((col) => fieldSet.has(col.id));
  }

  const columnsWithOverrides = filteredColumns.map((col) => {
    const override = options.columnOverrides?.[col.id];
    if (!override) return col;
    return {
      ...col,
      ...(override.label !== undefined ? { label: override.label } : {}),
      ...(override.render
        ? {
            render: (value: unknown, row: Record<string, unknown>, _index: number) =>
              override.render!(value, row),
          }
        : {}),
    };
  });

  return {
    title: options.title || schema.title,
    columns: columnsWithOverrides,
    data: options.data,
    loading: options.loading,
    searchable: options.searchable ?? true,
  };
}

// ============ DashboardPage (Schema 驱动) ============

export interface DashboardPageProps {
  schema: DashboardSchema;
  queryKey?: string[];
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ schema, queryKey }) => {
  const { isPending } = useQuery({
    queryKey: queryKey || ['dashboard', schema.title],
    queryFn: async () => {
      if (schema.loader) return schema.loader();
      return null;
    },
    enabled: !!schema.loader,

    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const resolvedStatCards = useMemo<StatCardConfig[] | undefined>(() => {
    if (!schema.statCards) return;
    return schema.statCards.map((sc: StatCardSchema) => ({
      title: sc.title,
      value: typeof sc.value === 'function' ? sc.value() : sc.value,
      icon: resolveIcon(sc.icon),
      color: sc.color,
      trend: sc.trend,
      loading: isPending,
    }));
  }, [schema.statCards, isPending]);

  const resolvedCharts = useMemo<ChartCard[] | undefined>(() => {
    if (!schema.charts) return;
    return schema.charts.map((ch: ChartSchema) => {
      const rawData =
        typeof ch.data === 'function' ? [] : (ch.data as Array<Record<string, unknown>>);
      return {
        id: ch.id,
        title: ch.title,
        type: ch.type,
        data: rawData,
        height: ch.height,
        loading: isPending,
      } as ChartCard;
    });
  }, [schema.charts, isPending]);

  const resolvedTable = useMemo<DataTableConfig | undefined>(() => {
    if (!schema.table) return;
    const rawData =
      typeof schema.table.data === 'function'
        ? []
        : (schema.table.data as Array<Record<string, unknown>>);

    type ColumnDefLocal = {
      id: string;
      label: string;
      render?: (value: unknown, row: Record<string, unknown>, index: number) => React.ReactNode;
    };

    let columns: ColumnDefLocal[] = [];
    if (schema.table.entitySchema) {
      const cols = getColumns(schema.table.entitySchema);
      columns = cols.map((c) => ({
        id: c.id,
        label: String(c.label ?? c.id),
        render: c.render
          ? (_value: unknown, row: Record<string, unknown>, index: number) =>
              c.render!(row as any, index)
          : undefined,
      }));
    } else {
      const firstRow = rawData.length > 0 ? rawData[0] : {};
      columns = Object.keys(firstRow).map((key) => ({ id: key, label: key }));
    }

    return {
      title: schema.table.title,
      columns,
      data: rawData,
      loading: isPending,
      searchable: schema.table.searchable ?? true,
    };
  }, [schema.table, isPending]);

  return (
    <DashboardTemplate
      title={schema.title}
      subtitle={schema.description}
      statCards={resolvedStatCards}
      charts={resolvedCharts}
      table={resolvedTable}
      loading={isPending}
    />
  );
};
