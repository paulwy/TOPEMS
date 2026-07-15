import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Stack,
  Tabs,
  Tab,
  Card,
  CardContent,
  Avatar,
  Button,
} from '@mui/material';
import { MONITOR_PATHS } from '@/modules/monitor/config';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Eye,
  Download,
  RefreshCw,
  Bell,
  Clock,
  Server,
  Ban,
  CheckSquare,
} from 'lucide-react';

import { useNotificationStore } from '../../store';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { extractErrorMessage } from '@/utils/errors';
import { PageContainer, ConfirmDialog } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { monitorApi, alertCrudApi, type Alert } from '@/api/monitor';
import { useCrudOperations } from '@/hooks/useCrudQueries';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const ct = designTokens.colors;

type AlertSeverity = 'critical' | 'warning' | 'info';
type AlertStatus = 'active' | 'acknowledged' | 'resolved';
type TabType = 'all' | 'critical' | 'warning' | 'info' | 'resolved';

const SEVERITY_LABELS: Record<AlertSeverity, string> = {
  critical: '严重',
  warning: '警告',
  info: '通知',
};

const SEVERITY_COLORS: Record<AlertSeverity, 'error' | 'warning' | 'info'> = {
  critical: 'error',
  warning: 'warning',
  info: 'info',
};

const STATUS_LABELS: Record<AlertStatus, string> = {
  active: '活动',
  acknowledged: '已确认',
  resolved: '已解决',
};

const STATUS_COLORS: Record<AlertStatus, 'error' | 'warning' | 'success'> = {
  active: 'error',
  acknowledged: 'warning',
  resolved: 'success',
};

const SERVICE_OPTIONS = [{ label: '全部服务', value: 'all' }];

const getSeverityIcon = (severity: AlertSeverity) => {
  switch (severity) {
    case 'critical':
      return <AlertCircle size={18} />;
    case 'warning':
      return <AlertTriangle size={18} />;
    case 'info':
      return <Info size={18} />;
  }
};

