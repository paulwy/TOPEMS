import React, { useState, useMemo, useCallback } from 'react';
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

import { useAppStore } from '../../store';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { extractErrorMessage } from '@/utils/errors';
import { PageContainer, ConfirmDialog } from '@/components/common';

type AlertSeverity = 'critical' | 'warning' | 'info';
type AlertStatus = 'active' | 'acknowledged' | 'resolved';
type TabType = 'all' | 'critical' | 'warning' | 'info' | 'resolved';

interface Alert {
  id: string;
  name: string;
  severity: AlertSeverity;
  service: string;
  description: string;
  triggeredAt: string;
  status: AlertStatus;
  acknowledgedBy?: string;
  resolvedAt?: string;
}

const MOCK_ALERTS: Alert[] = [
  {
    id: 'alert-001',
    name: 'CPU使用率过高',
    severity: 'critical',
    service: '用户服务',
    description: 'CPU使用率持续超过90%，已持续5分钟',
    triggeredAt: '2024-01-15 09:30:00',
    status: 'active',
  },
  {
    id: 'alert-002',
    name: '内存使用率警告',
    severity: 'warning',
    service: '订单服务',
    description: '内存使用率达到85%，接近阈值',
    triggeredAt: '2024-01-15 10:15:00',
    status: 'active',
  },
  {
    id: 'alert-003',
    name: '磁盘空间不足',
    severity: 'critical',
    service: '数据库服务',
    description: '磁盘剩余空间不足10%',
    triggeredAt: '2024-01-15 08:45:00',
    status: 'acknowledged',
    acknowledgedBy: '运维工程师',
  },
  {
    id: 'alert-004',
    name: '服务响应延迟',
    severity: 'warning',
    service: '支付服务',
    description: '接口平均响应时间超过2秒',
    triggeredAt: '2024-01-15 11:00:00',
    status: 'active',
  },
  {
    id: 'alert-005',
    name: '新服务部署成功',
    severity: 'info',
    service: '消息服务',
    description: '消息队列服务v2.1.0部署完成',
    triggeredAt: '2024-01-15 07:30:00',
    status: 'resolved',
    resolvedAt: '2024-01-15 07:35:00',
  },
  {
    id: 'alert-006',
    name: '数据库连接池耗尽',
    severity: 'critical',
    service: '数据库服务',
    description: '数据库连接池使用率达到100%',
    triggeredAt: '2024-01-14 22:10:00',
    status: 'resolved',
    acknowledgedBy: 'DBA',
    resolvedAt: '2024-01-14 22:30:00',
  },
  {
    id: 'alert-007',
    name: '缓存命中率下降',
    severity: 'warning',
    service: '缓存服务',
    description: 'Redis缓存命中率降至70%以下',
    triggeredAt: '2024-01-15 09:00:00',
    status: 'acknowledged',
    acknowledgedBy: '后端工程师',
  },
  {
    id: 'alert-008',
    name: 'API错误率上升',
    severity: 'critical',
    service: '网关服务',
    description: '5xx错误率超过5%',
    triggeredAt: '2024-01-15 10:30:00',
    status: 'active',
  },
  {
    id: 'alert-009',
    name: '证书即将过期',
    severity: 'info',
    service: '网关服务',
    description: 'SSL证书将在30天后过期',
    triggeredAt: '2024-01-15 06:00:00',
    status: 'active',
  },
  {
    id: 'alert-010',
    name: '定时任务执行失败',
    severity: 'warning',
    service: '任务调度服务',
    description: '每日数据同步任务执行失败',
    triggeredAt: '2024-01-15 02:00:00',
    status: 'resolved',
    acknowledgedBy: '后端工程师',
    resolvedAt: '2024-01-15 03:15:00',
  },
  {
    id: 'alert-011',
    name: '日志磁盘空间告警',
    severity: 'warning',
    service: '日志服务',
    description: '日志存储磁盘使用率达到80%',
    triggeredAt: '2024-01-14 18:00:00',
    status: 'active',
  },
];

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

