/**
 * 指标监控页面
 *
 * @module pages/monitor
 * @path /monitor/metrics
 *
 * 数据来源只有两处，且都是真实的：
 * 1. GET /api/monitor/metrics/system —— 当前 CPU/内存/磁盘/网络累计字节（后端 sysinfo 快照）
 * 2. GET /api/monitor/metrics/history —— 每 5s 采样、24h 环形缓冲的历史样本
 * 原先的「多服务趋势」「API QPS 2,856」「P50/P90/P99 响应时间」都没有后端来源，已整块撤掉。
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Cpu, HardDrive, Server, Activity, ChevronDown } from 'lucide-react';
import i18n from '@/i18n';
import { Stack, Menu, MenuItem, Button, useTheme } from '@mui/material';
import { PageContainer } from '@/components/common';
import { DashboardTemplate, type StatCard, type ChartCard } from '@/components/templates';
import { LazyChart } from '@/components/charts';
import { MONITOR_PATHS } from '@/module-configs/monitor/config';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { monitorApi } from '@/api/monitor';

type TimeRange = '1h' | '6h' | '24h';
const timeRangeOptions: { value: TimeRange; label: string }[] = [
  { value: '1h', label: i18n.t('monitor.monitor_metrics_page.1_0') },
  { value: '6h', label: i18n.t('monitor.monitor_metrics_page.6_1') },
  { value: '24h', label: i18n.t('monitor.monitor_metrics_page.24_2') },
];

const toMinutes = (range: TimeRange): number =>
  range === '1h' ? 60 : range === '6h' ? 360 : 1440;

const formatTime = (ts: number): string =>
  new Date(ts * 1000).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

export const MonitorMetricsPage: React.FC = () => {
  const theme = useTheme();
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [timeRangeAnchorEl, setTimeRangeAnchorEl] = useState<null | HTMLElement>(null);

  const systemQuery = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.MONITOR_METRICS_BASE, 'system'],
    queryFn: async () => {
      const res = await monitorApi.getSystemMetrics();
      return res.success ? res.data : null;
    },
    refetchInterval: 30 * 1000,
    staleTime: 20 * 1000,
  });

  const historyQuery = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.MONITOR_METRICS_BASE, 'history', toMinutes(timeRange)],
    queryFn: async () => {
      const res = await monitorApi.getSystemMetricsHistory(toMinutes(timeRange));
      return res.success ? res.data : null;
    },
    refetchInterval: 30 * 1000,
    staleTime: 20 * 1000,
  });

  const loading = systemQuery.isFetching || historyQuery.isFetching;
  const refetchMetrics = useCallback(() => {
    void systemQuery.refetch();
    void historyQuery.refetch();
  }, [systemQuery, historyQuery]);

  const samples = historyQuery.data?.samples ?? [];
  const labels = useMemo(() => samples.map((s) => formatTime(s.ts)), [samples]);
  const cpuSeries = useMemo(() => samples.map((s) => Math.round(s.cpu)), [samples]);
  const memorySeries = useMemo(() => samples.map((s) => Math.round(s.memory)), [samples]);
  const diskSeries = useMemo(() => samples.map((s) => Math.round(s.disk)), [samples]);
  const netSeries = useMemo(
    () =>
      samples.map((s, i) => {
        if (i === 0) return 0;
        const prev = samples[i - 1];
        const dt = Math.max(1, s.ts - prev.ts);
        return Number(
          (((s.net_in + s.net_out) - (prev.net_in + prev.net_out)) / dt / 1024 / 1024).toFixed(2)
        );
      }),
    [samples]
  );

  const latest = samples.length > 0 ? samples[samples.length - 1] : null;
  const metrics = systemQuery.data;
  const cpu = Math.round(latest?.cpu ?? metrics?.cpu_usage ?? 0);
  const memory = Math.round(latest?.memory ?? metrics?.memory_usage ?? 0);
  const disk = Math.round(latest?.disk ?? metrics?.disk_usage ?? 0);
  const netThroughput = netSeries.length > 0 ? netSeries[netSeries.length - 1] : 0;
  const hasHistory = samples.length > 1;

  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'cpu-usage',
        title: i18n.t('pages.monitor_metrics_page.cpu_1'),
        value: cpu,
        unit: '%',
        icon: <Cpu size={20} />,
        color: 'warning',
        progress: cpu,
        progressLabel: i18n.t('monitor.monitor_metrics_page.k26'),
        trend: hasHistory ? cpuSeries.slice(-24) : undefined,
      },
      {
        id: 'memory-usage',
        title: i18n.t('monitor.monitor_metrics_page.k27'),
        value: memory,
        unit: '%',
        icon: <Server size={20} />,
        color: 'warning',
        progress: memory,
        progressLabel: i18n.t('monitor.monitor_metrics_page.k29'),
        trend: hasHistory ? memorySeries.slice(-24) : undefined,
      },
      {
        id: 'disk-usage',
        title: i18n.t('monitor.monitor_metrics_page.k30'),
        value: disk,
        unit: '%',
        icon: <HardDrive size={20} />,
        color: 'info',
        progress: disk,
        progressLabel: i18n.t('monitor.monitor_metrics_page.k32'),
        trend: hasHistory ? diskSeries.slice(-24) : undefined,
      },
      {
        id: 'network-throughput',
        title: i18n.t('monitor.monitor_metrics_page.k47'),
        value: netThroughput,
        unit: 'MB/s',
        icon: <Activity size={20} />,
        color: 'primary',
        trend: hasHistory ? netSeries.slice(-24) : undefined,
      },
    ],
    [cpu, memory, disk, netThroughput, hasHistory, cpuSeries, memorySeries, diskSeries, netSeries]
  );

  const charts: ChartCard[] = useMemo(() => {
    const trend = (key: string, name: string, arr: number[], color: string) => ({
      data: labels.map((label, i) => ({ name: label, [key]: arr[i] ?? 0 })),
      yKeys: [{ key, name, color }],
    });
    const cpuTrend = trend('cpu', 'CPU %', cpuSeries, 'primary.main');
    const memTrend = trend('memory', '内存 %', memorySeries, 'success.main');
    const diskTrend = trend('disk', '磁盘 %', diskSeries, 'warning.main');
    const netTrend = trend('net', '网络 MB/s', netSeries, 'secondary.main');
    return [
      {
        id: 'cpu-trend',
        title: i18n.t('pages.monitor_metrics_page.cpu_1'),
        subtitle: i18n.t('monitor.monitor_metrics_page.cpu_38'),
        chart: (
          <LazyChart type='line' data={cpuTrend.data} xKey='name' yKeys={cpuTrend.yKeys} height={280} />
        ),
        height: 360,
        type: 'line',
        onRefresh: refetchMetrics,
      },
      {
        id: 'memory-trend',
        title: i18n.t('monitor.monitor_metrics_page.k39'),
        subtitle: i18n.t('monitor.monitor_metrics_page.k40'),
        chart: (
          <LazyChart type='line' data={memTrend.data} xKey='name' yKeys={memTrend.yKeys} height={280} />
        ),
        height: 360,
        type: 'line',
        onRefresh: refetchMetrics,
      },
      {
        id: 'disk-trend',
        title: i18n.t('monitor.monitor_metrics_page.k30'),
        subtitle: i18n.t('monitor.monitor_metrics_page.k42'),
        chart: (
          <LazyChart type='area' data={diskTrend.data} xKey='name' yKeys={diskTrend.yKeys} height={280} />
        ),
        height: 360,
        type: 'area',
        onRefresh: refetchMetrics,
      },
      {
        id: 'network-traffic',
        title: i18n.t('monitor.monitor_metrics_page.k47'),
        subtitle: i18n.t('monitor.monitor_metrics_page.k48'),
        chart: (
          <LazyChart type='area' data={netTrend.data} xKey='name' yKeys={netTrend.yKeys} height={280} />
        ),
        height: 360,
        type: 'area',
        onRefresh: refetchMetrics,
      },
    ];
  }, [cpuSeries, memorySeries, diskSeries, netSeries, labels, refetchMetrics]);

  const currentTimeRangeLabel =
    timeRangeOptions.find((o) => o.value === timeRange)?.label ?? timeRange;

  const headerContent = (
    <Stack direction='row' spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
      <Button
        size='small'
        variant='outlined'
        endIcon={<ChevronDown size={16} />}
        onClick={(e) => setTimeRangeAnchorEl(e.currentTarget)}
        sx={{ textTransform: 'none' }}
      >
        {currentTimeRangeLabel}
      </Button>
      <Menu
        anchorEl={timeRangeAnchorEl}
        open={Boolean(timeRangeAnchorEl)}
        onClose={() => setTimeRangeAnchorEl(null)}
      >
        {timeRangeOptions.map((option) => (
          <MenuItem
            key={option.value}
            selected={timeRange === option.value}
            onClick={() => {
              setTimeRange(option.value);
              setTimeRangeAnchorEl(null);
            }}
          >
            {option.label}
          </MenuItem>
        ))}
      </Menu>
    </Stack>
  );

  return (
    <PageContainer
      title={i18n.t('monitor.monitor_metrics_page.k57')}
      subtitle={i18n.t('monitor.monitor_metrics_page.k58')}
      headerProps={{
        pageIcon: <BarChart3 size={20} />,
        pageGradient: `linear-gradient(135deg, ${theme.palette.secondary[400]} 0%, ${theme.palette.secondary.main} 100%)`,
        backButton: {
          href: MONITOR_PATHS.dashboard,
          visible: true,
        },
        children: headerContent,
      }}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        autoTitle={false}
        title=''
        subtitle=''
        loading={loading}
        stats={stats}
        charts={charts}
        onRefresh={refetchMetrics}
      />
    </PageContainer>
  );
};

export default MonitorMetricsPage;
