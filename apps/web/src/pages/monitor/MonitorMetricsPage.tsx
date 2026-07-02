/**
 * 指标监控页面
 *
 * @module pages/monitor
 * @path /monitor/metrics
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  BarChart3,
  Cpu,
  HardDrive,
  Server,
  Wifi,
  Activity,
  Zap,
  Clock,
  ChevronDown,
  Database,
  Layers,
  Box as BoxIcon,
  Network,
} from 'lucide-react';
import { Box, Tabs, Tab, Stack, Menu, MenuItem, Button, Chip } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

import { PageContainer } from '@/components/common';
import { DashboardTemplate, type StatCard, type ChartCard } from '@/components/templates';
import LineChartComponent from '../../components/charts/LineChart';
import { AreaChart } from '../../components/charts/AreaChart';
import { BarChartComponent } from '../../components/charts/BarChart';
import { useAppStore } from '../../store';
import { handleApiError, getErrorMessage } from '@/utils/errors';

type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d';
type MetricCategory = 'host' | 'service' | 'database' | 'middleware';
type ServiceType = 'all' | 'user' | 'order' | 'payment' | 'inventory' | 'gateway';

const timeRangeOptions: { value: TimeRange; label: string }[] = [
  { value: '1h', label: '近1小时' },
  { value: '6h', label: '近6小时' },
  { value: '24h', label: '近24小时' },
  { value: '7d', label: '近7天' },
  { value: '30d', label: '近30天' },
];

const metricCategoryTabs: { value: MetricCategory; label: string; icon: React.ReactNode }[] = [
  { value: 'host', label: '主机指标', icon: <Server size={16} /> },
  { value: 'service', label: '服务指标', icon: <BoxIcon size={16} /> },
  { value: 'database', label: '数据库指标', icon: <Database size={16} /> },
  { value: 'middleware', label: '中间件指标', icon: <Layers size={16} /> },
];

const serviceOptions: { value: ServiceType; label: string }[] = [
  { value: 'all', label: '全部服务' },
  { value: 'user', label: '用户服务' },
  { value: 'order', label: '订单服务' },
  { value: 'payment', label: '支付服务' },
  { value: 'inventory', label: '库存服务' },
  { value: 'gateway', label: '网关服务' },
];

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

const serviceNames = ['用户服务', '订单服务', '支付服务', '库存服务', '网关服务', '认证服务'];

const generateMultiServiceTrendData = (labels: string[], services: string[]) => {
  return labels.map((label, index) => {
    const item: Record<string, string | number> = { name: label };
    services.forEach((service, i) => {
      const baseValues = [45, 62, 38, 55, 70, 48];
      const base = baseValues[i] || 50;
      item[service] = base + Math.floor(Math.random() * 30) - 15;
    });
    return item;
  });
};

export const MonitorMetricsPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [timeRangeAnchorEl, setTimeRangeAnchorEl] = useState<null | HTMLElement>(null);
  const [serviceAnchorEl, setServiceAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedService, setSelectedService] = useState<ServiceType>('all');
  const [activeCategory, setActiveCategory] = useState<MetricCategory>('host');

  const timeLabels = useMemo(() => generateTimeLabels(timeRange), [timeRange]);

  const handleTimeRangeClick = (event: React.MouseEvent<HTMLElement>) => {
    setTimeRangeAnchorEl(event.currentTarget);
  };

  const handleTimeRangeClose = () => {
    setTimeRangeAnchorEl(null);
  };

  const handleTimeRangeSelect = (range: TimeRange) => {
    setTimeRange(range);
    handleTimeRangeClose();
    handleRefresh();
  };

  const handleServiceClick = (event: React.MouseEvent<HTMLElement>) => {
    setServiceAnchorEl(event.currentTarget);
  };

  const handleServiceClose = () => {
    setServiceAnchorEl(null);
  };

  const handleServiceSelect = (service: ServiceType) => {
    setSelectedService(service);
    handleServiceClose();
    handleRefresh();
  };

  const currentTimeRangeLabel =
    timeRangeOptions.find((o) => o.value === timeRange)?.label || '近24小时';
  const currentServiceLabel =
    serviceOptions.find((o) => o.value === selectedService)?.label || '全部服务';

  const handleRefresh = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      addNotification({
        message: '指标数据已刷新',
        type: 'success',
        duration: 3000,
      });
    }, 500);
  }, [addNotification]);

  const handleCategoryChange = (_event: React.SyntheticEvent, newValue: MetricCategory) => {
    setActiveCategory(newValue);
    handleRefresh();
  };

  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'cpu-usage',
        title: 'CPU 使用率',
        value: '68.5',
        unit: '%',
        icon: <Cpu size={20} />,
        change: 5.2,
        changeLabel: '较上周期',
        color: 'warning',
        progress: 68.5,
        progressLabel: '使用率',
        trend: generateRandomData(12, 50, 85),
      },
      {
        id: 'memory-usage',
        title: '内存使用率',
        value: '72.3',
        unit: '%',
        icon: <Server size={20} />,
        change: 3.1,
        changeLabel: '较上周期',
        color: 'warning',
        progress: 72.3,
        progressLabel: '使用率',
        trend: generateRandomData(12, 60, 80),
      },
      {
        id: 'disk-usage',
        title: '磁盘使用率',
        value: '54.7',
        unit: '%',
        icon: <HardDrive size={20} />,
        change: 1.8,
        changeLabel: '较上周期',
        color: 'info',
        progress: 54.7,
        progressLabel: '使用率',
        trend: generateRandomData(12, 45, 60),
      },
      {
        id: 'network-in',
        title: '网络流入',
        value: '128',
        unit: 'MB/s',
        icon: <Activity size={20} />,
        change: 12.5,
        changeLabel: '较上周期',
        color: 'primary',
        trend: generateRandomData(12, 80, 150),
      },
      {
        id: 'network-out',
        title: '网络流出',
        value: '96',
        unit: 'MB/s',
        icon: <Network size={20} />,
        change: 8.3,
        changeLabel: '较上周期',
        color: 'secondary',
        trend: generateRandomData(12, 60, 120),
      },
      {
        id: 'api-qps',
        title: 'API QPS',
        value: '2,856',
        unit: '',
        icon: <Zap size={20} />,
        change: 15.6,
        changeLabel: '较上周期',
        color: 'success',
        trend: generateRandomData(12, 2000, 3500),
      },
    ],
    []
  );

  const cpuTrendData = useMemo(
    () => generateMultiServiceTrendData(timeLabels, serviceNames.slice(0, 4)),
    [timeLabels]
  );

  const memoryTrendData = useMemo(
    () => generateMultiServiceTrendData(timeLabels, serviceNames.slice(0, 4)),
    [timeLabels]
  );

  const diskIOData = useMemo(
    () =>
      timeLabels.map((label) => ({
        name: label,
        读取: Math.floor(Math.random() * 100) + 50,
        写入: Math.floor(Math.random() * 80) + 30,
      })),
    [timeLabels]
  );

  const networkData = useMemo(
    () =>
      timeLabels.map((label) => ({
        name: label,
        流入: Math.floor(Math.random() * 150) + 80,
        流出: Math.floor(Math.random() * 120) + 60,
      })),
    [timeLabels]
  );

  const apiRequestData = useMemo(
    () =>
      serviceNames.map((service) => ({
        name: service,
        请求量: Math.floor(Math.random() * 5000) + 2000,
      })),
    []
  );

  const responseTimeData = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        name: `${i * 50}-${(i + 1) * 50}ms`,
        P50: Math.floor(Math.random() * 100) + 50,
        P90: Math.floor(Math.random() * 80) + 30,
        P99: Math.floor(Math.random() * 50) + 20,
      })),
    []
  );

  const charts: ChartCard[] = useMemo(
    () => [
      {
        id: 'cpu-trend',
        title: 'CPU 使用率趋势',
        subtitle: '多服务 CPU 使用率对比',
        chart: (
          <LineChartComponent
            data={cpuTrendData}
            xKey='name'
            yKeys={serviceNames.slice(0, 4).map((name, i) => ({
              key: name,
              name,
              color: ['primary.main', 'success.main', 'warning.main', 'error.main'][i],
            }))}
            height={280}
          />
        ),
        height: 360,
        type: 'line',
        onRefresh: handleRefresh,
      },
      {
        id: 'memory-trend',
        title: '内存使用率趋势',
        subtitle: '多服务内存使用率对比',
        chart: (
          <LineChartComponent
            data={memoryTrendData}
            xKey='name'
            yKeys={serviceNames.slice(0, 4).map((name, i) => ({
              key: name,
              name,
              color: ['secondary.main', '#06B6D4', '#EC4899', 'success.main'][i],
            }))}
            height={280}
          />
        ),
        height: 360,
        type: 'line',
        onRefresh: handleRefresh,
      },
      {
        id: 'disk-io',
        title: '磁盘 I/O',
        subtitle: '磁盘读写吞吐量',
        chart: (
          <AreaChart
            data={diskIOData}
            xKey='name'
            yKeys={[
              { key: '读取', name: '读取', color: 'primary.main' },
              { key: '写入', name: '写入', color: 'warning.main' },
            ]}
            height={280}
          />
        ),
        height: 360,
        type: 'area',
        onRefresh: handleRefresh,
      },
      {
        id: 'network-traffic',
        title: '网络流量',
        subtitle: '网络流入流出流量',
        chart: (
          <AreaChart
            data={networkData}
            xKey='name'
            yKeys={[
              { key: '流入', name: '流入', color: 'success.main' },
              { key: '流出', name: '流出', color: 'error.main' },
            ]}
            height={280}
          />
        ),
        height: 360,
        type: 'area',
        onRefresh: handleRefresh,
      },
      {
        id: 'api-requests',
        title: 'API 请求量',
        subtitle: '各服务 API 请求量对比',
        chart: (
          <ResponsiveContainer
            width='100%'
            height={280}
          >
            <BarChart data={apiRequestData}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis
                dataKey='name'
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip
                formatter={(value) => [`${value} 次`, '请求量'] as [string, string]}
                contentStyle={{
                  borderRadius: 8,
                  padding: 12,
                }}
              />
              <Bar
                dataKey='请求量'
                radius={[4, 4, 0, 0]}
              >
                {apiRequestData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={['primary.main', 'success.main', 'warning.main', 'error.main', 'secondary.main', '#06B6D4'][index]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ),
        height: 360,
        type: 'bar',
        onRefresh: handleRefresh,
      },
      {
        id: 'response-time',
        title: '响应时间分布',
        subtitle: 'P50 / P90 / P99 响应时间分布',
        chart: (
          <BarChartComponent
            data={responseTimeData}
            xKey='name'
            yKeys={[
              { key: 'P50', name: 'P50', color: 'success.main' },
              { key: 'P90', name: 'P90', color: 'warning.main' },
              { key: 'P99', name: 'P99', color: 'error.main' },
            ]}
            height={280}
          />
        ),
        height: 360,
        type: 'bar',
        onRefresh: handleRefresh,
      },
    ],
    [
      cpuTrendData,
      memoryTrendData,
      diskIOData,
      networkData,
      apiRequestData,
      responseTimeData,
      handleRefresh,
    ]
  );

  const headerContent = (
    <Stack
      direction='row'
      spacing={2}
      sx={{ alignItems: 'center', flexWrap: 'wrap' }}
    >
      <Button
        size='small'
        variant='outlined'
        endIcon={<ChevronDown size={16} />}
        onClick={handleTimeRangeClick}
        sx={{ textTransform: 'none' }}
      >
        {currentTimeRangeLabel}
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

      <Button
        size='small'
        variant='outlined'
        endIcon={<ChevronDown size={16} />}
        onClick={handleServiceClick}
        sx={{ textTransform: 'none' }}
      >
        {currentServiceLabel}
      </Button>
      <Menu
        anchorEl={serviceAnchorEl}
        open={Boolean(serviceAnchorEl)}
        onClose={handleServiceClose}
      >
        {serviceOptions.map((option) => (
          <MenuItem
            key={option.value}
            selected={selectedService === option.value}
            onClick={() => handleServiceSelect(option.value)}
          >
            {option.label}
          </MenuItem>
        ))}
      </Menu>
    </Stack>
  );

  const categoryTabs = (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
      <Tabs
        value={activeCategory}
        onChange={handleCategoryChange}
        variant='scrollable'
        scrollButtons='auto'
      >
        {metricCategoryTabs.map((tab) => (
          <Tab
            key={tab.value}
            value={tab.value}
            label={
              <Stack
                direction='row'
                spacing={1}
                sx={{ alignItems: 'center' }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </Stack>
            }
            sx={{ minHeight: 48 }}
          />
        ))}
      </Tabs>
    </Box>
  );

  return (
    <PageContainer
      title='指标监控'
      subtitle='全方位系统指标监控与性能分析'
      headerProps={{
        pageIcon: <BarChart3 size={20} />,
        pageGradient: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
        backButton: {
          href: '/monitor/dashboard',
          visible: true,
        },
        children: headerContent,
      }}
      padding={false}
      maxWidth={false}
    >
      {categoryTabs}
      <DashboardTemplate
        title=''
        subtitle=''
        loading={loading}
        stats={stats}
        charts={charts}
        onRefresh={handleRefresh}
        layout={{
          statsBreakpoints: { xs: 12, sm: 6, md: 4, lg: 4, xl: 4 },
          chartsBreakpoints: { xs: 12, sm: 12, md: 6, lg: 6, xl: 6 },
        }}
      />
    </PageContainer>
  );
};

export default MonitorMetricsPage;