const SERVICE_OPTIONS = [
  { label: '全部服务', value: 'all' },
  { label: '用户服务', value: '用户服务' },
  { label: '订单服务', value: '订单服务' },
  { label: '支付服务', value: '支付服务' },
  { label: '数据库服务', value: '数据库服务' },
  { label: '缓存服务', value: '缓存服务' },
  { label: '网关服务', value: '网关服务' },
  { label: '消息服务', value: '消息服务' },
  { label: '任务调度服务', value: '任务调度服务' },
  { label: '日志服务', value: '日志服务' },
];

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
  const addNotification = useAppStore((state) => state.addNotification);

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [alerts, setAlerts] = useState<Alert[]>(MOCK_ALERTS);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [batchAcknowledgeDialogOpen, setBatchAcknowledgeDialogOpen] = useState(false);
  const [batchResolveDialogOpen, setBatchResolveDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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
        (a) =>
          a.name.toLowerCase().includes(query) ||
          a.service.toLowerCase().includes(query)
      );
    }

    if (severityFilter !== 'all') {
      result = result.filter((a) => a.severity === severityFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter((a) => a.status === statusFilter);
    }

    if (serviceFilter !== 'all') {
      result = result.filter((a) => a.service === serviceFilter);
    }

    return result;
  }, [alerts, activeTab, searchQuery, severityFilter, statusFilter, serviceFilter]);

  const pagedAlerts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAlerts.slice(start, start + pageSize);
  }, [filteredAlerts, page]);

  const total = filteredAlerts.length;

  const stats = useMemo(() => {
    const activeCount = alerts.filter((a) => a.status === 'active').length;
    const criticalCount = alerts.filter((a) => a.severity === 'critical' && a.status !== 'resolved').length;
    const warningCount = alerts.filter((a) => a.severity === 'warning' && a.status !== 'resolved').length;
    const todayCount = alerts.filter((a) => {
      const today = new Date().toDateString();
      return new Date(a.triggeredAt).toDateString() === today;
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

  const getSeverityChip = useCallback((severity: AlertSeverity) => {
    return (
      <Chip
        size='small'
        color={SEVERITY_COLORS[severity]}
        label={SEVERITY_LABELS[severity]}
        variant='outlined'
      />
    );
  }, []);

  const getStatusChip = useCallback((status: AlertStatus) => {
    return (
      <Chip
        size='small'
        color={STATUS_COLORS[status]}
        label={STATUS_LABELS[status]}
        variant='outlined'
      />
    );
  }, []);

  const handleAcknowledge = useCallback(
    (alert: Alert) => {
      try {
        setActionLoading(true);
        setAlerts((prev) =>
          prev.map((a) =>
            a.id === alert.id ? { ...a, status: 'acknowledged' as const, acknowledgedBy: '当前用户' } : a
          )
        );
        addNotification({
          title: '确认成功',
          message: `已确认「${alert.name}」告警`,
          type: 'success',
        });
      } catch (_err: unknown) {
        addNotification({
          title: '操作失败',
          message: extractErrorMessage(_err, '确认操作失败'),
          type: 'error',
        });
      } finally {
        setActionLoading(false);
      }
    },
    [addNotification]
  );

  const handleResolve = useCallback(
    (alert: Alert) => {
      try {
        setActionLoading(true);
        setAlerts((prev) =>
          prev.map((a) =>
            a.id === alert.id
              ? { ...a, status: 'resolved' as const, resolvedAt: new Date().toISOString() }
              : a
          )
        );
        addNotification({
          title: '已解决',
          message: `已标记「${alert.name}」为已解决`,
          type: 'success',
        });
      } catch (_err: unknown) {
        addNotification({
          title: '操作失败',
          message: extractErrorMessage(_err, '解决操作失败'),
          type: 'error',
        });
      } finally {
        setActionLoading(false);
      }
    },
    [addNotification]
  );

  const handleViewDetail = useCallback(
    (alert: Alert) => {
      addNotification({
        title: '查看详情',
        message: `查看「${alert.name}」的详情`,
        type: 'info',
      });
    },
    [addNotification]
  );

  const handleSuppress = useCallback(
    (alert: Alert) => {
      addNotification({
        title: '屏蔽告警',
        message: `已屏蔽「${alert.name}」告警`,
        type: 'warning',
      });
    },
    [addNotification]
  );

  const handleBatchAcknowledge = useCallback(async () => {
    try {
      setActionLoading(true);
      setAlerts((prev) =>
        prev.map((a) =>
          selectedIds.includes(a.id)
            ? { ...a, status: 'acknowledged' as const, acknowledgedBy: '当前用户' }
            : a
        )
      );
      addNotification({
        title: '批量确认成功',
        message: `已确认 ${selectedIds.length} 条告警`,
        type: 'success',
      });
      setSelectedIds([]);
      setBatchAcknowledgeDialogOpen(false);
    } catch (_err: unknown) {
      addNotification({
        title: '操作失败',
        message: extractErrorMessage(_err, '批量确认失败'),
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  }, [selectedIds, addNotification]);

  const handleBatchResolve = useCallback(async () => {
    try {
      setActionLoading(true);
      setAlerts((prev) =>
        prev.map((a) =>
          selectedIds.includes(a.id)
            ? { ...a, status: 'resolved' as const, resolvedAt: new Date().toISOString() }
            : a
        )
      );
      addNotification({
        title: '批量解决成功',
        message: `已解决 ${selectedIds.length} 条告警`,
        type: 'success',
      });
      setSelectedIds([]);
      setBatchResolveDialogOpen(false);
    } catch (_err: unknown) {
      addNotification({
        title: '操作失败',
        message: extractErrorMessage(_err, '批量解决失败'),
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  }, [selectedIds, addNotification]);

  const handleExport = useCallback(() => {
    try {
      const exportData = filteredAlerts.map((alert) => ({
        告警名称: alert.name,
        严重级别: SEVERITY_LABELS[alert.severity],
        所属服务: alert.service,
        告警描述: alert.description,
        触发时间: alert.triggeredAt,
        状态: STATUS_LABELS[alert.status],
        确认人: alert.acknowledgedBy || '-',
        解决时间: alert.resolvedAt || '-',
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
    } catch (_err: unknown) {
      addNotification({
        title: '导出失败',
        message: extractErrorMessage(_err, '导出失败'),
        type: 'error',
      });
    }
  }, [filteredAlerts, addNotification]);

  const columns: ColumnDef<Alert>[] = useMemo(
    () => [
      {
        id: 'name',
        label: '告警名称',
        minWidth: 200,
        render: (row) => (
          <Stack direction='row' spacing={1.5} sx={{ alignItems: 'center' }}>
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: `${SEVERITY_COLORS[row.severity]}.light`,
                color: `${SEVERITY_COLORS[row.severity]}.main`,
              }}
            >
              {getSeverityIcon(row.severity)}
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
                {row.name}
              </Typography>
              <Typography
                variant='caption'
                sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                <Server size={12} />
                {row.service}
              </Typography>
            </Box>
          </Stack>
        ),
      },
      {
        id: 'severity',
        label: '严重级别',
        width: 100,
        render: (row) => getSeverityChip(row.severity),
      },
      {
        id: 'service',
        label: '所属服务',
        width: 140,
        render: (row) => (
          <Stack direction='row' spacing={0.5} sx={{ alignItems: 'center' }}>
            <Server size={14} style={{ color: '#9ca3af' }} />
            <Typography variant='body2' color='text.secondary'>
              {row.service}
            </Typography>
          </Stack>
        ),
      },
      {
        id: 'description',
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
            {row.description}
          </Typography>
        ),
      },
      {
        id: 'triggeredAt',
        label: '触发时间',
        width: 160,
        render: (row) => (
          <Stack direction='row' spacing={0.5} sx={{ alignItems: 'center' }}>
            <Clock size={14} style={{ color: '#9ca3af' }} />
            <Typography variant='body2' color='text.secondary'>
              {new Date(row.triggeredAt).toLocaleString('zh-CN')}
            </Typography>
          </Stack>
        ),
      },
      {
        id: 'status',
        label: '状态',
        width: 100,
        render: (row) => getStatusChip(row.status),
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
    [getSeverityChip, getStatusChip, handleAcknowledge, handleResolve, handleViewDetail, handleSuppress, actionLoading]
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

  const handleFilterChange = useCallback((filters: Record<string, unknown>) => {
    if (typeof filters.severity === 'string') {
      setSeverityFilter(filters.severity);
    }
    if (typeof filters.status === 'string') {
      setStatusFilter(filters.status);
    }
    if (typeof filters.service === 'string') {
      setServiceFilter(filters.service);
    }
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const tabHeaders = useMemo(
    () => (
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => {
            setActiveTab(newValue);
            setPage(1);
          }}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              minHeight: 48,
              fontWeight: 500,
            },
          }}
        >
          <Tab label='全部告警' value='all' />
          <Tab label='严重告警' value='critical' />
          <Tab label='警告' value='warning' />
          <Tab label='通知' value='info' />
          <Tab label='已处理' value='resolved' />
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
              <Stack direction='row' spacing={1.5} sx={{ alignItems: 'center' }}>
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
                  <Typography variant='h4' sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                    {item.value}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
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
          href: '/monitor/dashboard',
        },
      }}
    >
      {tabHeaders}
      {statsCards}

      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={pagedAlerts}
        loading={loading}
        error={undefined}
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
          page,
          pageSize,
          total,
          onPageChange: handlePageChange,
        }}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        batchActions={batchActions}
        actions={[
          {
            label: '刷新',
            icon: <RefreshCw size={16} />,
            onClick: () => {
              setLoading(true);
              setTimeout(() => setLoading(false), 500);
            },
            variant: 'outlined',
          },
          {
            label: '导出',
            icon: <Download size={16} />,
            onClick: handleExport,
            variant: 'outlined',
          },
        ]}
        onRefresh={() => {
          setLoading(true);
          setTimeout(() => setLoading(false), 500);
        }}
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
