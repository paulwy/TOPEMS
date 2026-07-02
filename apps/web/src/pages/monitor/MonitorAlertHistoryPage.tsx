import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Chip,
  Button,
  Paper,
  Tooltip,
  Alert as MuiAlert,
  Divider,
  IconButton,
} from '@mui/material';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Bell,
  BellOff,
  Check,
  XCircle,
  Info,
  Filter,
  Download,
  RefreshCw,
  Eye,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react';
import { PageContainer, Dialog } from '@/components/common';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';
import type { StatCard, ChartConfig, DataTable } from '@/components/templates/StatsPageTemplate';
import { monitorApi } from '@/api/monitor';
import type { Alert, AlertQueryParams } from '@/api/monitor';
import { useNotification } from '@/hooks/useNotification';
import { apiLogger } from '@/utils/logger';

// ============ 类型 ============

interface AlertDetail extends Alert {
  resolved_by?: string;
  resolution_note?: string;
  acknowledged_by?: string;
}

const METRIC_FILTER_OPTIONS = [
  { label: 'CPU', value: 'cpu' },
  { label: '内存', value: 'memory' },
  { label: '磁盘', value: 'disk' },
  { label: '网络', value: 'network' },
  { label: 'API', value: 'api' },
  { label: '数据库', value: 'database' },
];

// ============ 告警历史页面 ============

