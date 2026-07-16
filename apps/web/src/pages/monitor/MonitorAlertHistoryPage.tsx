import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Chip,
  Button,
  Paper,
  Tooltip,
  IconButton,
  Card,
  CardContent,
  Stack,
} from '@mui/material';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Bell,
  Check,
  Eye,
  Filter,
  Download,
  RefreshCw,
  Info,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageContainer, Dialog } from '@/components/common';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { monitorApi } from '@/api/monitor';
import type { Alert, AlertQueryParams } from '@/api/monitor';
import { useNotification } from '@/hooks/useNotification';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';
import { MONITOR_PATHS } from '@/modules/monitor/config';
import { QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;

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

const MonitorAlertHistoryPage: React.FC = () => {
  const { error: notifyError, success: notifySuccess } = useNotification();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [metricFilter, setMetricFilter] = useState<string>('all');
  const [timeRange, setTimeRange] = useState('7d');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<AlertDetail | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);

  const alertsQuery = useQuery({
    queryKey: [...QUERY_KEYS.MONITOR.ALERTS, timeRange, severityFilter, statusFilter],
    queryFn: async () => {
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
      return {
        items: (response.data?.items ?? []) as AlertDetail[],
        total: response.data?.total ?? 0,
      };
    },
  });

  const alerts = alertsQuery.data?.items ?? [];
  const totalAlerts = alertsQuery.data?.total ?? 0;
  const loading = alertsQuery.isLoading;

  const loadAlerts = useCallback(() => {
    alertsQuery.refetch();
  }, [alertsQuery]);

  const acknowledgeMutation = useMutation({
    mutationFn: async (id: string) => monitorApi.acknowledgeAlert(id),
    onSuccess: () => {
      notifySuccess('告警已确认');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MONITOR.ALERTS });
    },
    onError: (err: unknown) => {
      apiLogger.error('确认告警失败:', err);
      notifyError('确认告警失败');
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => monitorApi.resolveAlert(id),
    onSuccess: () => {
      notifySuccess('告警已解决');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MONITOR.ALERTS });
    },
    onError: (err: unknown) => {
      apiLogger.error('解决告警失败:', err);
      notifyError('解决告警失败');
    },
  });

  const handleAcknowledge = useCallback(
    (id: string) => {
      acknowledgeMutation.mutate(id);
    },
    [acknowledgeMutation]
  );

  const handleResolve = useCallback(
    (id: string) => {
      resolveMutation.mutate(id);
    },
    [resolveMutation]
  );

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
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'error';
      case 'acknowledged':
        return 'warning';
      case 'resolved':
        return 'success';
      default:
        return 'default';
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

  const paginatedData = useMemo(() => {
    const start = page * pageSize;
    return filteredAlerts.slice(start, start + pageSize);
  }, [filteredAlerts, page, pageSize]);

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
    } catch (err: unknown) {
      apiLogger.error('导出失败:', err);
      notifyError('导出失败');
    }
  }, [filteredAlerts, notifySuccess, notifyError]);

  const stats = useMemo(
    () => [
      {
        id: 'total-alerts',
        title: '总告警数',
        value: totalAlerts || alerts.length,
        icon: <Bell size={20} />,
        color: 'primary' as const,
      },
      {
        id: 'critical-alerts',
        title: '严重告警',
        value: alerts.filter((a) => a.severity === 'critical').length,
        icon: <AlertTriangle size={20} />,
        color: 'error' as const,
      },
      {
        id: 'warning-alerts',
        title: '警告告警',
        value: alerts.filter((a) => a.severity === 'warning').length,
        icon: <AlertTriangle size={20} />,
        color: 'warning' as const,
      },
      {
        id: 'active-alerts',
        title: '未处理',
        value: alerts.filter((a) => a.status === 'active').length,
        icon: <Clock size={20} />,
        color: 'error' as const,
      },
      {
        id: 'resolved-alerts',
        title: '已解决',
        value: alerts.filter((a) => a.status === 'resolved').length,
        icon: <CheckCircle size={20} />,
        color: 'success' as const,
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
        icon: <Clock size={20} />,
        color: 'secondary' as const,
      },
    ],
    [alerts, totalAlerts]
  );

  const statsCards = useMemo(
    () => (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        {stats.map((item) => (
          <Card
            key={item.id}
            sx={{
              transition: 'all 0.2s',
              '&:hover': { boxShadow: 2 },
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack
                direction='row'
                spacing={1.5}
                sx={{ alignItems: 'center' }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1,
                    bgcolor: `${item.color}.light`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: `${item.color}.main`,
                  }}
                >
                  {item.icon}
                </Box>
                <Box>
                  <Typography
                    variant='h4'
                    sx={{ fontWeight: 700, lineHeight: 1.2 }}
                  >
                    {item.value}
                  </Typography>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {item.title}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>
    ),
    [stats]
  );

  const columns: ColumnDef<AlertDetail>[] = useMemo(
    () => [
      {
        id: 'severity',
        label: '级别',
        width: 100,
        render: (row) => (
          <Chip
            size='small'
            color={getSeverityColor(row.severity) as React.ComponentProps<typeof import('@mui/material/Chip').default>['color']}
            label={getSeverityLabel(row.severity)}
            variant='outlined'
          />
        ),
      },
      {
        id: 'title',
        label: '告警标题',
        minWidth: 200,
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant='body2'
              sx={{ fontWeight: 500 }}
            >
              {row.title}
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
      {
        id: 'service_name',
        label: '来源服务',
        width: 140,
      },
      {
        id: 'alert_type',
        label: '类型',
        width: 120,
      },
      {
        id: 'created_at',
        label: '触发时间',
        width: 160,
        render: (row) => new Date(row.created_at).toLocaleString('zh-CN'),
      },
      {
        id: 'status',
        label: '状态',
        width: 100,
        render: (row) => (
          <Chip
            size='small'
            color={getStatusColor(row.status) as React.ComponentProps<typeof import('@mui/material/Chip').default>['color']}
            label={getStatusLabel(row.status)}
            variant='outlined'
          />
        ),
      },
      {
        id: 'actions',
        label: '操作',
        align: 'right',
        width: 150,
        render: (row) => (
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
    []
  );

  const filters = useMemo(
    () => [
      {
        id: 'severity',
        label: '严重级别',
        type: 'select' as const,
        options: [
          { label: '全部级别', value: 'all' },
          { label: '严重', value: 'critical' },
          { label: '警告', value: 'warning' },
          { label: '信息', value: 'info' },
        ],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select' as const,
        options: [
          { label: '全部状态', value: 'all' },
          { label: '未处理', value: 'active' },
          { label: '已确认', value: 'acknowledged' },
          { label: '已解决', value: 'resolved' },
        ],
      },
    ],
    []
  );

  const headerContent = (
    <>
      {statsCards}
      <Box sx={{ px: { xs: 2, sm: 3 }, pb: 3 }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
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
    </>
  );

  const handleFilterChange = (filters: Record<string, unknown>) => {
    if (typeof filters.severity === 'string') {
      setSeverityFilter(filters.severity);
    }
    if (typeof filters.status === 'string') {
      setStatusFilter(filters.status);
    }
    setPage(0);
  };

  return (
    <PageContainer
      title='告警历史'
      subtitle='查看和处理所有告警记录'
      headerProps={{
        pageIcon: <Clock style={{ width: 20, height: 20 }} />,
        backButton: {
          href: MONITOR_PATHS.dashboard,
        },
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={paginatedData}
        loading={loading}
        searchable
        searchPlaceholder='搜索告警标题、服务或类型...'
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        filters={filters}
        filtersValue={{
          severity: severityFilter,
          status: statusFilter,
        }}
        onFilterChange={handleFilterChange}
        pagination={{
          page,
          pageSize,
          total: filteredAlerts.length,
          onPageChange: setPage,
        }}
        actions={[
          {
            label: '刷新',
            icon: <RefreshCw size={16} />,
            onClick: loadAlerts,
            variant: 'outlined',
          },
          {
            label: '导出',
            icon: <Download size={16} />,
            onClick: handleExport,
            variant: 'outlined',
          },
        ]}
        onRefresh={loadAlerts}
        headerContent={headerContent}
        emptyMessage='暂无告警数据'
        getRowId={(row) => row.id}
      />

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
            <Paper
              sx={{
                p: 2,
                bgcolor: `${getSeverityColor(selectedAlert.severity)}.50`,
                borderColor: getSeverityColor(selectedAlert.severity),
                border: 1,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Chip
                  label={getSeverityLabel(selectedAlert.severity)}
                  size='small'
                  color={getSeverityColor(selectedAlert.severity) as React.ComponentProps<typeof import('@mui/material/Chip').default>['color']}
                />
                <Chip
                  label={getStatusLabel(selectedAlert.status)}
                  size='small'
                  color={getStatusColor(selectedAlert.status) as React.ComponentProps<typeof import('@mui/material/Chip').default>['color']}
                  variant='outlined'
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

            {selectedAlert.status === 'resolved' && (
              <>
                <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
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
