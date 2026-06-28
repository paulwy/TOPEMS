import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Bell,
  BellOff,
  Mail,
  Smartphone,
} from 'lucide-react';
import { PageContainer } from '@/components/common';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';
import type {
  StatCard,
  ChartConfig,
  DataTable,
  TableColumn,
} from '@/components/templates/StatsPageTemplate';
import { monitorApi } from '@/api/monitor';
import type { Alert, AlertQueryParams } from '@/api/monitor';
import { useNotification } from '@/hooks/useNotification';
import { apiLogger } from '@/utils/logger';

interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: string;
  threshold: string;
  severity: 'critical' | 'warning' | 'info';
  enabled: boolean;
  channels: string[];
}

export const MonitorAlertsPage: React.FC = () => {
  const { error: notifyError, success: notifySuccess } = useNotification();
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeRange, setTimeRange] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [totalAlerts, setTotalAlerts] = useState(0);

  const alertRules: AlertRule[] = [
    {
      id: 'R001',
      name: 'CPU 高使用率告警',
      metric: 'CPU',
      condition: '>',
      threshold: '85%',
      severity: 'critical',
      enabled: true,
      channels: ['推送', '邮件'],
    },
    {
      id: 'R002',
      name: '内存使用率告警',
      metric: '内存',
      condition: '>',
      threshold: '90%',
      severity: 'warning',
      enabled: true,
      channels: ['推送'],
    },
    {
      id: 'R003',
      name: '磁盘空间告警',
      metric: '磁盘',
      condition: '>',
      threshold: '80%',
      severity: 'critical',
      enabled: true,
      channels: ['推送', '邮件'],
    },
    {
      id: 'R004',
      name: 'API 响应时间告警',
      metric: 'API响应',
      condition: '>',
      threshold: '500ms',
      severity: 'warning',
      enabled: false,
      channels: ['邮件'],
    },
  ];

  useEffect(() => {
    loadAlerts();
  }, [timeRange, severityFilter, statusFilter]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const params: AlertQueryParams = {
        page_size: 100,
      };
      if (severityFilter !== 'all') {
        params.severity = severityFilter;
      }
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const response = await monitorApi.listAlerts(params);
      if (response.success && response.data) {
        setAlerts(response.data.items);
        setTotalAlerts(response.data.total);
      }
    } catch (err: unknown) {
      apiLogger.error('加载告警数据失败:', err);
      notifyError('加载告警数据失败');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '严重';
      case 'warning':
        return '警告';
      case 'info':
        return '信息';
      default:
        return severity;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return '未处理';
      case 'acknowledged':
        return '已确认';
      case 'resolved':
        return '已解决';
      default:
        return status;
    }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      await monitorApi.acknowledgeAlert(id);
      notifySuccess('告警已确认');
      loadAlerts();
    } catch (err: unknown) {
      apiLogger.error('确认告警失败:', err);
      notifyError('确认告警失败');
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await monitorApi.resolveAlert(id);
      notifySuccess('告警已解决');
      loadAlerts();
    } catch (err: unknown) {
      apiLogger.error('解决告警失败:', err);
      notifyError('解决告警失败');
    }
  };

  const filteredAlerts = useMemo(() => {
    if (!searchTerm) return alerts;
    return alerts.filter(
      (alert) =>
        alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.service_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [alerts, searchTerm]);

  const statCards = useMemo<StatCard[]>(
    () => [
      {
        id: 'total-alerts',
        title: '总告警数',
        value: totalAlerts || alerts.length,
        icon: <Bell size={24} />,
        gradient: ['#1976D2', '#1565C0'] as [string, string],
      },
      {
        id: 'critical-alerts',
        title: '严重告警',
        value: alerts.filter((a) => a.severity === 'critical').length,
        icon: <AlertTriangle size={24} />,
        gradient: ['#EF4444', '#DC2626'] as [string, string],
      },
      {
        id: 'pending-alerts',
        title: '待处理',
        value: alerts.filter((a) => a.status === 'active').length,
        icon: <Clock size={24} />,
        gradient: ['#F59E0B', '#D97706'] as [string, string],
      },
      {
        id: 'resolved-alerts',
        title: '已解决',
        value: alerts.filter((a) => a.status === 'resolved').length,
        icon: <CheckCircle size={24} />,
        gradient: ['#00C897', '#00A878'] as [string, string],
      },
    ],
    [alerts, totalAlerts]
  );

  const charts = useMemo<ChartConfig[]>(
    () => [
      {
        id: 'alert-severity-distribution',
        title: '告警级别分布',
        type: 'pie',
        dataKey: 'value',
        nameKey: 'name',
        data: [
          {
            name: '严重',
            value: alerts.filter((a) => a.severity === 'critical').length,
            color: '#ef4444',
          },
          {
            name: '警告',
            value: alerts.filter((a) => a.severity === 'warning').length,
            color: '#eab308',
          },
          {
            name: '信息',
            value: alerts.filter((a) => a.severity === 'info').length,
            color: '#3b82f6',
          },
        ].filter((d) => d.value > 0),
        height: 250,
      },
      {
        id: 'alert-status-distribution',
        title: '告警状态分布',
        type: 'pie',
        dataKey: 'value',
        nameKey: 'name',
        data: [
          {
            name: '未处理',
            value: alerts.filter((a) => a.status === 'active').length,
            color: '#ef4444',
          },
          {
            name: '已确认',
            value: alerts.filter((a) => a.status === 'acknowledged').length,
            color: '#eab308',
          },
          {
            name: '已解决',
            value: alerts.filter((a) => a.status === 'resolved').length,
            color: '#22c55e',
          },
        ].filter((d) => d.value > 0),
        height: 250,
      },
    ],
    [alerts]
  );

  const tables = useMemo<DataTable[]>(
    () => [
      {
        id: 'alert-history',
        title: '告警历史',
        columns: [
          { id: 'title', label: '告警标题', field: 'title' },
          {
            id: 'severity',
            label: '级别',
            field: 'severity',
            render: (value) => getSeverityLabel(value as string),
          },
          { id: 'service_name', label: '来源服务', field: 'service_name' },
          { id: 'alert_type', label: '类型', field: 'alert_type' },
          {
            id: 'created_at',
            label: '时间',
            field: 'created_at',
            render: (value) => new Date(value as string).toLocaleString('zh-CN'),
          },
          {
            id: 'status',
            label: '状态',
            field: 'status',
            render: (value) => getStatusLabel(value as string),
          },
        ],
        data: filteredAlerts,
        loading,
      },
      {
        id: 'alert-rules',
        title: '告警规则',
        columns: [
          { id: 'name', label: '规则名称', field: 'name' },
          { id: 'metric', label: '指标', field: 'metric' },
          { id: 'condition', label: '条件', field: 'condition' },
          { id: 'threshold', label: '阈值', field: 'threshold' },
          {
            id: 'severity',
            label: '级别',
            field: 'severity',
            render: (value) => getSeverityLabel(value as string),
          },
          {
            id: 'enabled',
            label: '状态',
            field: 'enabled',
            render: (value) => (value ? '启用' : '停用'),
          },
        ],
        data: alertRules,
      },
    ],
    [filteredAlerts, alertRules, loading]
  );

  const timeRangeOptions = [
    { label: '1小时', value: '1h' },
    { label: '24小时', value: '24h' },
    { label: '7天', value: '7d' },
    { label: '30天', value: '30d' },
  ];

  return (
    <PageContainer padding={false}>
      <StatsPageTemplate
        title='告警通知管理'
        subtitle='管理告警规则和查看告警历史记录'
        statCards={statCards}
        statColumns={4}
        charts={charts}
        chartColumns={{ xs: 1, md: 2 }}
        tables={tables}
        loading={loading}
        timeRangeOptions={timeRangeOptions}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        search={{ value: searchTerm, onChange: setSearchTerm, placeholder: '搜索告警...' }}
        showTimeRange={true}
        showSearch={true}
        showExport={true}
        showRefresh={true}
        onRefresh={loadAlerts}
        exportText='导出告警'
        showStatCards={true}
        showCharts={true}
        showTables={true}
        statCardDirection='row'
      />
    </PageContainer>
  );
};

export default MonitorAlertsPage;
