import { designTokens } from '@topems/tokens';
import styles from './StatsPageTemplate.module.css';
import { iconSm } from '../sharedStyles';
/**
 * StatsPageTemplate - 统计图表页面模板
 * 适用于数据统计、仪表盘、分析报表等场景
 */

import { analyzeGradient } from '@/theme/gradient';
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
  Chip,
  Skeleton,
  Tooltip,
  Tabs,
  Tab,
  Button,
  alpha,
  useTheme,
} from '@mui/material';
import i18n from '@/i18n';
import { Search, RefreshCw, Download, Calendar } from 'lucide-react';
import { EmptyState } from '@topems/shared-components';
import { LazyChart } from '@/components/charts';

/**
 * 统计指标卡片类型
 */
export interface StatCard {
  id: string;
  title: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  suffix?: string;
  prefix?: string;
  description?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  gradient?: [string, string];
  /** 卡片背景色（MUI palette 路径，如 'primary.50'） */
  bgColor?: string;
  /** 是否对数值进行千分位格式化 */
  format?: boolean;
  /** 点击回调 */
  onClick?: () => void;
}

/**
 * 图表数据类型
 */
export interface ChartData {
  name: string;
  value: number;
  color?: string;
  [key: string]: unknown;
}

/**
 * 图表配置类型
 */
export interface ChartConfig {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'pie' | 'donut' | 'area' | 'radar';
  dataKey: string;
  nameKey: string;
  data: ChartData[];
  height?: number;
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  stacked?: boolean;
  comparisonData?: ChartData[];
  comparisonLabel?: string;
}

/** 图表系列（recharts 的 y 轴一列） */
interface SeriesKey {
  key: string;
  name: string;
  color?: string;
}

interface PreparedChart {
  data: Record<string, unknown>[];
  xKey: string;
  yKeys: SeriesKey[];
}

interface StatsChartProps {
  chart: ChartConfig;
}

/**
 * 识别「区分系列」的字段：同名类目出现多次、且存在 2–8 个字符串取值的字段时，
 * 说明 data 是扁平的多元组（如 {name:'2026-01', value:10, type:'predicted'}），
 * 需要按该字段拆成多条系列，否则会画成锯齿。
 */
const detectSeriesField = (data: ChartData[], nameKey: string, dataKey: string): string | null => {
  if (data.length < 3) return null;
  const names = new Set(data.map((row) => String(row[nameKey] ?? row.name ?? '')));
  if (names.size >= data.length) return null;
  const candidates = Object.keys(data[0] ?? {}).filter(
    (k) => k !== nameKey && k !== 'name' && k !== dataKey && k !== 'value' && k !== 'color'
  );
  for (const key of candidates) {
    const values = data.map((row) => row[key]);
    if (!values.every((v) => typeof v === 'string')) continue;
    const distinct = new Set(values as string[]);
    if (distinct.size >= 2 && distinct.size <= 8) return key;
  }
  return null;
};

/** 把 ChartConfig 的扁平 data 转成 recharts 需要的「一行一个类目、一列一个系列」形状 */
const prepareChart = (chart: ChartConfig): PreparedChart => {
  const { data, dataKey, nameKey, comparisonData, comparisonLabel, colors } = chart;
  const labelOf = (row: ChartData) => String(row[nameKey] ?? row.name ?? '');
  const valueOf = (row: ChartData) => Number(row[dataKey] ?? row.value ?? 0) || 0;

  const seriesField = detectSeriesField(data, nameKey, dataKey);
  if (seriesField) {
    const rows: Record<string, unknown>[] = [];
    const index = new Map<string, Record<string, unknown>>();
    const seriesNames = new Set<string>();
    for (const row of data) {
      const label = labelOf(row);
      const seriesName = String(row[seriesField]);
      seriesNames.add(seriesName);
      let target = index.get(label);
      if (!target) {
        target = { [nameKey]: label };
        index.set(label, target);
        rows.push(target);
      }
      target[seriesName] = valueOf(row);
    }
    return {
      data: rows,
      xKey: nameKey,
      yKeys: [...seriesNames].map((name, i) => ({ key: name, name, color: colors?.[i] })),
    };
  }

  const rows = data.map((row) => ({ [nameKey]: labelOf(row), [dataKey]: valueOf(row) }));
  const yKeys: SeriesKey[] = [{ key: dataKey, name: chart.title, color: colors?.[0] }];

  if (comparisonData?.length) {
    const compare = new Map<string, number>();
    for (const row of comparisonData) compare.set(labelOf(row), valueOf(row));
    const compareKey = `${dataKey}__compare`;
    for (const row of rows) row[compareKey] = compare.get(String(row[nameKey])) ?? 0;
    yKeys.push({ key: compareKey, name: comparisonLabel || chart.title, color: colors?.[1] });
  }

  return { data: rows, xKey: nameKey, yKeys };
};

