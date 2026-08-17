/**
 * 系统监控仪表盘页面
 *
 * @module pages/monitor
 * @path /monitor/dashboard
 */
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  Cpu,
  HardDrive,
  Database,
  Zap,
  Clock,
  Server,
  Bell,
  BarChart3,
  FileText,
  Settings,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import i18n from '@/i18n';
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
  Button,
  Menu,
  MenuItem,
  useTheme,
} from '@mui/material';
import { PageContainer } from '@/components/common';
import {
  DashboardTemplate,
  type StatCard,
  type ChartCard,
  type QuickAction,
  type RecentItem,
} from '@/components/templates';
import { useNotificationStore } from '../../store';
import { designTokens } from '@/theme/tokens';
import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';
import { monitorApi, type SystemMetrics, type DatabaseMetrics } from '@/api/monitor';

const ct = designTokens.colors;
type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d';
const timeRangeOptions: { value: TimeRange; label: string }[] = [
  { value: '1h', label: i18n.t('monitor.monitor_dashboard_page.1_0') },
  { value: '6h', label: i18n.t('monitor.monitor_dashboard_page.6_1') },
  { value: '24h', label: i18n.t('monitor.monitor_dashboard_page.24_2') },
  { value: '7d', label: i18n.t('monitor.monitor_dashboard_page.7_3') },
  { value: '30d', label: i18n.t('monitor.monitor_dashboard_page.30_4') },
];
interface ServiceHealth {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'error';
  cpu: number;
  memory: number;
  uptime: string;
  lastCheck: string;
}
interface AlertItem {
  id: string;
  title: string;
  severity: 'critical' | 'warning' | 'info';
  service: string;
  time: string;
  message: string;
}
const generateTimeLabels = (range: TimeRange): string[] => {
  const labels: string[] = [];
  const now = new Date();
  if (range === '1h') {
    for (let i = 60; i >= 0; i -= 5) {
      const time = new Date(now.getTime() - i * 60 * 1000);
      labels.push(time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
    }
  } else if (range === '6h') {
    for (let i = 6; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      labels.push(time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
    }
  } else if (range === '24h') {
    for (let i = 24; i >= 0; i -= 2) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      labels.push(time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
    }
  } else if (range === '7d') {
    for (let i = 7; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      labels.push(date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }));
    }
  } else {
    for (let i = 30; i >= 0; i -= 3) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      labels.push(date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }));
    }
  }
  return labels;
};
const createFlatTrend = (length: number, value: number): number[] => {
  return Array.from({ length }, () => value);
};
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return i18n.t('monitor.monitor_dashboard_page.k5');
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return i18n.t('monitor.monitor_dashboard_page.k6');
  if (diffMin < 60) return `${diffMin}${i18n.t('pages.monitor_dashboard_page.k0')}`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}${i18n.t('pages.monitor_dashboard_page.k1')}`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}${i18n.t('pages.monitor_dashboard_page.k2')}`;
};
const MiniLineChart: React.FC<{
  data: number[];
  labels: string[];
  color?: string;
  height?: number;
}> = ({ data, color = ct.primary.dark, height = 180 }) => {
  if (!data || data.length === 0) {
    return <Box sx={{ width: '100%', height }} />;
  }
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 100;
  const chartHeight = 100;
  const padding = { top: 10, right: 10, bottom: 20, left: 30 };
  const denom = data.length - 1 || 1;
  const points = data
    .map((value, index) => {
      const x = padding.left + (index / denom) * (width - padding.left - padding.right);
      const y =
        padding.top +
        chartHeight -
        padding.bottom -
        ((value - min) / range) * (chartHeight - padding.top - padding.bottom);
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <Box sx={{ width: '100%', height, position: 'relative' }}>
      <svg
        width='100%'
        height='100%'
        viewBox={`0 0 ${width} ${chartHeight + padding.bottom}`}
        preserveAspectRatio='none'
      >
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <line
            key={i}
            x1={padding.left}
            y1={padding.top + (chartHeight - padding.top - padding.bottom) * ratio}
            x2={width - padding.right}
            y2={padding.top + (chartHeight - padding.top - padding.bottom) * ratio}
            stroke={ct.grey[200]}
            strokeWidth='0.3'
            strokeDasharray='2,2'
          />
        ))}
        <polyline
          points={points}
          fill='none'
          stroke={color}
          strokeWidth='1.5'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    </Box>
  );
};
const MiniBarChart: React.FC<{
  data: number[];
  labels: string[];
  color?: string;
  height?: number;
}> = ({ data, color = ct.primary.dark, height = 180 }) => {
  if (!data || data.length === 0) {
    return <Box sx={{ width: '100%', height }} />;
  }
  const max = Math.max(...data) || 1;
  const barWidth = (100 - 40) / data.length - 2;
  return (
    <Box sx={{ width: '100%', height, position: 'relative' }}>
      <svg
        width='100%'
        height='100%'
        viewBox='0 0 100 100'
        preserveAspectRatio='none'
      >
        {data.map((value, index) => {
          const barHeight = (value / max) * 60;
          const x = 20 + index * (barWidth + 2);
          const y = 80 - barHeight;
          return (
            <rect
              key={index}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill={color}
              rx='1'
            />
          );
        })}
      </svg>
    </Box>
  );
};
const MiniPieChart: React.FC<{
  data: { label: string; value: number; color: string }[];
  size?: number;
}> = ({ data, size = 160 }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  const radius = 40;
  const centerX = 50;
  const centerY = 50;
  let currentAngle = -90;
  const paths = data.map((item) => {
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);
    const largeArc = angle > 180 ? 1 : 0;
    return {
      d: `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`,
      color: item.color,
      label: item.label,
      value: item.value,
      percentage: ((item.value / total) * 100).toFixed(1),
    };
  });
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, height: '100%' }}>
      <Box sx={{ width: size, height: size, flexShrink: 0 }}>
        <svg
          viewBox='0 0 100 100'
          width='100%'
          height='100%'
        >
          {paths.map((path, index) => (
            <path
              key={index}
              d={path.d}
              fill={path.color}
            />
          ))}
        </svg>
      </Box>
      <Box sx={{ flex: 1 }}>
        {paths.map((path, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 1,
            }}
          >
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: path.color,
              }}
            />
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {path.label}
            </Typography>
            <Typography
              variant='body2'
              sx={{ fontWeight: 600, ml: 'auto' }}
            >
              {path.percentage}%
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};
export const MonitorDashboardPage: React.FC = () => {
  const theme = useTheme();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [timeRangeAnchorEl, setTimeRangeAnchorEl] = useState<null | HTMLElement>(null);
  const timeLabels = useMemo(() => generateTimeLabels(timeRange), [timeRange]);
  const systemMetricsQuery = useQuery({
    queryKey: [...QUERY_KEYS.MONITOR.METRICS, timeRange],
    queryFn: async () => {
      const res = await monitorApi.getSystemMetrics();
      return res.data;
    },

    staleTime: CACHE_DURATIONS.MEDIUM,
  });
  const serviceHealthQuery = useQuery({
    queryKey: [...QUERY_KEYS.MONITOR.HEALTH, timeRange],
    queryFn: async () => {
      const res = await monitorApi.getServiceHealth();
      return res.data ?? [];
    },

    staleTime: CACHE_DURATIONS.MEDIUM,
  });
  const alertsQuery = useQuery({
    queryKey: [...QUERY_KEYS.MONITOR.ALERTS, timeRange],
    queryFn: async () => {
      const res = await monitorApi.listAlerts({ pagesize: 10, status: 'active' });
      return res.data?.items ?? [];
    },

    staleTime: CACHE_DURATIONS.MEDIUM,
  });
  const apiPerformanceQuery = useQuery({
    queryKey: [...QUERY_KEYS.MONITOR.PERFORMANCE, timeRange],
    queryFn: async () => {
      const res = await monitorApi.getApiPerformance();
      return res.data ?? [];
    },

    staleTime: CACHE_DURATIONS.MEDIUM,
  });
  const dbMetricsQuery = useQuery({
    queryKey: [...QUERY_KEYS.MONITOR.DATABASE, timeRange],
    queryFn: async () => {
      const res = await monitorApi.getDatabaseMetrics();
      return res.data;
    },

    staleTime: CACHE_DURATIONS.MEDIUM,
  });
  const loading =
    systemMetricsQuery.isFetching ||
    serviceHealthQuery.isFetching ||
    alertsQuery.isFetching ||
    apiPerformanceQuery.isFetching ||
    dbMetricsQuery.isFetching;
  const systemMetrics = (systemMetricsQuery.data || {}) as SystemMetrics;
  const apiServices = Array.isArray(serviceHealthQuery.data) ? serviceHealthQuery.data : [];
  const apiAlerts = Array.isArray(alertsQuery.data) ? alertsQuery.data : [];
  const apiPerf = Array.isArray(apiPerformanceQuery.data) ? apiPerformanceQuery.data : [];
  const dbMetrics = (dbMetricsQuery.data || {}) as DatabaseMetrics;
  const services: ServiceHealth[] = useMemo(
    () =>
      apiServices.map((s) => ({
        id: s.id || s.service_name,
        name: s.service_name,
        status: s.status === 'healthy' ? 'healthy' : s.status === 'degraded' ? 'warning' : 'error',
        cpu: 0,
        memory: 0,
        uptime: s.uptime || '-',
        lastCheck: s.last_check || s.last_checked || '-',
      })),
    [apiServices]
  );
  const recentAlerts: AlertItem[] = useMemo(
    () =>
      apiAlerts.map((a) => ({
        id: a.id,
        title: a.title,
        severity: a.severity,
        service: a.service_name,
        time: formatRelativeTime(a.created_at),
        message: a.message,
      })),
    [apiAlerts]
  );
  const stats: StatCard[] = useMemo(() => {
    const cpuUsage = Math.round(systemMetrics?.cpu_usage ?? 0);
    const memUsage = Math.round(systemMetrics?.memory_usage ?? 0);
    const diskUsage = Math.round(systemMetrics?.disk_usage ?? 0);
    const networkThroughput = systemMetrics
      ? Math.round(systemMetrics.network_in + systemMetrics.network_out)
      : 0;
    const dbConnections = dbMetrics?.connections ?? 0;
    const onlineServices = apiServices.filter((s) => s.status === 'healthy').length;
    const alertCount = apiAlerts.length;
    const apiResponseTime =
      apiPerf.length > 0
        ? Math.round(apiPerf.reduce((sum, p) => sum + p.avg_response_time, 0) / apiPerf.length)
        : 0;
    return [
      {
        id: 'online-services',
        title: i18n.t('monitor.monitor_dashboard_page.k7'),
        value: onlineServices,
        unit: i18n.t('monitor.monitor_dashboard_page.k8'),
        icon: <Server size={20} />,
        color: 'success',
        trend: createFlatTrend(12, onlineServices),
      },
      {
        id: 'alerts',
        title: i18n.t('monitor.monitor_dashboard_page.k9'),
        value: alertCount,
        unit: i18n.t('monitor.monitor_dashboard_page.k10'),
        icon: <AlertTriangle size={20} />,
        color: 'error',
        trend: createFlatTrend(12, alertCount),
      },
      {
        id: 'cpu-usage',
        title: i18n.t('pages.monitor_dashboard_page.cpu_3'),
        value: cpuUsage,
        unit: '%',
        icon: <Cpu size={20} />,
        color: 'warning',
        progress: cpuUsage,
        progressLabel: i18n.t('monitor.monitor_dashboard_page.k11'),
        trend: createFlatTrend(12, cpuUsage),
      },
      {
        id: 'memory-usage',
        title: i18n.t('monitor.monitor_dashboard_page.k12'),
        value: memUsage,
        unit: '%',
        icon: <Zap size={20} />,
        color: 'warning',
        progress: memUsage,
        progressLabel: i18n.t('monitor.monitor_dashboard_page.k13'),
        trend: createFlatTrend(12, memUsage),
      },
      {
        id: 'disk-usage',
        title: i18n.t('monitor.monitor_dashboard_page.k14'),
        value: diskUsage,
        unit: '%',
        icon: <HardDrive size={20} />,
        color: 'info',
        progress: diskUsage,
        progressLabel: i18n.t('monitor.monitor_dashboard_page.k15'),
        trend: createFlatTrend(12, diskUsage),
      },
      {
        id: 'network-throughput',
        title: i18n.t('monitor.monitor_dashboard_page.k16'),
        value: networkThroughput,
        unit: 'MB/s',
        icon: <Activity size={20} />,
        color: 'primary',
        trend: createFlatTrend(12, networkThroughput),
      },
      {
        id: 'db-connections',
        title: i18n.t('monitor.monitor_dashboard_page.k17'),
        value: dbConnections,
        unit: i18n.t('monitor.monitor_dashboard_page.k18'),
        icon: <Database size={20} />,
        color: 'secondary',
        trend: createFlatTrend(12, dbConnections),
      },
      {
        id: 'api-response-time',
        title: i18n.t('pages.monitor_dashboard_page.api_4'),
        value: apiResponseTime,
        unit: 'ms',
        icon: <Clock size={20} />,
        color: 'success',
        trend: createFlatTrend(12, apiResponseTime),
      },
    ];
  }, [systemMetrics, dbMetrics, apiServices, apiAlerts, apiPerf]);
  const systemResourceData = useMemo(
    () => ({
      cpu: createFlatTrend(timeLabels.length, Math.round(systemMetrics?.cpu_usage ?? 0)),
      memory: createFlatTrend(timeLabels.length, Math.round(systemMetrics?.memory_usage ?? 0)),
      disk: createFlatTrend(timeLabels.length, Math.round(systemMetrics?.disk_usage ?? 0)),
    }),
    [timeLabels, systemMetrics]
  );
  const serviceHealthData = useMemo(
    () => [
      {
        label: i18n.t('monitor.monitor_dashboard_page.k19'),
        value: apiServices.filter((s) => s.status === 'healthy').length,
        color: theme.palette.success.main,
      },
      {
        label: i18n.t('monitor.monitor_dashboard_page.k20'),
        value: apiServices.filter((s) => s.status === 'degraded').length,
        color: theme.palette.warning.main,
      },
      {
        label: i18n.t('monitor.monitor_dashboard_page.k21'),
        value: apiServices.filter((s) => s.status === 'unhealthy').length,
        color: theme.palette.error.main,
      },
    ],
    [apiServices, theme]
  );
  const alertDistributionData = useMemo(() => {
    const serviceSet = new Set<string>();
    apiServices.forEach((s) => serviceSet.add(s.service_name));
    apiAlerts.forEach((a) => serviceSet.add(a.service_name));
    const serviceNames = Array.from(serviceSet);
    const alerts = serviceNames.map(
      (name) => apiAlerts.filter((a) => a.service_name === name).length
    );
    return { services: serviceNames, alerts };
  }, [apiServices, apiAlerts]);
  const apiResponseTimeData = useMemo(() => {
    const avg =
      apiPerf.length > 0
        ? Math.round(apiPerf.reduce((sum, p) => sum + p.avg_response_time, 0) / apiPerf.length)
        : 0;
    const p95 =
      apiPerf.length > 0
        ? Math.round(apiPerf.reduce((sum, p) => sum + p.p95_response_time, 0) / apiPerf.length)
        : 0;
    const p99 =
      apiPerf.length > 0
        ? Math.round(apiPerf.reduce((sum, p) => sum + p.p99_response_time, 0) / apiPerf.length)
        : 0;
    return {
      avg: createFlatTrend(timeLabels.length, avg),
      p95: createFlatTrend(timeLabels.length, p95),
      p99: createFlatTrend(timeLabels.length, p99),
    };
  }, [timeLabels, apiPerf]);
  const charts: ChartCard[] = useMemo(
    () => [
      {
        id: 'system-resource',
        title: i18n.t('monitor.monitor_dashboard_page.k22'),
        subtitle: i18n.t('pages.monitor_dashboard_page.cpu_5'),
        type: 'line',
        chart: (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'primary.main' }} />
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  CPU
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'warning.main' }} />
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {i18n.t('pages.monitor_dashboard_page.k0')}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'info.main' }} />
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {i18n.t('pages.monitor_dashboard_page.k1')}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ flex: 1, position: 'relative' }}>
              <MiniLineChart
                data={systemResourceData.cpu}
                labels={timeLabels}
                color={theme.palette.primary.main}
                height={220}
              />
            </Box>
          </Box>
        ),
      },
      {
        id: 'service-health',
        title: i18n.t('monitor.monitor_dashboard_page.k23'),
        subtitle: i18n.t('monitor.monitor_dashboard_page.k24'),
        type: 'pie',
        chart: <MiniPieChart data={serviceHealthData} />,
      },
      {
        id: 'alert-distribution',
        title: i18n.t('monitor.monitor_dashboard_page.k25'),
        subtitle: i18n.t('monitor.monitor_dashboard_page.k26'),
        type: 'bar',
        chart: (
          <Box sx={{ height: '100%' }}>
            <MiniBarChart
              data={alertDistributionData.alerts}
              labels={alertDistributionData.services}
              color={theme.palette.error.main}
              height={220}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, px: 2 }}>
              {alertDistributionData.services.map((service, index) => (
                <Typography
                  key={index}
                  variant='caption'
                  color='text.secondary'
                  sx={{ fontSize: '0.65rem' }}
                >
                  {service.replace(i18n.t('monitor.monitor_dashboard_page.k27'), '')}
                </Typography>
              ))}
            </Box>
          </Box>
        ),
      },
      {
        id: 'api-response',
        title: i18n.t('pages.monitor_dashboard_page.api_6'),
        subtitle: i18n.t('monitor.monitor_dashboard_page.p95p99_28'),
        type: 'line',
        chart: (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'success.main' }} />
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {i18n.t('pages.monitor_dashboard_page.k2')}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'warning.main' }} />
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  P95
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'error.main' }} />
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  P99
                </Typography>
              </Box>
            </Box>
            <Box sx={{ flex: 1 }}>
              <MiniLineChart
                data={apiResponseTimeData.avg}
                labels={timeLabels}
                color={theme.palette.success.main}
                height={200}
              />
            </Box>
          </Box>
        ),
      },
    ],
    [
      timeLabels,
      systemResourceData,
      serviceHealthData,
      alertDistributionData,
      apiResponseTimeData,
      theme,
    ]
  );
  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: 'view-alerts',
        label: i18n.t('monitor.monitor_dashboard_page.k29'),
        icon: <Bell size={20} />,
        color: 'error.light',
        description: i18n.t('monitor.monitor_dashboard_page.k30'),
        onClick: () => {
          addNotification({
            type: 'info',
            message: i18n.t('pages.monitor_dashboard_page.k7'),
          });
        },
      },
      {
        id: 'view-metrics',
        label: i18n.t('monitor.monitor_dashboard_page.k31'),
        icon: <BarChart3 size={20} />,
        color: 'primary.light',
        description: i18n.t('monitor.monitor_dashboard_page.k32'),
        onClick: () => {
          addNotification({
            type: 'info',
            message: i18n.t('pages.monitor_dashboard_page.k8'),
          });
        },
      },
      {
        id: 'view-logs',
        label: i18n.t('monitor.monitor_dashboard_page.k33'),
        icon: <FileText size={20} />,
        color: 'info.light',
        description: i18n.t('monitor.monitor_dashboard_page.k34'),
        onClick: () => {
          addNotification({
            type: 'info',
            message: i18n.t('pages.monitor_dashboard_page.k9'),
          });
        },
      },
      {
        id: 'alert-rules',
        label: i18n.t('monitor.monitor_dashboard_page.k35'),
        icon: <Settings size={20} />,
        color: 'warning.light',
        description: i18n.t('monitor.monitor_dashboard_page.k36'),
        onClick: () => {
          addNotification({
            type: 'info',
            message: i18n.t('pages.monitor_dashboard_page.k10'),
          });
        },
      },
    ],
    [addNotification]
  );
  const recentItems: RecentItem[] = useMemo(
    () =>
      recentAlerts.map((alert) => ({
        id: alert.id,
        title: alert.title,
        description: `${alert.service} · ${alert.message}`,
        time: alert.time,
        status:
          alert.severity === 'critical'
            ? 'error'
            : alert.severity === 'warning'
              ? 'warning'
              : 'info',
        icon:
          alert.severity === 'critical' ? (
            <XCircle size={18} />
          ) : alert.severity === 'warning' ? (
            <AlertTriangle size={18} />
          ) : (
            <AlertCircle size={18} />
          ),
      })),
    [recentAlerts]
  );
  const handleTimeRangeClick = (event: React.MouseEvent<HTMLElement>) => {
    setTimeRangeAnchorEl(event.currentTarget);
  };
  const handleTimeRangeClose = () => {
    setTimeRangeAnchorEl(null);
  };
  const handleTimeRangeSelect = (range: TimeRange) => {
    setTimeRange(range);
    setTimeRangeAnchorEl(null);
  };
  const handleRefresh = async () => {
    await Promise.allSettled([
      systemMetricsQuery.refetch(),
      serviceHealthQuery.refetch(),
      alertsQuery.refetch(),
      apiPerformanceQuery.refetch(),
      dbMetricsQuery.refetch(),
    ]);
    addNotification({
      type: 'success',
      message: i18n.t('monitor.monitor_dashboard_page.k37'),
    });
  };
  const getStatusChip = (status: ServiceHealth['status']) => {
    const statusMap = {
      healthy: {
        label: i18n.t('monitor.monitor_dashboard_page.k38'),
        color: 'success' as const,
        icon: <CheckCircle size={14} />,
      },
      warning: {
        label: i18n.t('monitor.monitor_dashboard_page.k39'),
        color: 'warning' as const,
        icon: <AlertTriangle size={14} />,
      },
      error: {
        label: i18n.t('monitor.monitor_dashboard_page.k40'),
        color: 'error' as const,
        icon: <XCircle size={14} />,
      },
    };
    const config = statusMap[status];
    return (
      <Chip
        label={config.label}
        size='small'
        color={config.color}
        icon={config.icon}
        sx={{ height: 24, '& .MuiChip-icon': { ml: 0.5 } }}
      />
    );
  };
  const timeRangeLabel =
    timeRangeOptions.find((opt) => opt.value === timeRange)?.label ||
    i18n.t('monitor.monitor_dashboard_page.24_41');
  const headerContent = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Button
        size='small'
        variant='outlined'
        endIcon={<ChevronDown size={16} />}
        onClick={handleTimeRangeClick}
        sx={{ textTransform: 'none' }}
      >
        {timeRangeLabel}
      </Button>
      <Menu
        anchorEl={timeRangeAnchorEl}
        open={Boolean(timeRangeAnchorEl)}
        onClose={handleTimeRangeClose}
      >
        {timeRangeOptions.map((option) => (
          <MenuItem
            key={option.value}
            selected={timeRange === option.value}
            onClick={() => handleTimeRangeSelect(option.value)}
          >
            {option.label}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
  return (
    <PageContainer
      headerProps={{
        pageIcon: <Activity size={20} />,
        children: headerContent,
      }}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        loading={loading}
        stats={stats}
        charts={charts}
        quickActions={quickActions}
        recentItems={recentItems}
        recentTitle={i18n.t('monitor.monitor_dashboard_page.k42')}
        quickActionsTitle={i18n.t('monitor.monitor_dashboard_page.k43')}
        onRefresh={handleRefresh}
      >
        <Box sx={{ mt: 3 }}>
          <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
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
                {i18n.t('pages.monitor_dashboard_page.k3')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip
                  label={`${i18n.t('pages.monitor_dashboard_page.k11')}${services.filter((s) => s.status === 'healthy').length}`}
                  size='small'
                  color='success'
                  variant='outlined'
                />
                <Chip
                  label={`${i18n.t('pages.monitor_dashboard_page.k12')}${services.filter((s) => s.status === 'warning').length}`}
                  size='small'
                  color='warning'
                  variant='outlined'
                />
                <Chip
                  label={`${i18n.t('pages.monitor_dashboard_page.k13')}${services.filter((s) => s.status === 'error').length}`}
                  size='small'
                  color='error'
                  variant='outlined'
                />
              </Box>
            </Box>
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>{i18n.t('monitor.monitor_dashboard_page.k44')}</TableCell>
                    <TableCell>{i18n.t('monitor.monitor_dashboard_page.k45')}</TableCell>
                    <TableCell>{i18n.t('pages.monitor_dashboard_page.pu_0')}</TableCell>
                    <TableCell>{i18n.t('monitor.monitor_dashboard_page.k46')}</TableCell>
                    <TableCell>{i18n.t('monitor.monitor_dashboard_page.k47')}</TableCell>
                    <TableCell>{i18n.t('monitor.monitor_dashboard_page.k48')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading
                    ? Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={index}>
                          {Array.from({ length: 6 }).map((_, cellIndex) => (
                            <TableCell key={cellIndex}>
                              <Box
                                sx={{ width: 80, height: 20, bgcolor: 'grey.200', borderRadius: 1 }}
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    : services.map((service) => (
                        <TableRow
                          key={service.id}
                          hover
                          sx={{ cursor: 'pointer' }}
                          onClick={() => {
                            addNotification({
                              type: 'info',
                              message: `${i18n.t('pages.monitor_dashboard_page.k14')}${service.name}${i18n.t('pages.monitor_dashboard_page.k15')}`,
                            });
                          }}
                        >
                          <TableCell sx={{ fontWeight: 500 }}>{service.name}</TableCell>
                          <TableCell>{getStatusChip(service.status)}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ flex: 1, maxWidth: 100 }}>
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
                                      width: `${service.cpu}%`,
                                      height: '100%',
                                      bgcolor:
                                        service.cpu > 80
                                          ? 'error.main'
                                          : service.cpu > 60
                                            ? 'warning.main'
                                            : 'success.main',
                                      transition: 'width 0.3s ease',
                                    }}
                                  />
                                </Box>
                              </Box>
                              <Typography
                                variant='body2'
                                color='text.secondary'
                                sx={{ minWidth: 40 }}
                              >
                                {service.cpu}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ flex: 1, maxWidth: 100 }}>
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
                                      width: `${service.memory}%`,
                                      height: '100%',
                                      bgcolor:
                                        service.memory > 80
                                          ? 'error.main'
                                          : service.memory > 60
                                            ? 'warning.main'
                                            : 'success.main',
                                      transition: 'width 0.3s ease',
                                    }}
                                  />
                                </Box>
                              </Box>
                              <Typography
                                variant='body2'
                                color='text.secondary'
                                sx={{ minWidth: 40 }}
                              >
                                {service.memory}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>{service.uptime}</TableCell>
                          <TableCell color='text.secondary'>{service.lastCheck}</TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      </DashboardTemplate>
    </PageContainer>
  );
};
export default MonitorDashboardPage;