const MonitorAlertHistoryPage: React.FC = () => {
  const { error: notifyError, success: notifySuccess } = useNotification();
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [metricFilter, setMetricFilter] = useState<string>('all');
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<AlertDetail[]>([]);
  const [totalAlerts, setTotalAlerts] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<AlertDetail | null>(null);

  useEffect(() => {
    loadAlerts();
  }, [timeRange, severityFilter, statusFilter]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const params: AlertQueryParams = {
        pagesize: 100,
      };
      if (severityFilter !== 'all') {
        params.severity = severityFilter;
      }
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const response = await monitorApi.listAlerts(params);
      if (response.success && response.data) {
        setAlerts(response.data.items as AlertDetail[]);
        setTotalAlerts(response.data.total);
      }
    } catch (err: any) {
      apiLogger.error('加载告警历史数据失败:', err);
      notifyError('加载告警历史数据失败');
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'error.main';
      case 'warning':
        return 'warning.main';
      case 'info':
        return 'primary.main';
      default:
        return 'grey.500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'error.main';
      case 'acknowledged':
        return 'warning.main';
      case 'resolved':
        return 'success.main';
      default:
        return 'grey.500';
    }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      await monitorApi.acknowledgeAlert(id);
      notifySuccess('告警已确认');
      loadAlerts();
    } catch (err: any) {
      apiLogger.error('确认告警失败:', err);
      notifyError('确认告警失败');
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await monitorApi.resolveAlert(id);
      notifySuccess('告警已解决');
      loadAlerts();
    } catch (err: any) {
      apiLogger.error('解决告警失败:', err);
      notifyError('解决告警失败');
    }
  };

  const handleViewDetail = (alert: AlertDetail) => {
    setSelectedAlert(alert);
    setDetailOpen(true);
  };

  const filteredAlerts = useMemo(() => {
    let result = alerts;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (alert) =>
          alert.title.toLowerCase().includes(term) ||
          alert.service_name.toLowerCase().includes(term) ||
          alert.alert_type.toLowerCase().includes(term)
      );
    }
    if (metricFilter !== 'all') {
      result = result.filter((a) => a.alert_type.toLowerCase().includes(metricFilter));
    }
    return result;
  }, [alerts, searchTerm, metricFilter]);

  const handleExport = useCallback(() => {
    try {
      const headers = ['告警标题', '级别', '状态', '来源服务', '类型', '触发时间', '解决时间'];
      const rows = filteredAlerts.map((a) => [
        a.title,
        getSeverityLabel(a.severity),
        getStatusLabel(a.status),
        a.service_name,
        a.alert_type,
        new Date(a.created_at).toLocaleString('zh-CN'),
        a.resolved_at ? new Date(a.resolved_at).toLocaleString('zh-CN') : '-',
      ]);
      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `告警历史_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      notifySuccess('导出成功');
    } catch (err: any) {
      apiLogger.error('导出失败:', err);
      notifyError('导出失败');
    }
  }, [filteredAlerts, notifySuccess, notifyError]);

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
        id: 'warning-alerts',
        title: '警告告警',
        value: alerts.filter((a) => a.severity === 'warning').length,
        icon: <AlertTriangle size={24} />,
        gradient: ['#F59E0B', '#D97706'] as [string, string],
      },
      {
        id: 'active-alerts',
        title: '未处理',
        value: alerts.filter((a) => a.status === 'active').length,
        icon: <Clock size={24} />,
        gradient: ['#EF4444', '#DC2626'] as [string, string],
      },
      {
        id: 'resolved-alerts',
        title: '已解决',
        value: alerts.filter((a) => a.status === 'resolved').length,
        icon: <CheckCircle size={24} />,
        gradient: ['#00C897', '#00A878'] as [string, string],
      },
      {
        id: 'avg-resolution',
        title: '平均解决时间',
        value: alerts.some((a) => a.resolved_at)
          ? `${Math.round(
              alerts
                .filter((a) => a.resolved_at)
                .reduce((acc, a) => {
                  const created = new Date(a.created_at).getTime();
                  const resolved = new Date(a.resolved_at!).getTime();
                  return acc + (resolved - created) / 60000;
                }, 0) / alerts.filter((a) => a.resolved_at).length
            )}分钟`
          : '-',
        icon: <Clock size={24} />,
        gradient: ['#8B5CF6', '#7C3AED'] as [string, string],
      },
    ],
    [alerts, totalAlerts]
  );

  const charts = useMemo<ChartConfig[]>(
    () => [
      {
        id: 'alert-trend',
        title: '告警趋势',
        type: 'line',
        dataKey: 'value',
        nameKey: 'name',
        data: [
          {
            name: '严重',
            value: alerts.filter((a) => a.severity === 'critical').length,
            stroke: 'error.main',
          },
          {
            name: '警告',
            value: alerts.filter((a) => a.severity === 'warning').length,
            stroke: 'warning.main',
          },
          {
            name: '信息',
            value: alerts.filter((a) => a.severity === 'info').length,
            stroke: 'primary.main',
          },
        ],
        height: 280,
      },
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
            color: 'error.main',
          },
          {
            name: '警告',
            value: alerts.filter((a) => a.severity === 'warning').length,
            color: 'warning.main',
          },
          {
            name: '信息',
            value: alerts.filter((a) => a.severity === 'info').length,
            color: 'primary.main',
          },
        ].filter((d) => d.value > 0),
        height: 280,
      },
    ],
    [alerts]
  );

  const tables = useMemo<DataTable[]>(
    () => [
      {
        id: 'alert-history',
        title: '告警历史记录',
        columns: [
          {
            id: 'severity',
            label: '级别',
            field: 'severity',
            render: (value: any) => (
              <Chip
                size='small'
                label={getSeverityLabel(value as string)}
                sx={{
                  fontWeight: 500,
                  bgcolor: `${getSeverityColor(value as string)}18`,
                  color: getSeverityColor(value as string),
                  border: `1px solid ${getSeverityColor(value as string)}40`,
                }}
              />
            ),
          },
          {
            id: 'title',
            label: '告警标题',
            field: 'title',
            render: (value: any, row: AlertDetail) => (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 500 }}
                >
                  {value as string}
                </Typography>
                <Tooltip title='查看详情'>
                  <IconButton
                    size='small'
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewDetail(row);
                    }}
                  >
                    <Eye size={14} />
                  </IconButton>
                </Tooltip>
              </Box>
            ),
          },
          { id: 'service_name', label: '来源服务', field: 'service_name' },
          { id: 'alert_type', label: '类型', field: 'alert_type' },
          {
            id: 'created_at',
            label: '触发时间',
            field: 'created_at',
            render: (value: any) => new Date(value as string).toLocaleString('zh-CN'),
          },
          {
            id: 'status',
            label: '状态',
            field: 'status',
            render: (value: any) => (
              <Chip
                size='small'
                label={getStatusLabel(value as string)}
                sx={{
                  fontWeight: 500,
                  bgcolor: `${getStatusColor(value as string)}18`,
                  color: getStatusColor(value as string),
                  border: `1px solid ${getStatusColor(value as string)}40`,
                }}
              />
            ),
          },
          {
            id: 'actions',
            label: '操作',
            field: '',
            render: (value: any, row: AlertDetail) => (
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {row.status === 'active' && (
                  <Tooltip title='确认告警'>
                    <Button
                      size='small'
                      variant='outlined'
                      color='warning'
                      startIcon={<Check size={14} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAcknowledge(row.id);
                      }}
                    >
                      确认
                    </Button>
                  </Tooltip>
                )}
                {row.status === 'acknowledged' && (
                  <Tooltip title='解决告警'>
                    <Button
                      size='small'
                      variant='contained'
                      color='success'
                      startIcon={<CheckCircle size={14} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResolve(row.id);
                      }}
                    >
                      解决
                    </Button>
                  </Tooltip>
                )}
              </Box>
            ),
          },
        ],
        data: filteredAlerts,
        loading,
      },
    ],
    [filteredAlerts, loading]
  );

  const timeRangeOptions = [
    { label: '1小时', value: '1h' },
    { label: '24小时', value: '24h' },
    { label: '7天', value: '7d' },
    { label: '30天', value: '30d' },
  ];

  return (
    <PageContainer
      title='告警历史'
      subtitle='查看和处理所有告警记录'
      headerProps={{
        pageIcon: <Clock style={{ width: 20, height: 20 }} />,
        pageGradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
      }}
    >
      <StatsPageTemplate
        title='告警历史'
        subtitle={`共 ${filteredAlerts.length} 条告警记录`}
        statCards={statCards}
        statColumns={3}
        charts={charts}
        chartColumns={{ xs: 1, md: 2 }}
        tables={tables}
        loading={loading}
        timeRangeOptions={timeRangeOptions}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        search={{
          value: searchTerm,
          onChange: setSearchTerm,
          placeholder: '搜索告警标题、服务或类型...',
        }}
        showTimeRange={true}
        showSearch={true}
        showExport={true}
        onExport={handleExport}
        exportText='导出告警'
        showRefresh={true}
        onRefresh={loadAlerts}
        showStatCards={true}
        showCharts={true}
        showTables={true}
        statCardDirection='row'
        customToolbar={
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {/* 级别筛选 */}
            {['all', 'critical', 'warning', 'info'].map((value) => (
              <Chip
                key={value}
                label={value === 'all' ? '全部级别' : getSeverityLabel(value)}
                size='small'
                variant={severityFilter === value ? 'filled' : 'outlined'}
                color={severityFilter === value ? 'primary' : 'default'}
                onClick={() => setSeverityFilter(value)}
                icon={
                  value === 'critical' ? (
                    <AlertTriangle size={14} />
                  ) : value === 'warning' ? (
                    <AlertTriangle size={14} />
                  ) : value === 'info' ? (
                    <Info size={14} />
                  ) : undefined
                }
              />
            ))}
            <Divider
              orientation='vertical'
              flexItem
              sx={{ mx: 0.5 }}
            />
            {/* 状态筛选 */}
            {['all', 'active', 'acknowledged', 'resolved'].map((value) => (
              <Chip
                key={value}
                label={value === 'all' ? '全部状态' : getStatusLabel(value)}
                size='small'
                variant={statusFilter === value ? 'filled' : 'outlined'}
                color={statusFilter === value ? 'secondary' : 'default'}
                onClick={() => setStatusFilter(value)}
              />
            ))}
            <Divider
              orientation='vertical'
              flexItem
              sx={{ mx: 0.5 }}
            />
            {/* 指标筛选 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                指标:
              </Typography>
              {METRIC_FILTER_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  size='small'
                  variant={metricFilter === opt.value ? 'filled' : 'outlined'}
                  color={metricFilter === opt.value ? 'info' : 'default'}
                  onClick={() => setMetricFilter(metricFilter === opt.value ? 'all' : opt.value)}
                />
              ))}
            </Box>
          </Box>
        }
      />

      {/* 告警详情对话框 */}
      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title='告警详情'
        maxWidth='md'
        actions={
          <Box sx={{ display: 'flex', gap: 1 }}>
            {selectedAlert?.status === 'active' && (
              <Button
                variant='outlined'
                color='warning'
                startIcon={<Check size={16} />}
                onClick={() => {
                  if (selectedAlert) {
                    handleAcknowledge(selectedAlert.id);
                    setDetailOpen(false);
                  }
                }}
              >
                确认告警
              </Button>
            )}
            {selectedAlert?.status === 'acknowledged' && (
              <Button
                variant='contained'
                color='success'
                startIcon={<CheckCircle size={16} />}
                onClick={() => {
                  if (selectedAlert) {
                    handleResolve(selectedAlert.id);
                    setDetailOpen(false);
                  }
                }}
              >
                解决告警
              </Button>
            )}
            <Button
              variant='outlined'
              onClick={() => setDetailOpen(false)}
            >
              关闭
            </Button>
          </Box>
        }
      >
        {selectedAlert && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {/* 告警概要 */}
            <Paper
              sx={{
                p: 2,
                bgcolor: `${getSeverityColor(selectedAlert.severity)}08`,
                borderColor: getSeverityColor(selectedAlert.severity),
                border: 1,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Chip
                  label={getSeverityLabel(selectedAlert.severity)}
                  size='small'
                  sx={{
                    fontWeight: 600,
                    bgcolor: getSeverityColor(selectedAlert.severity),
                    color: '#fff',
                  }}
                />
                <Chip
                  label={getStatusLabel(selectedAlert.status)}
                  size='small'
                  sx={{
                    fontWeight: 500,
                    bgcolor: `${getStatusColor(selectedAlert.status)}18`,
                    color: getStatusColor(selectedAlert.status),
                    border: `1px solid ${getStatusColor(selectedAlert.status)}40`,
                  }}
                />
              </Box>
              <Typography
                variant='h6'
                sx={{ fontWeight: 600 }}
              >
                {selectedAlert.title}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ mt: 0.5 }}
              >
                {selectedAlert.message}
              </Typography>
            </Paper>

            {/* 告警信息 */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 2,
              }}
            >
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  来源服务
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 500 }}
                >
                  {selectedAlert.service_name}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  告警类型
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 500 }}
                >
                  {selectedAlert.alert_type}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  触发时间
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 500 }}
                >
                  {new Date(selectedAlert.created_at).toLocaleString('zh-CN')}
                </Typography>
              </Box>
              {selectedAlert.acknowledged_at && (
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    确认时间
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {new Date(selectedAlert.acknowledged_at).toLocaleString('zh-CN')}
                  </Typography>
                </Box>
              )}
              {selectedAlert.resolved_at && (
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    解决时间
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {new Date(selectedAlert.resolved_at).toLocaleString('zh-CN')}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* 解决信息 */}
            {selectedAlert.status === 'resolved' && (
              <>
                <Divider />
                <Box>
                  <Typography
                    variant='subtitle2'
                    sx={{ mb: 1, fontWeight: 600 }}
                  >
                    解决信息
                  </Typography>
                  {selectedAlert.resolved_by && (
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      解决人: {selectedAlert.resolved_by}
                    </Typography>
                  )}
                  {selectedAlert.resolution_note && (
                    <Paper sx={{ p: 1.5, mt: 1, bgcolor: 'success.50' }}>
                      <Typography variant='body2'>{selectedAlert.resolution_note}</Typography>
                    </Paper>
                  )}
                </Box>
              </>
            )}
          </Box>
        )}
      </Dialog>
    </PageContainer>
  );
};

export default MonitorAlertHistoryPage;
