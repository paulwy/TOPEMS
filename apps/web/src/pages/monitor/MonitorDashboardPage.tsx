import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Server,
  Database,
  Shield,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  HardDrive,
  Wifi,
  Zap,
} from 'lucide-react';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';
import type { StatCard, ChartConfig, DataTable, TableColumn } from '@/components/templates/StatsPageTemplate';
import { monitorApi } from '@/api/monitor';
import type { SystemMetrics, ServiceHealth, DatabaseMetrics } from '@/api/monitor';
import { useNotification } from '@/hooks/useNotification';
import { apiLogger } from '@/utils/logger';

export const MonitorDashboardPage: React.FC = () => {
  const { error: notifyError } = useNotification();
  const [timeRange, setTimeRange] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [serviceHealth, setServiceHealth] = useState<ServiceHealth[]>([]);
  const [databaseMetrics, setDatabaseMetrics] = useState<DatabaseMetrics | null>(null);

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [systemRes, serviceRes, dbRes] = await Promise.all([
        monitorApi.getSystemMetrics(),
        monitorApi.getServiceHealth(),
        monitorApi.getDatabaseMetrics(),
      ]);

      if (systemRes.success && systemRes.data) {
        setSystemMetrics(systemRes.data);
      }
      if (serviceRes.success && serviceRes.data) {
        setServiceHealth(serviceRes.data);
      }
      if (dbRes.success && dbRes.data) {
        setDatabaseMetrics(dbRes.data);
      }
    } catch (err: unknown) {
      apiLogger.error('加载监控仪表盘数据失败:', err);
      notifyError('加载监控仪表盘数据失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'healthy': return '正常';
      case 'degraded': return '降级';
      case 'unhealthy': return '异常';
      default: return status;
    }
  };

  const statCards = useMemo<StatCard[]>(() => [
    {
      id: 'system-health',
      title: '系统健康度',
      value: systemMetrics ? `${Math.round(100 - systemMetrics.cpu_usage * 0.5 - systemMetrics.memory_usage * 0.3)}%` : '-',
      icon: <Activity size={24} />,
      gradient: ['#00C897', '#00A878'] as [string, string],
      trend: { value: 2.3, direction: 'up', label: '+2.3%' },
    },
    {
      id: 'service-status',
      title: '服务正常率',
      value: serviceHealth.length > 0 
        ? `${Math.round((serviceHealth.filter((s) => s.status === 'healthy').length / serviceHealth.length) * 100)}%`
        : '-',
      icon: <Server size={24} />,
      gradient: ['#1976D2', '#1565C0'] as [string, string],
      trend: { value: 0.5, direction: 'up', label: '+0.5%' },
    },
    {
      id: 'response-time',
      title: '平均响应时间',
      value: serviceHealth.length > 0
        ? `${Math.round(serviceHealth.reduce((acc, s) => acc + s.latency, 0) / serviceHealth.length)}ms`
        : '-',
      icon: <Zap size={24} />,
      gradient: ['#8B5CF6', '#7C3AED'] as [string, string],
      trend: { value: 12, direction: 'down', label: '-12ms' },
    },
    {
      id: 'uptime',
      title: '系统可用性',
      value: systemMetrics ? '99.98%' : '-',
      icon: <Clock size={24} />,
      gradient: ['#F59E0B', '#D97706'] as [string, string],
      trend: { value: 0.02, direction: 'up', label: '+0.02%' },
    },
  ], [systemMetrics, serviceHealth]);

  const charts = useMemo<ChartConfig[]>(() => [
    {
      id: 'resource-usage',
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
      id: 'network-traffic',
      title: '网络流量',
      type: 'line',
      dataKey: 'value',
      nameKey: 'name',
      data: systemMetrics ? [
        { name: '入站', value: systemMetrics.network_in, stroke: '#1976D2' },
        { name: '出站', value: systemMetrics.network_out, stroke: '#00C897' },
      ] : [],
      height: 280,
    },
  ], [systemMetrics]);

  const tables = useMemo<DataTable[]>(() => [
    {
      id: 'service-health',
      title: '服务健康状态',
      columns: [
        { id: 'service_name', label: '服务名称', field: 'service_name' },
        { 
          id: 'status', 
          label: '状态', 
          field: 'status', 
          render: (value: any) => getStatusLabel(value as string) 
        },
        { id: 'latency', label: '延迟(ms)', field: 'latency' },
        { 
          id: 'error_rate', 
          label: '错误率', 
          field: 'error_rate', 
          render: (value: any) => `${(value as number).toFixed(2)}%` 
        },
        { 
          id: 'uptime_percentage', 
          label: '可用率', 
          field: 'uptime_percentage', 
          render: (value: any) => `${(value as number).toFixed(2)}%` 
        },
        { 
          id: 'last_checked', 
          label: '最后检查', 
          field: 'last_checked', 
          render: (value: any) => new Date(value as string).toLocaleTimeString('zh-CN') 
        },
      ],
      data: serviceHealth,
    },
  ], [serviceHealth]);

  const timeRangeOptions = [
    { label: '1小时', value: '1h' },
    { label: '24小时', value: '24h' },
    { label: '7天', value: '7d' },
    { label: '30天', value: '30d' },
  ];

  return (
    <StatsPageTemplate
      title='监控仪表盘'
      subtitle='实时监控系统运行状态和性能指标'
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

export default MonitorDashboardPage;
