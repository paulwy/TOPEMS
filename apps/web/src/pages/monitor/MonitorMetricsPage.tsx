import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Cpu,
  HardDrive,
  Database,
  Wifi,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  LineChart,
  Gauge,
  Clock,
  Server,
  Zap,
} from 'lucide-react';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';
import type { StatCard, ChartConfig, DataTable, TableColumn } from '@/components/templates/StatsPageTemplate';
import { monitorApi } from '@/api/monitor';
import type { SystemMetrics, ApiPerformance, DatabaseMetrics } from '@/api/monitor';
import { useNotification } from '@/hooks/useNotification';
import { apiLogger } from '@/utils/logger';

export const MonitorMetricsPage: React.FC = () => {
  const { error: notifyError } = useNotification();
  const [timeRange, setTimeRange] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [apiPerformance, setApiPerformance] = useState<ApiPerformance[]>([]);
  const [databaseMetrics, setDatabaseMetrics] = useState<DatabaseMetrics | null>(null);

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [systemRes, apiRes, dbRes] = await Promise.all([
        monitorApi.getSystemMetrics(),
        monitorApi.getApiPerformance(),
        monitorApi.getDatabaseMetrics(),
      ]);

      if (systemRes.success && systemRes.data) {
        setSystemMetrics(systemRes.data);
      }
      if (apiRes.success && apiRes.data) {
        setApiPerformance(apiRes.data);
      }
      if (dbRes.success && dbRes.data) {
        setDatabaseMetrics(dbRes.data);
      }
    } catch (err: unknown) {
      apiLogger.error('加载性能指标数据失败:', err);
      notifyError('加载性能指标数据失败');
    } finally {
      setLoading(false);
    }
  };

  const statCards = useMemo<StatCard[]>(() => [
    {
      id: 'cpu-usage',
      title: 'CPU 使用率',
      value: systemMetrics ? `${systemMetrics.cpu_usage.toFixed(1)}%` : '-',
      icon: <Cpu size={24} />,
      gradient: ['#1976D2', '#1565C0'] as [string, string],
      trend: { value: 2.3, direction: 'down', label: '+2.3%' },
    },
    {
      id: 'memory-usage',
      title: '内存使用率',
      value: systemMetrics ? `${systemMetrics.memory_usage.toFixed(1)}%` : '-',
      icon: <Server size={24} />,
      gradient: ['#00C897', '#00A878'] as [string, string],
      trend: { value: 1.5, direction: 'down', label: '+1.5%' },
    },
    {
      id: 'disk-usage',
      title: '磁盘使用率',
      value: systemMetrics ? `${systemMetrics.disk_usage.toFixed(1)}%` : '-',
      icon: <HardDrive size={24} />,
      gradient: ['#F59E0B', '#D97706'] as [string, string],
      trend: { value: 0.8, direction: 'down', label: '+0.8%' },
    },
    {
      id: 'api-avg-response',
      title: 'API 平均响应',
      value: apiPerformance.length > 0
        ? `${Math.round(apiPerformance.reduce((acc, p) => acc + p.avg_response_time, 0) / apiPerformance.length)}ms`
        : '-',
      icon: <Zap size={24} />,
      gradient: ['#8B5CF6', '#7C3AED'] as [string, string],
      trend: { value: 5, direction: 'up', label: '-5ms' },
    },
  ], [systemMetrics, apiPerformance]);

  const charts = useMemo<ChartConfig[]>(() => [
    {
      id: 'system-metrics',
      title: '系统资源使用率',
      type: 'bar',
      dataKey: 'value',
      nameKey: 'name',
      data: systemMetrics ? [
        { name: 'CPU', value: systemMetrics.cpu_usage, fill: '#1976D2' },
        { name: '内存', value: systemMetrics.memory_usage, fill: '#00C897' },
        { name: '磁盘', value: systemMetrics.disk_usage, fill: '#F59E0B' },
      ] : [],
      height: 280,
    },
    {
      id: 'database-metrics',
      title: '数据库性能指标',
      type: 'bar',
      dataKey: 'value',
      nameKey: 'name',
      data: databaseMetrics ? [
        { name: '连接数', value: databaseMetrics.connections, fill: '#1976D2' },
        { name: '最大连接', value: databaseMetrics.max_connections, fill: '#00C897' },
        { name: '慢查询', value: databaseMetrics.slow_query_count, fill: '#EF4444' },
      ] : [],
      height: 280,
    },
  ], [systemMetrics, databaseMetrics]);

  const tables = useMemo<DataTable[]>(() => [
    {
      id: 'api-performance',
      title: 'API 接口性能',
      columns: [
        { id: 'endpoint', label: '接口地址', field: 'endpoint' },
        { id: 'method', label: '方法', field: 'method' },
        { id: 'avg_response_time', label: '平均响应(ms)', field: 'avg_response_time' },
        { id: 'p95_response_time', label: 'P95响应(ms)', field: 'p95_response_time' },
        { id: 'p99_response_time', label: 'P99响应(ms)', field: 'p99_response_time' },
        { id: 'request_count', label: '请求数', field: 'request_count' },
        { 
          id: 'error_rate', 
          label: '错误率', 
          field: 'error_rate', 
          render: (value: any) => `${(value as number).toFixed(2)}%` 
        },
      ],
      data: apiPerformance,
    },
  ], [apiPerformance]);

  const timeRangeOptions = [
    { label: '1小时', value: '1h' },
    { label: '24小时', value: '24h' },
    { label: '7天', value: '7d' },
    { label: '30天', value: '30d' },
  ];

  return (
    <StatsPageTemplate
      title='性能指标监控'
      subtitle='系统资源、API性能和数据库指标监控'
      statCards={statCards}
      statColumns={4}
      charts={charts}
      chartColumns={{ xs: 1, md: 2 }}
      tables={tables}
      loading={loading}
      timeRangeOptions={timeRangeOptions}
      timeRange={timeRange}
      onTimeRangeChange={setTimeRange}
      showTimeRange={true}
      showRefresh={true}
      onRefresh={loadData}
      showStatCards={true}
      showCharts={true}
      showTables={true}
      statCardDirection='row'
    />
  );
};

export default MonitorMetricsPage;
