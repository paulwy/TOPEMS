/**
 * 业务指标大盘页面
 *
 * @module pages/monitor
 * @path /monitor/metrics-dashboard
 */

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Search,
  Filter,
  BarChart3,
  Activity,
  Target,
} from 'lucide-react';
import {
  Box,
  Typography,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  LinearProgress,
  Skeleton,
  useTheme,
} from '@mui/material';

import { PageContainer } from '@/components/common';
import { DashboardTemplate, type StatCard, type ChartCard } from '@/components/templates';
import { useNotificationStore } from '@/store';
import { metricsApi, type BusinessMetric, type BusinessMetricKpi } from '@/api/monitor/metrics';
import { extractErrorMessage } from '@/utils/errors';
import { MONITOR_PATHS } from '@/modules/monitor/config';

import { CACHE_DURATIONS, QUERY_KEYS } from '@/lib/reactQuery';
import { designTokens, semanticTokens } from '@topems/tokens';

const CATEGORY_LABELS: Record<string, string> = {
  all: '全部类别',
  sales: '销售',
  production: '生产',
  inventory: '库存',
  finance: '财务',
  hr: '人力',
  procurement: '采购',
  quality: '质量',
};

const statusColor = (m: BusinessMetric): 'success' | 'warning' | 'error' => {
  if (!m.target_value) return 'success';
  if (m.unit === '%' || m.code.includes('rate')) {
    if (m.current_value >= m.target_value) return 'success';
    if (m.current_value >= m.target_value * 0.95) return 'warning';
    return 'error';
  }
  return 'success';
};

const MiniLineChart: React.FC<{
  data: number[];
  color?: string;
  height?: number;
  targetValue?: number;
}> = ({ data, color = designTokens.colors.primary.dark, height = 160, targetValue }) => {
  if (!data || data.length === 0) return <Box sx={{ width: '100%', height }} />;
  const values = targetValue !== undefined ? [...data, targetValue] : data;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const width = 100;
  const padding = { top: 10, right: 10, bottom: 10, left: 10 };
  const denom = data.length - 1 || 1;
  const points = data
    .map((v, i) => {
      const x = padding.left + (i / denom) * (width - padding.left - padding.right);
      const y =
        padding.top +
        (50 - padding.top - padding.bottom) -
        ((v - min) / range) * (50 - padding.top - padding.bottom);
      return `${x},${y}`;
    })
    .join(' ');

  const targetY =
    targetValue !== undefined
      ? padding.top +
        (50 - padding.top - padding.bottom) -
        ((targetValue - min) / range) * (50 - padding.top - padding.bottom)
      : null;

  return (
    <Box sx={{ width: '100%', height }}>
      <svg
        width='100%'
        height='100%'
        viewBox='0 0 100 50'
        preserveAspectRatio='none'
      >
        {targetY !== null && (
          <line
            x1={padding.left}
            y1={targetY}
            x2={width - padding.right}
            y2={targetY}
            stroke='#ff9800'
            strokeWidth='0.6'
            strokeDasharray='2,2'
          />
        )}
        <polyline
          points={points}
          fill='none'
          stroke={color}
          strokeWidth='1.2'
        />
      </svg>
    </Box>
  );
};