/**
 * 图表是否有可画的数值：全为 0 时不画空坐标系，直接出「暂无数据」
 */
const chartHasValues = (chart: ChartConfig): boolean => {
  if (chart.data.length === 0) return false;
  const pick = (row: ChartData) => Number(row[chart.dataKey] ?? row.value ?? 0);
  const rows = chart.comparisonData?.length ? [...chart.data, ...chart.comparisonData] : chart.data;
  return rows.some((row) => Number.isFinite(pick(row)) && pick(row) !== 0);
};

/**
 * 真实图表渲染：按 type 走 LazyChart（recharts 按需加载，不进入主包）
 */
const StatsChart: React.FC<StatsChartProps> = ({ chart }) => {
  const prepared = useMemo(() => prepareChart(chart), [chart]);
  const height = chart.height ?? 250;
  const rows = prepared.data as unknown as ChartData[];

  if (chart.type === 'pie' || chart.type === 'donut') {
    return (
      <LazyChart
        type='pie'
        height={height}
        data={chart.data.map((row) => ({
          name: String(row[chart.nameKey] ?? row.name ?? ''),
          value: Number(row[chart.dataKey] ?? row.value ?? 0) || 0,
          color: row.color as string | undefined,
        }))}
      />
    );
  }

  if (chart.type === 'radar') {
    return (
      <LazyChart
        type='radar'
        data={rows}
        dataKey={prepared.xKey}
        yKeys={prepared.yKeys}
        height={height}
      />
    );
  }

  if (chart.type === 'area') {
    return (
      <LazyChart
        type='area'
        data={rows}
        xKey={prepared.xKey}
        yKeys={prepared.yKeys}
        height={height}
        showGrid={chart.showGrid}
      />
    );
  }

  if (chart.type === 'line') {
    return (
      <LazyChart
        type='line'
        data={rows}
        xKey={prepared.xKey}
        yKey={prepared.yKeys[0].key}
        yKeys={prepared.yKeys}
        height={height}
        showLegend={chart.showLegend}
      />
    );
  }

  return (
    <LazyChart
      type='bar'
      data={rows}
      xKey={prepared.xKey}
      yKey={prepared.yKeys[0].key}
      yKeys={prepared.yKeys}
      height={height}
      showLegend={chart.showLegend}
    />
  );
};

/**
 * 表格列配置类型
 */
export interface TableColumn {
  id: string;
  label: string;
  field?: string;
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: number | string;
  sortable?: boolean;
}

/**
 * 数据表格类型
 */
export interface DataTable {
  id: string;
  title?: string;
  columns: TableColumn[];
  data: Record<string, unknown>[];
  height?: number;
  loading?: boolean;
}

/**
 * 时间范围选项类型
 */