export const MonitorAlertsPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');

  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [batchAcknowledgeDialogOpen, setBatchAcknowledgeDialogOpen] = useState(false);
  const [batchResolveDialogOpen, setBatchResolveDialogOpen] = useState(false);

  const {
    data: alerts,
    loading,
    error,
    pagination,
    fetch,
    refresh,
  } = useCrudOperations<Alert>({
    api: alertCrudApi,
    queryKey: 'monitor-alerts',
    defaultPageSize: 10,
    pageParamName: 'page',
    pageSizeParamName: 'pagesize',
    autoFetch: true,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) => monitorApi.acknowledgeAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitor-alerts'] });
      addNotification({ title: '确认成功', message: '告警已确认', type: 'success' });
    },
    onError: (err: unknown) => {
      const message = extractErrorMessage(err, '确认操作失败');
      addNotification({ title: '操作失败', message, type: 'error' });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => monitorApi.resolveAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitor-alerts'] });
      addNotification({ title: '已解决', message: '告警已标记为已解决', type: 'success' });
    },
    onError: (err: unknown) => {
      const message = extractErrorMessage(err, '解决操作失败');
      addNotification({ title: '操作失败', message, type: 'error' });
    },
  });

  const actionLoading = acknowledgeMutation.isPending || resolveMutation.isPending;

  const filteredAlerts = useMemo(() => {
    let result = alerts;

    if (activeTab === 'critical') {
      result = result.filter((a) => a.severity === 'critical');
    } else if (activeTab === 'warning') {
      result = result.filter((a) => a.severity === 'warning');
    } else if (activeTab === 'info') {
      result = result.filter((a) => a.severity === 'info');
    } else if (activeTab === 'resolved') {
      result = result.filter((a) => a.status === 'resolved');
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (a) => a.title.toLowerCase().includes(query) || a.service_name.toLowerCase().includes(query)
      );
    }

    if (severityFilter !== 'all') {
      result = result.filter((a) => a.severity === severityFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter((a) => a.status === statusFilter);
    }

    if (serviceFilter !== 'all') {
      result = result.filter((a) => a.service_name === serviceFilter);
    }

    return result;
  }, [alerts, activeTab, searchQuery, severityFilter, statusFilter, serviceFilter]);

  const stats = useMemo(() => {
    const activeCount = alerts.filter((a) => a.status === 'active').length;
    const criticalCount = alerts.filter(
      (a) => a.severity === 'critical' && a.status !== 'resolved'
    ).length;
    const warningCount = alerts.filter(
      (a) => a.severity === 'warning' && a.status !== 'resolved'
    ).length;
    const todayCount = alerts.filter((a) => {
      const today = new Date().toDateString();
      return new Date(a.created_at).toDateString() === today;
    }).length;

    return [
      {
        id: 'active',
        title: '活动告警',
        value: activeCount,
        icon: <Bell size={20} />,
        color: 'error' as const,
      },
      {
        id: 'critical',
        title: '严重告警',
        value: criticalCount,
        icon: <AlertCircle size={20} />,
        color: 'error' as const,
      },
      {
        id: 'warning',
        title: '警告告警',
        value: warningCount,
        icon: <AlertTriangle size={20} />,
        color: 'warning' as const,
      },
      {
        id: 'today',
        title: '今日告警',
        value: todayCount,
        icon: <Clock size={20} />,
        color: 'primary' as const,
      },
    ];
  }, [alerts]);

  const getSeverityChip = useMemo(
    () => (severity: AlertSeverity) => {
      return (
        <Chip
          size='small'
          color={SEVERITY_COLORS[severity]}
          label={SEVERITY_LABELS[severity]}
          variant='outlined'
        />
      );
    },
    []
  );

  const getStatusChip = useMemo(
    () => (status: AlertStatus) => {
      return (
        <Chip
          size='small'
          color={STATUS_COLORS[status]}
          label={STATUS_LABELS[status]}
          variant='outlined'
        />
      );
    },
    []
  );

  const handleAcknowledge = (alert: Alert) => {
    acknowledgeMutation.mutate(alert.id);
  };

  const handleResolve = (alert: Alert) => {
    resolveMutation.mutate(alert.id);
  };

  const handleViewDetail = (alert: Alert) => {
    addNotification({
      title: '查看详情',
      message: `查看「${alert.title}」的详情`,
      type: 'info',
    });
  };

  const handleSuppress = (alert: Alert) => {
    addNotification({
      title: '屏蔽告警',
      message: `已屏蔽「${alert.title}」告警`,
      type: 'warning',
    });
  };

  const handleBatchAcknowledge = async () => {
    try {
      await Promise.all(selectedIds.map((id) => monitorApi.acknowledgeAlert(String(id))));
      queryClient.invalidateQueries({ queryKey: ['monitor-alerts'] });
      addNotification({
        title: '批量确认成功',
        message: `已确认 ${selectedIds.length} 条告警`,
        type: 'success',
      });
      setSelectedIds([]);
      setBatchAcknowledgeDialogOpen(false);
    } catch (err: unknown) {
      const message = extractErrorMessage(err, '批量确认失败');
      addNotification({ title: '操作失败', message, type: 'error' });
    }
  };

  const handleBatchResolve = async () => {
    try {
      await Promise.all(selectedIds.map((id) => monitorApi.resolveAlert(String(id))));
      queryClient.invalidateQueries({ queryKey: ['monitor-alerts'] });
      addNotification({
        title: '批量解决成功',
        message: `已解决 ${selectedIds.length} 条告警`,
        type: 'success',
      });
      setSelectedIds([]);
      setBatchResolveDialogOpen(false);
    } catch (err: unknown) {
      const message = extractErrorMessage(err, '批量解决失败');
      addNotification({ title: '操作失败', message, type: 'error' });
    }
  };

  const handleExport = () => {
    try {
      const exportData = filteredAlerts.map((alert) => ({
        告警名称: alert.title,
        严重级别: SEVERITY_LABELS[alert.severity as AlertSeverity] || alert.severity,
        所属服务: alert.service_name,
        告警描述: alert.message,
        触发时间: alert.created_at,
        状态: STATUS_LABELS[alert.status as AlertStatus] || alert.status,
        确认人: alert.acknowledged_at ? '已确认' : '-',
        解决时间: alert.resolved_at || '-',
      }));

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `alerts_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addNotification({
        title: '导出成功',
        message: '告警数据导出成功',
        type: 'success',
      });
    } catch (err: unknown) {
      const message = extractErrorMessage(err, '导出失败');
      addNotification({ title: '导出失败', message, type: 'error' });
    }
  };

  const handleTabChange = (_: unknown, newValue: TabType) => {
    setActiveTab(newValue);
    pagination.setPage(1);
  };

  const handleFilterChange = (filters: Record<string, unknown>) => {
    if (typeof filters.severity === 'string') {
      setSeverityFilter(filters.severity);
    }
    if (typeof filters.status === 'string') {
      setStatusFilter(filters.status);
    }
    if (typeof filters.service === 'string') {
      setServiceFilter(filters.service);
    }
    pagination.setPage(1);
  };

  const columns: ColumnDef<Alert>[] = useMemo(
    () => [
      {
        id: 'title',
        label: '告警名称',
        minWidth: 200,
        render: (row) => (
          <Stack
            direction='row'
            spacing={1.5}
            sx={{ alignItems: 'center' }}
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: `${SEVERITY_COLORS[row.severity as AlertSeverity]}.light`,
                color: `${SEVERITY_COLORS[row.severity as AlertSeverity]}.main`,
              }}
            >
              {getSeverityIcon(row.severity as AlertSeverity)}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant='body2'
                sx={{
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {row.title}
              </Typography>
              <Typography
                variant='caption'
                sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                <Server size={12} />
                {row.service_name}
              </Typography>
            </Box>
          </Stack>
        ),
      },
      {
        id: 'severity',
        label: '严重级别',
        width: 100,
        render: (row) => getSeverityChip(row.severity as AlertSeverity),
      },
      {
        id: 'service',
        label: '所属服务',
        width: 140,
        render: (row) => (
          <Stack
            direction='row'
            spacing={0.5}
            sx={{ alignItems: 'center' }}
          >
            <Server
              size={14}
              style={{ color: ct.grey[400] }}
            />
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {row.service_name}
            </Typography>
          </Stack>
        ),
      },
      {
        id: 'message',
        label: '告警描述',
        minWidth: 240,
        render: (row) => (
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 300,
            }}
          >
            {row.message}
          </Typography>
        ),
      },
      {
        id: 'created_at',
        label: '触发时间',
        width: 160,
        render: (row) => (
          <Stack
            direction='row'
            spacing={0.5}
            sx={{ alignItems: 'center' }}
          >
            <Clock
              size={14}
              style={{ color: ct.grey[400] }}
            />
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {new Date(row.created_at).toLocaleString('zh-CN')}
            </Typography>
          </Stack>
        ),
      },
      {
        id: 'status',
        label: '状态',
        width: 100,
        render: (row) => getStatusChip(row.status as AlertStatus),
      },
      {
        id: 'actions',
        label: '操作',
        align: 'right',
        width: 220,
        render: (row) => (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 0.5,
            }}
          >
            {row.status === 'active' && (
              <Button
                size='small'
                variant='outlined'
                color='primary'
                startIcon={<CheckSquare size={14} />}
                onClick={() => handleAcknowledge(row)}
                disabled={actionLoading}
                sx={{ minWidth: 0, px: 1.5 }}
              >
                确认
              </Button>
            )}
            {row.status !== 'resolved' && (
              <Button
                size='small'
                variant='outlined'
                color='success'
                startIcon={<CheckCircle size={14} />}
                onClick={() => handleResolve(row)}
                disabled={actionLoading}
                sx={{ minWidth: 0, px: 1.5 }}
              >
                解决
              </Button>
            )}
            <IconButton
              size='small'
              onClick={() => handleViewDetail(row)}
              title='查看详情'
            >
              <Eye size={16} />
            </IconButton>
            <IconButton
              size='small'
              onClick={() => handleSuppress(row)}
              title='屏蔽'
              color='default'
            >
              <Ban size={16} />
            </IconButton>
          </Box>
        ),
      },
    ],
    [getSeverityChip, getStatusChip, handleAcknowledge, handleResolve, actionLoading]
  );

  const filterOptions = useMemo(
    () => [
      {
        id: 'severity',
        label: '严重级别',
        type: 'select' as const,
        options: [
          { label: '全部级别', value: 'all' },
          { label: '严重', value: 'critical' },
          { label: '警告', value: 'warning' },
          { label: '通知', value: 'info' },
        ],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select' as const,
        options: [
          { label: '全部状态', value: 'all' },
          { label: '活动', value: 'active' },
          { label: '已确认', value: 'acknowledged' },
          { label: '已解决', value: 'resolved' },
        ],
      },
      {
        id: 'service',
        label: '服务',
        type: 'select' as const,
        options: SERVICE_OPTIONS,
      },
    ],
    []
  );

  const tabHeaders = useMemo(
    () => (
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              minHeight: 48,
              fontWeight: 500,
            },
          }}
        >
          <Tab
            label='全部告警'
            value='all'
          />
          <Tab
            label='严重告警'
            value='critical'
          />
          <Tab
            label='警告'
            value='warning'
          />
          <Tab
            label='通知'
            value='info'
          />
          <Tab
            label='已处理'
            value='resolved'
          />
        </Tabs>
      </Box>
    ),
    [activeTab]
  );

  const statsCards = useMemo(
    () => (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
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

  const batchActions = useMemo(
    () => [
      {
        label: '批量确认',
        icon: <CheckSquare size={16} />,
        color: 'primary' as const,
        onClick: () => setBatchAcknowledgeDialogOpen(true),
        showWhenSelected: true,
        minSelected: 1,
      },
      {
        label: '批量解决',
        icon: <CheckCircle size={16} />,
        color: 'success' as const,
        onClick: () => setBatchResolveDialogOpen(true),
        showWhenSelected: true,
        minSelected: 1,
      },
    ],
    []
  );

  return (
    <PageContainer
      headerProps={{
        pageIcon: <AlertTriangle size={20} />,
        backButton: {
          href: MONITOR_PATHS.dashboard,
        },
      }}
    >
      {tabHeaders}
      {statsCards}

      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={filteredAlerts}
        loading={loading || actionLoading}
        error={error || undefined}
        searchable
        searchPlaceholder='搜索告警名称、服务名...'
        searchValue={searchQuery}
        onSearch={setSearchQuery}
        filters={filterOptions}
        filtersValue={{
          severity: severityFilter,
          status: statusFilter,
          service: serviceFilter,
        }}
        onFilterChange={handleFilterChange}
        pagination={{
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onPageChange: pagination.setPage,
        }}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        batchActions={batchActions}
        actions={[
          {
            label: '刷新',
            icon: <RefreshCw size={16} />,
            onClick: refresh,
            variant: 'outlined',
          },
          {
            label: '导出',
            icon: <Download size={16} />,
            onClick: handleExport,
            variant: 'outlined',
          },
        ]}
        onRefresh={refresh}
        emptyMessage='暂无告警数据'
        getRowId={(row) => row.id}
      />

      <ConfirmDialog
        isOpen={batchAcknowledgeDialogOpen}
        onClose={() => !actionLoading && setBatchAcknowledgeDialogOpen(false)}
        onConfirm={handleBatchAcknowledge}
        title='批量确认告警'
        message={`确定要确认选中的 ${selectedIds.length} 条告警吗？`}
        confirmLabel='确认'
        cancelLabel='取消'
        type='warning'
      />

      <ConfirmDialog
        isOpen={batchResolveDialogOpen}
        onClose={() => !actionLoading && setBatchResolveDialogOpen(false)}
        onConfirm={handleBatchResolve}
        title='批量解决告警'
        message={`确定要标记选中的 ${selectedIds.length} 条告警为已解决吗？`}
        confirmLabel='确认解决'
        cancelLabel='取消'
        type='success'
      />
    </PageContainer>
  );
};

export default MonitorAlertsPage;