const AchievementBar: React.FC<{ value: number; target: number; unit: string }> = ({
  value,
  target,
  unit,
}) => {
  const rate = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  const color = rate >= 95 ? 'success.main' : rate >= 80 ? 'warning.main' : 'error.main';
  return (
    <Box sx={{ minWidth: 120 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography
          variant='caption'
          color='text.secondary'
        >
          {rate.toFixed(1)}%
        </Typography>
        <Typography
          variant='caption'
          color='text.secondary'
        >
          目标 {target.toLocaleString()}
          {unit}
        </Typography>
      </Box>
      <LinearProgress
        variant='determinate'
        value={rate}
        sx={{
          height: 6,
          borderRadius: 3,
          bgcolor: 'grey.200',
          '& .MuiLinearProgress-bar': { bgcolor: color },
        }}
      />
    </Box>
  );
};

export const MetricsDashboardPage: React.FC = () => {
  const theme = useTheme();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [trendMetricCode, setTrendMetricCode] = useState<string>('order_total');
  const [trendPeriod, setTrendPeriod] = useState('7d');

  const summaryQuery = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.MONITOR_BUSINESS_METRICS_SUMMARY_BASE,
    queryFn: async () => {
      const res = await metricsApi.getBusinessMetricSummary();
      return res.data;
    },
  
      staleTime: CACHE_DURATIONS.MEDIUM,});

  const listQuery = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.MONITOR_BUSINESS_METRICS_LIST_BASE, category, serviceFilter, statusFilter, keyword],
    queryFn: async () => {
      const res = await metricsApi.listBusinessMetrics({
        category: category === 'all' ? undefined : category,
        service_name: serviceFilter === 'all' ? undefined : serviceFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
        keyword: keyword || undefined,
      });
      return res.data?.items ?? [];
    },
  
      staleTime: CACHE_DURATIONS.MEDIUM,});

  const kpiQuery = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.MONITOR_BUSINESS_METRICS_KPI_BASE,
    queryFn: async () => {
      const res = await metricsApi.getKpiDashboard('monthly');
      return res.data ?? [];
    },
  
      staleTime: CACHE_DURATIONS.MEDIUM,});

  const trendQuery = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.MONITOR_BUSINESS_METRICS_TREND_BASE, trendMetricCode, trendPeriod],
    queryFn: async () => {
      const res = await metricsApi.getBusinessMetricTrend(trendMetricCode, trendPeriod);
      return res.data ?? [];
    },
    enabled: Boolean(trendMetricCode),
  
      staleTime: CACHE_DURATIONS.MEDIUM,});

  const summary = summaryQuery.data;
  const metrics = listQuery.data ?? [];
  const kpis: BusinessMetricKpi[] = kpiQuery.data ?? [];
  const trendPoints = trendQuery.data ?? [];

  const stats: StatCard[] = useMemo(() => {
    const total = summary?.total_metrics ?? 0;
    const healthy = summary?.healthy_count ?? 0;
    const warning = summary?.warning_count ?? 0;
    const critical = summary?.critical_count ?? 0;
    return [
      {
        id: 'total',
        title: '指标总数',
        value: total,
        unit: '个',
        icon: <BarChart3 size={20} />,
        color: 'primary',
      },
      {
        id: 'healthy',
        title: '健康',
        value: healthy,
        unit: '个',
        icon: <Activity size={20} />,
        color: 'success',
      },
      {
        id: 'warning',
        title: '需关注',
        value: warning,
        unit: '个',
        icon: <TrendingUp size={20} />,
        color: 'warning',
      },
      {
        id: 'critical',
        title: '异常',
        value: critical,
        unit: '个',
        icon: <TrendingDown size={20} />,
        color: 'error',
      },
    ];
  }, [summary]);

  const kpiCharts: ChartCard[] = useMemo(
    () => [
      {
        id: 'kpi-progress',
        title: 'KPI 达成率',
        subtitle: '关键指标达成情况',
        type: 'bar',
        chart: (
          <Box sx={{ height: 280, display: 'flex', flexDirection: 'column', gap: 1.5, py: 1 }}>
            {kpiQuery.isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    variant='rectangular'
                    height={36}
                  />
                ))
              : kpis.map((kpi) => (
                  <Box
                    key={kpi.code}
                    sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
                  >
                    <Box sx={{ width: 120 }}>
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 500 }}
                      >
                        {kpi.name}
                      </Typography>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        {kpi.service_name}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <AchievementBar
                        value={kpi.value}
                        target={kpi.target}
                        unit={kpi.unit}
                      />
                    </Box>
                    <Box sx={{ width: 100, textAlign: 'right' }}>
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 600 }}
                      >
                        {kpi.value.toLocaleString()}
                        {kpi.unit}
                      </Typography>
                    </Box>
                  </Box>
                ))}
          </Box>
        ),
      },
      {
        id: 'trend',
        title: '指标趋势',
        subtitle: '选定指标随时间变化',
        type: 'line',
        chart: (
          <Box>
            <Stack
              direction='row'
              spacing={1}
              sx={{ mb: 2 }}
            >
              <FormControl
                size='small'
                sx={{ minWidth: 160 }}
              >
                <InputLabel>指标</InputLabel>
                <Select
                  value={trendMetricCode}
                  label='指标'
                  onChange={(e) => setTrendMetricCode(String(e.target.value))}
                >
                  {metrics.map((m) => (
                    <MenuItem
                      key={m.code}
                      value={m.code}
                    >
                      {m.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl
                size='small'
                sx={{ minWidth: 100 }}
              >
                <InputLabel>周期</InputLabel>
                <Select
                  value={trendPeriod}
                  label='周期'
                  onChange={(e) => setTrendPeriod(String(e.target.value))}
                >
                  <MenuItem value='1h'>1小时</MenuItem>
                  <MenuItem value='6h'>6小时</MenuItem>
                  <MenuItem value='24h'>24小时</MenuItem>
                  <MenuItem value='7d'>7天</MenuItem>
                  <MenuItem value='30d'>30天</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <Box sx={{ height: 220 }}>
              {trendQuery.isLoading ? (
                <Skeleton
                  variant='rectangular'
                  height='100%'
                />
              ) : (
                <MiniLineChart
                  data={trendPoints.map((p) => p.value)}
                  color={theme.palette.primary.main}
                  targetValue={trendPoints[0]?.target_value ?? undefined}
                />
              )}
            </Box>
          </Box>
        ),
      },
    ],
    [
      kpis,
      kpiQuery.isLoading,
      metrics,
      trendMetricCode,
      trendPeriod,
      trendPoints,
      trendQuery.isLoading,
      theme,
    ]
  );

  const handleRefresh = async () => {
    try {
      await Promise.allSettled([
        summaryQuery.refetch(),
        listQuery.refetch(),
        kpiQuery.refetch(),
        trendQuery.refetch(),
      ]);
      addNotification({ type: 'success', title: '已刷新', message: '业务指标已更新' });
    } catch (err) {
      addNotification({
        type: 'error',
        title: '刷新失败',
        message: extractErrorMessage(err, '刷新失败'),
      });
    }
  };

  const renderTrendIcon = (direction?: string) => {
    if (direction === 'up')
      return (
        <TrendingUp
          size={14}
          color={theme.palette.success.main}
        />
      );
    if (direction === 'down')
      return (
        <TrendingDown
          size={14}
          color={theme.palette.error.main}
        />
      );
    return (
      <Minus
        size={14}
        color={theme.palette.text.disabled}
      />
    );
  };

  return (
    <PageContainer
      headerProps={{
        pageIcon: <BarChart3 size={20} />,
        backButton: { href: MONITOR_PATHS.dashboard },
      }}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        loading={summaryQuery.isLoading || listQuery.isLoading || kpiQuery.isLoading}
        stats={stats}
        charts={kpiCharts}
        quickActions={[
          {
            id: 'refresh',
            label: '刷新数据',
            icon: <RefreshCw size={18} />,
            color: 'primary.light',
            description: '重新加载最新指标',
            onClick: handleRefresh,
          },
        ]}
        quickActionsTitle='快捷操作'
        onRefresh={handleRefresh}
        recentTitle='业务指标列表'
      >
        {summary?.categories && summary.categories.length > 0 && (
          <Paper sx={{ mb: 3, p: 2, borderRadius: 2 }}>
            <Typography
              variant='subtitle2'
              sx={{ mb: 1.5, fontWeight: 600 }}
            >
              分类概览
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
              {summary.categories.map((cat) => (
                <Chip
                  key={cat.code}
                  label={`${CATEGORY_LABELS[cat.code] ?? cat.code}: ${cat.metric_count}个`}
                  size='small'
                  variant={category === cat.code ? 'filled' : 'outlined'}
                  color={
                    cat.critical_count > 0 ? 'error' : cat.warning_count > 0 ? 'warning' : 'success'
                  }
                  onClick={() => setCategory(cat.code)}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
              <Chip
                label='全部'
                size='small'
                variant={category === 'all' ? 'filled' : 'outlined'}
                onClick={() => setCategory('all')}
                sx={{ cursor: 'pointer' }}
              />
            </Box>
          </Paper>
        )}

        <Paper sx={{ mt: 3, p: 2, borderRadius: 2 }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{ mb: 2, alignItems: { md: 'center' } }}
          >
            <TextField
              size='small'
              placeholder='搜索指标名或代码'
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <Search
                      size={16}
                      style={{ marginRight: 8 }}
                    />
                  ),
                },
              }}
              sx={{ minWidth: 220 }}
            />
            <FormControl
              size='small'
              sx={{ minWidth: 140 }}
            >
              <InputLabel>类别</InputLabel>
              <Select
                value={category}
                label='类别'
                onChange={(e) => setCategory(String(e.target.value))}
              >
                {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                  <MenuItem
                    key={v}
                    value={v}
                  >
                    {l}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl
              size='small'
              sx={{ minWidth: 140 }}
            >
              <InputLabel>服务</InputLabel>
              <Select
                value={serviceFilter}
                label='服务'
                onChange={(e) => setServiceFilter(String(e.target.value))}
              >
                <MenuItem value='all'>全部服务</MenuItem>
                {Array.from(
                  new Set(metrics.map((m) => m.service_name).filter(Boolean) as string[])
                ).map((s) => (
                  <MenuItem
                    key={s}
                    value={s}
                  >
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl
              size='small'
              sx={{ minWidth: 120 }}
            >
              <InputLabel>状态</InputLabel>
              <Select
                value={statusFilter}
                label='状态'
                onChange={(e) => setStatusFilter(String(e.target.value))}
              >
                <MenuItem value='all'>全部状态</MenuItem>
                <MenuItem value='healthy'>健康</MenuItem>
                <MenuItem value='warning'>需关注</MenuItem>
                <MenuItem value='critical'>异常</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ flex: 1 }} />
            <Chip
              icon={<Filter size={14} />}
              label={`共 ${metrics.length} 条`}
              variant='outlined'
              size='small'
            />
          </Stack>

          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>指标</TableCell>
                  <TableCell>类别</TableCell>
                  <TableCell>服务</TableCell>
                  <TableCell align='right'>当前值</TableCell>
                  <TableCell align='right'>目标</TableCell>
                  <TableCell>趋势</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>更新时间</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {listQuery.isLoading
                  ? Array.from({ length: 6 }).map((_, idx) => (
                      <TableRow key={idx}>
                        {Array.from({ length: 8 }).map((_, c) => (
                          <TableCell key={c}>
                            <Skeleton variant='text' />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : metrics.map((m) => (
                      <TableRow
                        key={m.id}
                        hover
                      >
                        <TableCell>
                          <Box>
                            <Typography
                              variant='body2'
                              sx={{ fontWeight: 500 }}
                            >
                              {m.name}
                            </Typography>
                            <Typography
                              variant='caption'
                              color='text.secondary'
                            >
                              {m.code}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size='small'
                            label={CATEGORY_LABELS[m.category] ?? m.category}
                            variant='outlined'
                          />
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                          >
                            {m.service_name || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell align='right'>
                          <Typography
                            variant='body2'
                            sx={{ fontWeight: 600 }}
                          >
                            {m.current_value.toLocaleString()}
                            {m.unit}
                          </Typography>
                        </TableCell>
                        <TableCell align='right'>
                          <Typography
                            variant='body2'
                            color='text.secondary'
                          >
                            {m.target_value ? `${m.target_value.toLocaleString()}${m.unit}` : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {renderTrendIcon(m.trend_direction)}
                            <Typography
                              variant='caption'
                              color={
                                m.change_percent && m.change_percent >= 0
                                  ? 'success.main'
                                  : 'error.main'
                              }
                            >
                              {m.change_percent != null
                                ? `${m.change_percent >= 0 ? '+' : ''}${m.change_percent.toFixed(1)}%`
                                : '-'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size='small'
                            label={
                              statusColor(m) === 'success'
                                ? '健康'
                                : statusColor(m) === 'warning'
                                  ? '需关注'
                                  : '异常'
                            }
                            color={statusColor(m)}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                          >
                            {new Date(m.last_updated).toLocaleString('zh-CN')}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                {!listQuery.isLoading && metrics.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      align='center'
                    >
                      <Box sx={{ py: 4 }}>
                        <Target
                          size={32}
                          color={theme.palette.text.disabled}
                        />
                        <Typography
                          variant='body2'
                          color='text.secondary'
                          sx={{ mt: 1 }}
                        >
                          暂无匹配的指标
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </DashboardTemplate>
    </PageContainer>
  );
};

export default MetricsDashboardPage;
