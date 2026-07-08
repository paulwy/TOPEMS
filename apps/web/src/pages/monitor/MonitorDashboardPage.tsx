/**
 * 系统监控仪表盘页面
 *
 * @module pages/monitor
 * @path /monitor/dashboard
 */

import React, { useState, useMemo } from 'react';
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
import { useAppStore } from '../../store';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d';

const timeRangeOptions: { value: TimeRange; label: string }[] = [
  { value: '1h', label: '近1小时' },
  { value: '6h', label: '近6小时' },
  { value: '24h', label: '近24小时' },
  { value: '7d', label: '近7天' },
  { value: '30d', label: '近30天' },
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

const generateRandomData = (length: number, min: number, max: number): number[] => {
  return Array.from({ length }, () => Math.floor(Math.random() * (max - min + 1)) + min);
};

const MiniLineChart: React.FC<{
  data: number[];
  labels: string[];
  color?: string;
  height?: number;
}> = ({ data, labels, color = ct.primary.dark, height = 180 }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const width = 100;
  const chartHeight = 100;
  const padding = { top: 10, right: 10, bottom: 20, left: 30 };

  const points = data
    .map((value, index) => {
      const x = padding.left + (index / (data.length - 1)) * (width - padding.left - padding.right);
      const y = padding.top + chartHeight - padding.bottom - ((value - min) / range) * (chartHeight - padding.top - padding.bottom);
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
}> = ({ data, labels, color = ct.primary.dark, height = 180 }) => {
  const max = Math.max(...data);
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
  const total = data.reduce((sum, item) => sum + item.value, 0);
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
        <svg viewBox='0 0 100 100' width='100%' height='100%'>
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
            <Typography variant='body2' color='text.secondary'>
              {path.label}
            </Typography>
            <Typography variant='body2' sx={{ fontWeight: 600, ml: 'auto' }}>
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
  const addNotification = useAppStore((state) => state.addNotification);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [timeRangeAnchorEl, setTimeRangeAnchorEl] = useState<null | HTMLElement>(null);

  const timeLabels = useMemo(() => generateTimeLabels(timeRange), [timeRange]);

  const stats: StatCard[] = useMemo(() => [
    {
      id: 'online-services',
      title: '在线服务数',
      value: '12',
      unit: '个',
      icon: <Server size={20} />,
      change: 1,
      changeLabel: '较昨日',
      color: 'success',
      trend: generateRandomData(12, 8, 12),
    },
    {
      id: 'alerts',
      title: '告警数',
      value: '5',
      unit: '条',
      icon: <AlertTriangle size={20} />,
      change: -2,
      changeLabel: '较昨日',
      color: 'error',
      trend: generateRandomData(12, 3, 10),
    },
    {
      id: 'cpu-usage',
      title: 'CPU使用率',
      value: '68',
      unit: '%',
      icon: <Cpu size={20} />,
      change: 5,
      changeLabel: '较昨日',
      color: 'warning',
      progress: 68,
      progressLabel: '使用率',
      trend: generateRandomData(12, 50, 85),
    },
    {
      id: 'memory-usage',
      title: '内存使用率',
      value: '72',
      unit: '%',
      icon: <Zap size={20} />,
      change: 3,
      changeLabel: '较昨日',
      color: 'warning',
      progress: 72,
      progressLabel: '使用率',
      trend: generateRandomData(12, 60, 80),
    },
    {
      id: 'disk-usage',
      title: '磁盘使用率',
      value: '54',
      unit: '%',
      icon: <HardDrive size={20} />,
      change: 1,
      changeLabel: '较昨日',
      color: 'info',
      progress: 54,
      progressLabel: '使用率',
      trend: generateRandomData(12, 45, 60),
    },
    {
      id: 'network-throughput',
      title: '网络吞吐',
      value: '128',
      unit: 'MB/s',
      icon: <Activity size={20} />,
      change: 12,
      changeLabel: '较昨日',
      color: 'primary',
      trend: generateRandomData(12, 80, 150),
    },
    {
      id: 'db-connections',
      title: '数据库连接',
      value: '86',
      unit: '个',
      icon: <Database size={20} />,
      change: 8,
      changeLabel: '较昨日',
      color: 'secondary',
      trend: generateRandomData(12, 60, 100),
    },
    {
      id: 'api-response-time',
      title: 'API响应时间',
      value: '120',
      unit: 'ms',
      icon: <Clock size={20} />,
      change: -15,
      changeLabel: '较昨日',
      color: 'success',
      trend: generateRandomData(12, 80, 200),
    },
  ], []);

  const systemResourceData = useMemo(() => ({
    cpu: generateRandomData(timeLabels.length, 40, 85),
    memory: generateRandomData(timeLabels.length, 50, 80),
    disk: generateRandomData(timeLabels.length, 45, 65),
  }), [timeLabels]);

  const serviceHealthData = useMemo(() => [
    { label: '正常', value: 8, color: theme.palette.success.main },
    { label: '警告', value: 3, color: theme.palette.warning.main },
    { label: '异常', value: 1, color: theme.palette.error.main },
  ], [theme]);

  const alertDistributionData = useMemo(() => ({
    services: ['用户服务', '订单服务', '支付服务', '库存服务', '消息服务', '文件服务'],
    alerts: generateRandomData(6, 0, 8),
  }), []);

  const apiResponseTimeData = useMemo(() => ({
    avg: generateRandomData(timeLabels.length, 80, 200),
    p95: generateRandomData(timeLabels.length, 150, 350),
    p99: generateRandomData(timeLabels.length, 200, 500),
  }), [timeLabels]);

  const charts: ChartCard[] = useMemo(() => [
    {
      id: 'system-resource',
      title: '系统资源趋势',
      subtitle: 'CPU / 内存 / 磁盘使用率',
      type: 'line',
      chart: (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'primary.main' }} />
              <Typography variant='caption' color='text.secondary'>CPU</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'warning.main' }} />
              <Typography variant='caption' color='text.secondary'>内存</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'info.main' }} />
              <Typography variant='caption' color='text.secondary'>磁盘</Typography>
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
      title: '服务健康状态',
      subtitle: '服务运行状态分布',
      type: 'pie',
      chart: <MiniPieChart data={serviceHealthData} />,
    },
    {
      id: 'alert-distribution',
      title: '告警分布',
      subtitle: '各服务告警数量统计',
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
              <Typography key={index} variant='caption' color='text.secondary' sx={{ fontSize: '0.65rem' }}>
                {service.replace('服务', '')}
              </Typography>
            ))}
          </Box>
        </Box>
      ),
    },
    {
      id: 'api-response',
      title: 'API响应时间趋势',
      subtitle: '平均响应时间 / P95 / P99',
      type: 'line',
      chart: (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'success.main' }} />
              <Typography variant='caption' color='text.secondary'>平均</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'warning.main' }} />
              <Typography variant='caption' color='text.secondary'>P95</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'error.main' }} />
              <Typography variant='caption' color='text.secondary'>P99</Typography>
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
  ], [timeLabels, systemResourceData, serviceHealthData, alertDistributionData, apiResponseTimeData, theme]);

  const quickActions: QuickAction[] = useMemo(() => [
    {
      id: 'view-alerts',
      label: '查看告警',
      icon: <Bell size={20} />,
      color: 'error.light',
      description: '查看系统告警列表',
      onClick: () => {
        addNotification({
          type: 'info',
          message: '正在跳转到告警列表...',
        });
      },
    },
    {
      id: 'view-metrics',
      label: '查看指标',
      icon: <BarChart3 size={20} />,
      color: 'primary.light',
      description: '查看详细监控指标',
      onClick: () => {
        addNotification({
          type: 'info',
          message: '正在跳转到指标详情...',
        });
      },
    },
    {
      id: 'view-logs',
      label: '查看日志',
      icon: <FileText size={20} />,
      color: 'info.light',
      description: '查看系统运行日志',
      onClick: () => {
        addNotification({
          type: 'info',
          message: '正在跳转到日志中心...',
        });
      },
    },
    {
      id: 'alert-rules',
      label: '告警规则',
      icon: <Settings size={20} />,
      color: 'warning.light',
      description: '配置告警规则',
      onClick: () => {
        addNotification({
          type: 'info',
          message: '正在跳转到告警规则配置...',
        });
      },
    },
  ], [addNotification]);

  const recentAlerts: AlertItem[] = useMemo(() => [
    {
      id: '1',
      title: 'CPU使用率过高',
      severity: 'critical',
      service: '订单服务',
      time: '10分钟前',
      message: '订单服务CPU使用率达到92%，超过阈值85%',
    },
    {
      id: '2',
      title: '内存使用率告警',
      severity: 'warning',
      service: '用户服务',
      time: '25分钟前',
      message: '用户服务内存使用率达到78%，超过阈值75%',
    },
    {
      id: '3',
      title: '数据库连接数告警',
      severity: 'warning',
      service: '支付服务',
      time: '1小时前',
      message: '支付服务数据库连接数达到95，接近上限100',
    },
    {
      id: '4',
      title: 'API响应时间过长',
      severity: 'warning',
      service: '库存服务',
      time: '2小时前',
      message: '库存服务API平均响应时间超过300ms',
    },
    {
      id: '5',
      title: '磁盘空间不足',
      severity: 'critical',
      service: '文件服务',
      time: '3小时前',
      message: '文件服务磁盘使用率达到90%，请及时清理',
    },
    {
      id: '6',
      title: '服务重启',
      severity: 'info',
      service: '消息服务',
      time: '5小时前',
      message: '消息服务已自动重启恢复正常',
    },
  ], []);

  const recentItems: RecentItem[] = useMemo(() => recentAlerts.map((alert) => ({
    id: alert.id,
    title: alert.title,
    description: `${alert.service} · ${alert.message}`,
    time: alert.time,
    status: alert.severity === 'critical' ? 'error' : alert.severity === 'warning' ? 'warning' : 'info',
    icon: alert.severity === 'critical'
      ? <XCircle size={18} />
      : alert.severity === 'warning'
        ? <AlertTriangle size={18} />
        : <AlertCircle size={18} />,
  })), [recentAlerts]);

  const services: ServiceHealth[] = useMemo(() => [
    { id: '1', name: '用户服务', status: 'healthy', cpu: 45, memory: 62, uptime: '30天12小时', lastCheck: '1分钟前' },
    { id: '2', name: '订单服务', status: 'warning', cpu: 78, memory: 71, uptime: '15天8小时', lastCheck: '1分钟前' },
    { id: '3', name: '支付服务', status: 'healthy', cpu: 35, memory: 55, uptime: '45天3小时', lastCheck: '1分钟前' },
    { id: '4', name: '库存服务', status: 'healthy', cpu: 52, memory: 68, uptime: '20天6小时', lastCheck: '1分钟前' },
    { id: '5', name: '消息服务', status: 'healthy', cpu: 28, memory: 42, uptime: '60天10小时', lastCheck: '1分钟前' },
    { id: '6', name: '文件服务', status: 'error', cpu: 91, memory: 85, uptime: '5天2小时', lastCheck: '1分钟前' },
    { id: '7', name: '网关服务', status: 'healthy', cpu: 38, memory: 50, uptime: '90天4小时', lastCheck: '1分钟前' },
    { id: '8', name: '认证服务', status: 'warning', cpu: 65, memory: 72, uptime: '25天9小时', lastCheck: '1分钟前' },
    { id: '9', name: '日志服务', status: 'healthy', cpu: 42, memory: 58, uptime: '35天7小时', lastCheck: '1分钟前' },
    { id: '10', name: '监控服务', status: 'healthy', cpu: 30, memory: 45, uptime: '100天1小时', lastCheck: '1分钟前' },
  ], []);

  const handleTimeRangeClick = (event: React.MouseEvent<HTMLElement>) => {
    setTimeRangeAnchorEl(event.currentTarget);
  };

  const handleTimeRangeClose = () => {
    setTimeRangeAnchorEl(null);
  };

  const handleTimeRangeSelect = (range: TimeRange) => {
    setTimeRange(range);
    setTimeRangeAnchorEl(null);
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      addNotification({
        type: 'success',
        message: '监控数据已刷新',
      });
    }, 800);
  };

  const getStatusChip = (status: ServiceHealth['status']) => {
    const statusMap = {
      healthy: { label: '正常', color: 'success' as const, icon: <CheckCircle size={14} /> },
      warning: { label: '警告', color: 'warning' as const, icon: <AlertTriangle size={14} /> },
      error: { label: '异常', color: 'error' as const, icon: <XCircle size={14} /> },
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

  const timeRangeLabel = timeRangeOptions.find((opt) => opt.value === timeRange)?.label || '近24小时';

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
        recentTitle='最近告警'
        quickActionsTitle='快捷操作'
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
              <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
                服务健康状态
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip
                  label={`正常 ${services.filter((s) => s.status === 'healthy').length}`}
                  size='small'
                  color='success'
                  variant='outlined'
                />
                <Chip
                  label={`警告 ${services.filter((s) => s.status === 'warning').length}`}
                  size='small'
                  color='warning'
                  variant='outlined'
                />
                <Chip
                  label={`异常 ${services.filter((s) => s.status === 'error').length}`}
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
                    <TableCell>服务名称</TableCell>
                    <TableCell>状态</TableCell>
                    <TableCell>CPU使用率</TableCell>
                    <TableCell>内存使用率</TableCell>
                    <TableCell>运行时长</TableCell>
                    <TableCell>最后检查</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading
                    ? Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={index}>
                          {Array.from({ length: 6 }).map((_, cellIndex) => (
                            <TableCell key={cellIndex}>
                              <Box sx={{ width: 80, height: 20, bgcolor: 'grey.200', borderRadius: 1 }} />
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
                              message: `查看 ${service.name} 详情`,
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
                                      bgcolor: service.cpu > 80 ? 'error.main' : service.cpu > 60 ? 'warning.main' : 'success.main',
                                      transition: 'width 0.3s ease',
                                    }}
                                  />
                                </Box>
                              </Box>
                              <Typography variant='body2' color='text.secondary' sx={{ minWidth: 40 }}>
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
                                      bgcolor: service.memory > 80 ? 'error.main' : service.memory > 60 ? 'warning.main' : 'success.main',
                                      transition: 'width 0.3s ease',
                                    }}
                                  />
                                </Box>
                              </Box>
                              <Typography variant='body2' color='text.secondary' sx={{ minWidth: 40 }}>
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