export interface TimeRangeOption {
  label: string;
  value: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * 标签页类型
 */
export interface TabItem {
  label: string;
  value: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

/**
 * StatsPageTemplate属性
 */
export interface StatsPageTemplateProps {
  /** 页面标题 */
  title: string;
  /** 页面副标题 */
  subtitle?: string;
  /** 统计指标卡片 */
  statCards?: StatCard[];
  /** 统计卡片列数 */
  statColumns?: number;
  /** 图表配置列表 */
  charts?: ChartConfig[];
  /** 图表网格列数 */
  chartColumns?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
  };
  /** 数据表格配置 */
  tables?: DataTable[];
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
  /** 时间范围选项 */
  timeRangeOptions?: TimeRangeOption[];
  /** 当前时间范围 */
  timeRange?: string;
  /** 时间范围变更回调 */
  onTimeRangeChange?: (value: string) => void;
  /** 搜索配置 */
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  /** 搜索回调 */
  onSearch?: () => void;
  /** 导出按钮回调 */
  onExport?: () => void;
  /** 导出按钮文本 */
  exportText?: string;
  /** 刷新回调 */
  onRefresh?: () => void;
  /** 标签页配置 */
  tabs?: TabItem[];
  /** 当前标签页值 */
  tabValue?: string;
  /** 标签页变更回调 */
  onTabChange?: (value: string) => void;
  /** 是否显示时间范围选择器 */
  showTimeRange?: boolean;
  /** 是否显示搜索 */
  showSearch?: boolean;
  /** 是否显示导出按钮 */
  showExport?: boolean;
  /** 是否显示刷新按钮 */
  showRefresh?: boolean;
  /** 自定义工具栏 */
  customToolbar?: React.ReactNode;
  /** 右上角自定义操作区 */
  actions?: React.ReactNode;
  /** 图表区域标题 */
  chartSectionTitle?: string;
  /** 表格区域标题 */
  tableSectionTitle?: string;
  /** 是否显示图表区域 */
  showCharts?: boolean;
  /** 是否显示表格区域 */
  showTables?: boolean;
  /** 图表最小高度 */
  chartMinHeight?: number;
  /** 是否显示统计卡片网格 */
  showStatCards?: boolean;
  /** 统计卡片排列方向 */
  statCardDirection?: 'row' | 'column';
  /** 自定义内容，渲染在表格区域之后 */
  children?: React.ReactNode;
}

/**
 * StatsPageTemplate - 统计图表页面模板
 */
export const StatsPageTemplate: React.FC<StatsPageTemplateProps> = ({
  title,
  subtitle,
  statCards = [],
  statColumns = 4,
  charts = [],
  chartColumns = { xs: 1, md: 2 },
  tables = [],
  loading = false,
  emptyState,
  timeRangeOptions = [],
  timeRange,
  onTimeRangeChange,
  search,
  onSearch,
  onExport,
  exportText = i18n.t('templates.stats_page_template.k0'),
  onRefresh,
  tabs = [],
  tabValue,
  onTabChange,
  showTimeRange = true,
  showSearch = true,
  showExport = true,
  showRefresh = true,
  customToolbar,
  actions,
  chartSectionTitle,
  tableSectionTitle,
  showCharts = true,
  showTables = true,
  chartMinHeight = 300,
  showStatCards = true,
  statCardDirection = 'row',
  children,
}) => {
  const theme = useTheme();

  // 内部状态
  const [internalTabValue, setInternalTabValue] = useState<string>('');

  // 使用受控或内部状态
  const activeTabValue = tabValue !== undefined ? tabValue : internalTabValue;
  const setActiveTabValue = useMemo(
    () => (tabValue !== undefined ? () => {} : setInternalTabValue),
    [tabValue]
  );

  // 标签页变更
  const handleTabChange = useCallback(
    (_: React.SyntheticEvent, newValue: string) => {
      setActiveTabValue(newValue);
      onTabChange?.(newValue);
    },
    [onTabChange, setActiveTabValue]
  );

  // 渲染统计卡片
  const renderStatCards = () => {
    if (!showStatCards || statCards.length === 0) return null;

    // 渐变值可能是 undefined / 非法令牌名（历史页面把 'warning.main' 之类当色值写入），
    // 一旦整条 background 被 CSS 丢弃，卡片就会白底白字。这里统一校验并回退到无渐变。
    const safeGradient = (s?: [string, string]) => {
      if (!s) return undefined;
      const candidate = `linear-gradient(135deg, ${s[0]}, ${s[1]})`;
      // 交给 CSS 引擎真实判定：拼进非法令牌（undefined / 点名写错）时整条 background 会被丢弃
      return analyzeGradient(candidate).usable ? candidate : undefined;
    };

    // 图标瓦片：原来用「语义色 .light 实底 + 同色 .main 图标」，实测 1.1~1.8:1（橙压橙、紫压紫）。
    // 改为 14% 透明语义底 + 亮色用 .dark、暗色用 .light，保证图标在两种模式下都可辨。
    const resolvePaletteEntry = (key?: string) => {
      const name = key || 'primary';
      const entry = (
        theme.palette as unknown as Record<string, { main: string; light: string; dark: string }>
      )[name];
      return entry && entry.main
        ? entry
        : (theme.palette.primary as { main: string; light: string; dark: string });
    };

    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: statCardDirection === 'column' ? 'column' : 'row',
          gap: 2,
          mb: 3,
          flexWrap: 'wrap',
        }}
      >
        {statCards.map((stat) => {
          const grad = safeGradient(stat.gradient);
          const gradAvg = grad ? analyzeGradient(grad).average : null;
          const gradFg = grad
            ? theme.palette.getContrastText(gradAvg ?? theme.palette.primary.main)
            : undefined;
          return (
            <Paper
              key={stat.id}
              onClick={stat.onClick}
              sx={{
                flex: statCardDirection === 'row' ? 1 : undefined,
                minWidth: statCardDirection === 'row' ? 200 : '100%',
                p: 2.5,
                borderRadius: 3,
                background: grad,
                bgcolor: grad ? undefined : stat.bgColor || 'background.paper',
                color: grad ? gradFg : 'inherit',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.2s ease',
                cursor: stat.onClick ? 'pointer' : 'default',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 4,
                },
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
                      bgcolor: grad
                        ? 'transparent'
                        : alpha(resolvePaletteEntry(stat.color).main, 0.14),
                      color: grad
                        ? gradFg
                        : theme.palette.mode === 'dark'
                          ? resolvePaletteEntry(stat.color).light
                          : resolvePaletteEntry(stat.color).dark,
                    }}
                  >
                    {stat.icon}
                  </Box>
                )}
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant='caption'
                    sx={{
                      opacity: grad ? 0.8 : 1,
                      color: grad ? 'glass.topLight' : 'text.secondary',
                    }}
                  >
                    {stat.title}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                    {stat.prefix && (
                      <Typography
                        variant='h4'
                        sx={{
                          fontWeight: 700,
                          color: grad ? 'var(--color-primary-foreground)' : 'text.primary',
                        }}
                      >
                        {stat.prefix}
                      </Typography>
                    )}
                    <Typography
                      variant='h3'
                      sx={{
                        fontWeight: 700,
                        color: grad ? 'var(--color-primary-foreground)' : 'text.primary',
                      }}
                    >
                      {stat.format && typeof stat.value === 'number'
                        ? Number(stat.value).toLocaleString()
                        : stat.value}
                    </Typography>
                    {stat.suffix && (
                      <Typography
                        variant='h5'
                        sx={{
                          fontWeight: 500,
                          color: grad ? 'glass.topLight' : 'text.secondary',
                        }}
                      >
                        {stat.suffix}
                      </Typography>
                    )}
                  </Box>
                  {stat.description && (
                    <Typography
                      variant='caption'
                      sx={{
                        color: grad ? 'glass.topLight' : 'text.secondary',
                      }}
                    >
                      {stat.description}
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* 趋势指示器 */}
              {stat.trend && (
                <Chip
                  size='small'
                  icon={
                    stat.trend.direction === 'up' ? (
                      <TrendingUpIcon />
                    ) : stat.trend.direction === 'down' ? (
                      <TrendingDownIcon />
                    ) : undefined
                  }
                  label={
                    stat.trend.label || `${stat.trend.value > 0 ? '+' : ''}${stat.trend.value}%`
                  }
                  sx={(t) => {
                    // 芯片必须「浅底 + 同色系深字」：直接用 main 当文字会和 light 底撞成同色
                    const up = stat.trend!.direction === 'up';
                    const down = stat.trend!.direction === 'down';
                    return {
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      // 亮色 .100 是浅底、暗色 .100 反相后是深底，两端都能配 .700 的字；
                      // 不要再按 mode 分叉（.300 那份在暗色里是深字压深底）
                      bgcolor: grad
                        ? 'glass.topLight'
                        : up
                          ? 'success.100'
                          : down
                            ? 'error.100'
                            : 'grey.100',
                      color: grad
                        ? 'var(--color-primary-foreground)'
                        : up
                          ? 'success.700'
                          : down
                            ? 'error.700'
                            : 'text.secondary',
                      fontWeight: 500,
                    };
                  }}
                />
              )}
            </Paper>
          );
        })}
      </Box>
    );
  };

  // 渲染图表
  const renderCharts = () => {
    if (!showCharts || charts.length === 0) return null;

    return (
      <Box sx={{ mb: 3 }}>
        {chartSectionTitle && (
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            {chartSectionTitle}
          </Typography>
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: `repeat(${chartColumns.sm || 2}, 1fr)`,
              md: `repeat(${chartColumns.md || 2}, 1fr)`,
              lg: `repeat(${chartColumns.lg || 2}, 1fr)`,
            },
            gap: 3,
          }}
        >
          {charts.map((chart) => (
            <Paper
              key={chart.id}
              sx={{
                p: 3,
                borderRadius: 3,
                minHeight: chartMinHeight,
              }}
            >
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                {chart.title}
              </Typography>

              {/* 真实图表：空数据出空态，不再用「加载中」占位冒充渲染 */}
              {!chartHasValues(chart) ? (
                <Box
                  sx={{
                    height: chart.height || 250,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'grey.50',
                    borderRadius: 1,
                  }}
                >
                  <Typography color='text.secondary'>
                    {i18n.t('templates.stats_page_template.k1')}
                  </Typography>
                </Box>
              ) : (
                <StatsChart chart={chart} />
              )}
            </Paper>
          ))}
        </Box>
      </Box>
    );
  };

  // 渲染数据表格
  const renderTables = () => {
    if (!showTables || tables.length === 0) return null;

    return (
      <Box sx={{ mb: 3 }}>
        {tableSectionTitle && (
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            {tableSectionTitle}
          </Typography>
        )}

        {tables.map((table) => (
          <Paper
            key={table.id}
            sx={{
              p: 3,
              borderRadius: 3,
              mb: 2,
            }}
          >
            {table.title && (
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                {table.title}
              </Typography>
            )}

            <Box sx={{ overflowX: 'auto' }}>
              <Box
                component='table'
                sx={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  '& th, & td': {
                    p: 1.5,
                    textAlign: 'left',
                    borderBottom: 1,
                    borderColor: 'divider',
                  },
                  '& th': {
                    fontWeight: 600,
                    bgcolor: 'grey.50',
                    color: 'text.secondary',
                    fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                  },
                  '& td': {
                    fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                  },
                }}
              >
                <thead>
                  <tr>
                    {table.columns.map((col) => (
                      <th
                        key={col.id}
                        style={{
                          textAlign: col.align || 'left',
                          width: col.width,
                        }}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.loading ? (
                    <tr>
                      <td
                        colSpan={table.columns.length}
                        className={styles.il1}
                      >
                        <Typography color='text.secondary'>
                          {i18n.t('components.stats_page_template.k0')}
                        </Typography>
                      </td>
                    </tr>
                  ) : table.data.length === 0 ? (
                    <tr>
                      <td
                        colSpan={table.columns.length}
                        className={styles.il2}
                      >
                        <Typography color='text.secondary'>
                          {i18n.t('templates.stats_page_template.k1')}
                        </Typography>
                      </td>
                    </tr>
                  ) : (
                    table.data.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {table.columns.map((col) => (
                          <td
                            key={col.id}
                            style={{ textAlign: col.align || 'left' }}
                          >
                            {col.render && col.field
                              ? col.render(row[col.field], row)
                              : col.field
                                ? String(row[col.field])
                                : ''}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </Box>
            </Box>
          </Paper>
        ))}
      </Box>
    );
  };

  const hasCustomContent = Boolean(children);

  // 渲染加载状态
  if (
    loading &&
    statCards.length === 0 &&
    charts.length === 0 &&
    tables.length === 0 &&
    !hasCustomContent
  ) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {/* 页面标题栏 */}
        <Box sx={{ mb: 3 }}>
          <Skeleton
            variant='text'
            width={200}
            height={40}
          />
          <Skeleton
            variant='text'
            width={300}
            height={24}
            sx={{ mt: 1 }}
          />
        </Box>

        {/* 统计卡片 */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              md: `repeat(${statColumns}, 1fr)`,
            },
            gap: 2,
            mb: 3,
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <Skeleton
              key={i}
              height={120}
              sx={{ borderRadius: 3 }}
            />
          ))}
        </Box>

        {/* 图表 */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            gap: 3,
          }}
        >
          {[1, 2].map((i) => (
            <Skeleton
              key={i}
              height={300}
              sx={{ borderRadius: 3 }}
            />
          ))}
        </Box>
      </Box>
    );
  }

  // 空状态（有自定义内容时不应进入空状态）
  if (
    !loading &&
    statCards.length === 0 &&
    charts.length === 0 &&
    tables.length === 0 &&
    !hasCustomContent
  ) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <EmptyState
          emoji={emptyState?.emoji || '📊'}
          title={emptyState?.title || i18n.t('templates.stats_page_template.k2')}
          description={emptyState?.description}
          actionLabel={emptyState?.actionLabel}
          onAction={emptyState?.onAction}
        />
      </Box>
    );
  }

  const showFilterToolbar =
    (showSearch && search) || (showTimeRange && timeRangeOptions.length > 0);

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
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {actions}

          {showRefresh && onRefresh && (
            <Tooltip title={i18n.t('templates.stats_page_template.k3')}>
              <IconButton
                onClick={onRefresh}
                disabled={loading}
                aria-label={i18n.t('templates.stats_page_template.k4')}
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

          {showExport && onExport && (
            <Button
              variant='outlined'
              startIcon={<Download style={iconSm} />}
              onClick={onExport}
              size='small'
            >
              {exportText}
            </Button>
          )}
        </Box>
      </Box>

      {/* 自定义工具栏 */}
      {customToolbar && <Box sx={{ mb: 2 }}>{customToolbar}</Box>}

      {/* 标签页 */}
      {tabs.length > 0 && (
        <Paper sx={{ mb: 3, borderRadius: 3 }}>
          <Tabs
            value={activeTabValue}
            onChange={handleTabChange}
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              px: 2,
            }}
          >
            {tabs.map((tab) => (
              <Tab
                key={tab.value}
                value={tab.value}
                label={tab.label}
                icon={tab.icon as React.ReactElement<unknown> | undefined}
                disabled={tab.disabled}
                iconPosition='start'
              />
            ))}
          </Tabs>
        </Paper>
      )}

      {/* 筛选工具栏 */}
      {showFilterToolbar && (
        <Paper sx={{ mb: 3, p: 2, borderRadius: 3 }}>
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            {/* 搜索框 */}
            {showSearch && search && (
              <TextField
                size='small'
                placeholder={search.placeholder || i18n.t('components.stats_page_template.k1')}
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch?.()}
                sx={{ minWidth: 250 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position='start'>
                        <Search sx={{ width: 18, height: 18, color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            )}

            {/* 时间范围选择 */}
            {showTimeRange && timeRangeOptions.length > 0 && (
              <FormControl
                size='small'
                sx={{ minWidth: 150 }}
              >
                <Select
                  value={timeRange || timeRangeOptions[0]?.value}
                  onChange={(e) => onTimeRangeChange?.(e.target.value)}
                  startAdornment={
                    <InputAdornment position='start'>
                      <Calendar
                        sx={{
                          width: 16,
                          height: 16,
                          color: 'text.secondary',
                          mr: 0.5,
                        }}
                      />
                    </InputAdornment>
                  }
                >
                  {timeRangeOptions.map((option) => (
                    <MenuItem
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* 搜索按钮 */}
            {showSearch && onSearch && (
              <Button
                variant='contained'
                size='small'
                onClick={onSearch}
              >
                {i18n.t('components.stats_page_template.k2')}
              </Button>
            )}
          </Box>
        </Paper>
      )}

      {/* 统计卡片 */}
      {renderStatCards()}

      {/* 图表 */}
      {renderCharts()}

      {/* 数据表格 */}
      {renderTables()}

      {/* 自定义内容 */}
      {children}
    </Box>
  );
};

// 趋势图标组件
const TrendingUpIcon: React.FC = () => (
  <svg
    width='12'
    height='12'
    viewBox='0 0 12 12'
    fill='none'
  >
    <path
      d='M2 9L5 5L7 7L10 3'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M8 3H10V5'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);

const TrendingDownIcon: React.FC = () => (
  <svg
    width='12'
    height='12'
    viewBox='0 0 12 12'
    fill='none'
  >
    <path
      d='M2 3L5 7L7 5L10 9'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M8 9H10V7'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);

export default StatsPageTemplate;
