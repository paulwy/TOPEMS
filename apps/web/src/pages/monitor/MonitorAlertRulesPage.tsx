/**
 * 告警规则管理页面 - V4.0 标准化改造
 *
 * @module pages/monitor
 * @path /monitor/alert-rules
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Download,
  Upload,
  Copy,
  Power,
  PowerOff,
  Clock,
  AlertTriangle,
  Cpu,
  HardDrive,
  Network,
  Database,
  Globe,
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
} from 'lucide-react';
import { Box, Typography, Chip, Button, Switch } from '@mui/material';

import { useNotificationStore } from '@/store';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { extractErrorMessage } from '@/utils/errors';
import { PageContainer } from '@/components/common';
import { ConfirmDialog } from '@topems/shared-components';
import { MONITOR_PATHS } from '@/modules/monitor/config';

const METRIC_TYPE_CONFIG: Record<
  string,
  {
    label: string;
    color: 'primary' | 'success' | 'info' | 'warning' | 'default' | 'error';
    icon: React.ReactNode;
  }
> = {
  cpu: { label: 'CPU', color: 'primary', icon: <Cpu size={14} /> },
  memory: { label: '内存', color: 'success', icon: <HardDrive size={14} /> },
  disk: { label: '磁盘', color: 'warning', icon: <HardDrive size={14} /> },
  network: { label: '网络', color: 'info', icon: <Network size={14} /> },
  database: { label: '数据库', color: 'error', icon: <Database size={14} /> },
  api: { label: 'API', color: 'default', icon: <Globe size={14} /> },
};

const SEVERITY_CONFIG: Record<string, { label: string; color: 'error' | 'warning' | 'info' }> = {
  critical: { label: '严重', color: 'error' },
  warning: { label: '警告', color: 'warning' },
  info: { label: '信息', color: 'info' },
};

const CHANNEL_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  email: { label: '邮件', icon: <Mail size={14} /> },
  sms: { label: '短信', icon: <Smartphone size={14} /> },
  push: { label: '推送', icon: <Bell size={14} /> },
  wechat: { label: '企业微信', icon: <MessageSquare size={14} /> },
};

interface AlertRule {
  id: string;
  name: string;
  metric_type: string;
  metric_name: string;
  condition: string;
  threshold: string;
  unit: string;
  severity: string;
  channels: string[];
  enabled: boolean;
  last_triggered_at: string | null;
  trigger_count_today: number;
  created_at: string;
  updated_at: string;
}

const mockRules: AlertRule[] = [
  {
    id: '1',
    name: 'CPU 使用率过高',
    metric_type: 'cpu',
    metric_name: 'cpu_usage',
    condition: '>',
    threshold: '85',
    unit: '%',
    severity: 'critical',
    channels: ['email', 'push', 'wechat'],
    enabled: true,
    last_triggered_at: '2024-01-20 14:32:00',
    trigger_count_today: 3,
    created_at: '2024-01-01',
    updated_at: '2024-01-15',
  },
  {
    id: '2',
    name: '内存使用率告警',
    metric_type: 'memory',
    metric_name: 'memory_usage',
    condition: '>',
    threshold: '90',
    unit: '%',
    severity: 'warning',
    channels: ['email', 'push'],
    enabled: true,
    last_triggered_at: '2024-01-20 10:15:00',
    trigger_count_today: 5,
    created_at: '2024-01-02',
    updated_at: '2024-01-18',
  },
  {
    id: '3',
    name: '磁盘空间不足',
    metric_type: 'disk',
    metric_name: 'disk_usage',
    condition: '>',
    threshold: '80',
    unit: '%',
    severity: 'critical',
    channels: ['email', 'sms'],
    enabled: true,
    last_triggered_at: '2024-01-19 22:45:00',
    trigger_count_today: 0,
    created_at: '2024-01-03',
    updated_at: '2024-01-12',
  },
  {
    id: '4',
    name: '网络带宽告警',
    metric_type: 'network',
    metric_name: 'network_bandwidth',
    condition: '>',
    threshold: '75',
    unit: '%',
    severity: 'warning',
    channels: ['push'],
    enabled: false,
    last_triggered_at: null,
    trigger_count_today: 0,
    created_at: '2024-01-05',
    updated_at: '2024-01-10',
  },
  {
    id: '5',
    name: '数据库连接数过高',
    metric_type: 'database',
    metric_name: 'db_connections',
    condition: '>',
    threshold: '500',
    unit: '个',
    severity: 'critical',
    channels: ['email', 'push', 'wechat'],
    enabled: true,
    last_triggered_at: '2024-01-20 09:20:00',
    trigger_count_today: 2,
    created_at: '2024-01-08',
    updated_at: '2024-01-19',
  },
  {
    id: '6',
    name: 'API 响应时间过长',
    metric_type: 'api',
    metric_name: 'api_response_time',
    condition: '>',
    threshold: '500',
    unit: 'ms',
    severity: 'warning',
    channels: ['email', 'wechat'],
    enabled: true,
    last_triggered_at: '2024-01-20 16:40:00',
    trigger_count_today: 8,
    created_at: '2024-01-10',
    updated_at: '2024-01-20',
  },
  {
    id: '7',
    name: 'API 错误率告警',
    metric_type: 'api',
    metric_name: 'api_error_rate',
    condition: '>',
    threshold: '5',
    unit: '%',
    severity: 'critical',
    channels: ['email', 'sms', 'push'],
    enabled: true,
    last_triggered_at: '2024-01-20 11:05:00',
    trigger_count_today: 1,
    created_at: '2024-01-12',
    updated_at: '2024-01-17',
  },
  {
    id: '8',
    name: 'CPU 负载告警',
    metric_type: 'cpu',
    metric_name: 'cpu_load',
    condition: '>',
    threshold: '95',
    unit: '%',
    severity: 'info',
    channels: ['push'],
    enabled: false,
    last_triggered_at: null,
    trigger_count_today: 0,
    created_at: '2024-01-15',
    updated_at: '2024-01-16',
  },
  {
    id: '9',
    name: '数据库慢查询告警',
    metric_type: 'database',
    metric_name: 'db_slow_queries',
    condition: '>',
    threshold: '10',
    unit: '个/分钟',
    severity: 'warning',
    channels: ['email', 'wechat'],
    enabled: true,
    last_triggered_at: '2024-01-20 13:50:00',
    trigger_count_today: 4,
    created_at: '2024-01-18',
    updated_at: '2024-01-20',
  },
];

export const MonitorAlertRulesPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [rules, setRules] = useState<AlertRule[]>(mockRules);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [metricTypeFilter, setMetricTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  } | null>(null);

  const openConfirmDialog = useCallback(
    (config: { title: string; message: string; onConfirm: () => void; danger?: boolean }) => {
      setConfirmDialogConfig(config);
      setConfirmDialogOpen(true);
    },
    []
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      setRules(mockRules);
    } catch (_err: unknown) {
      addNotification({
        title: '加载失败',
        message: extractErrorMessage(_err, '加载告警规则失败'),
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  const handleToggleStatus = useCallback(
    (ruleId: string) => {
      const rule = rules.find((r) => r.id === ruleId);
      if (!rule) return;

      const action = rule.enabled ? '禁用' : '启用';
      openConfirmDialog({
        title: `确认${action}`,
        message: `确定要${action}告警规则"${rule.name}"吗？`,
        danger: !rule.enabled ? false : true,
        onConfirm: () => {
          try {
            setRules((prev) =>
              prev.map((r) =>
                r.id === ruleId
                  ? {
                      ...r,
                      enabled: !r.enabled,
                      updated_at: new Date().toISOString().split('T')[0],
                    }
                  : r
              )
            );
            addNotification({
              title: '成功',
              message: `告警规则${action}成功`,
              type: 'success',
            });
          } catch (_err: unknown) {
            addNotification({
              title: '失败',
              message: extractErrorMessage(_err, `${action}告警规则失败`),
              type: 'error',
            });
          }
        },
      });
    },
    [rules, addNotification, openConfirmDialog]
  );

  const handleDelete = useCallback(
    (ruleId: string) => {
      const rule = rules.find((r) => r.id === ruleId);
      openConfirmDialog({
        title: '确认删除',
        message: `确定要删除告警规则"${rule?.name || ''}"吗？此操作不可恢复。`,
        danger: true,
        onConfirm: () => {
          try {
            setRules((prev) => prev.filter((r) => r.id !== ruleId));
            addNotification({
              title: '成功',
              message: '告警规则删除成功',
              type: 'success',
            });
          } catch (_err: unknown) {
            addNotification({
              title: '失败',
              message: extractErrorMessage(_err, '删除告警规则失败'),
              type: 'error',
            });
          }
        },
      });
    },
    [rules, addNotification, openConfirmDialog]
  );

  const handleCopy = useCallback(
    (ruleId: string) => {
      try {
        const rule = rules.find((r) => r.id === ruleId);
        if (!rule) return;

        const newRule: AlertRule = {
          ...rule,
          id: String(Date.now()),
          name: `${rule.name} - 副本`,
          enabled: false,
          created_at: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString().split('T')[0],
        };
        setRules((prev) => [...prev, newRule]);
        addNotification({
          title: '成功',
          message: '告警规则复制成功',
          type: 'success',
        });
      } catch (_err: unknown) {
        addNotification({
          title: '失败',
          message: extractErrorMessage(_err, '复制告警规则失败'),
          type: 'error',
        });
      }
    },
    [rules, addNotification]
  );

  const filteredRules = useMemo(() => {
    return rules.filter((rule) => {
      const matchesSearch =
        !searchQuery ||
        rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rule.metric_name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'enabled' && rule.enabled) ||
        (statusFilter === 'disabled' && !rule.enabled);

      const matchesSeverity = severityFilter === 'all' || rule.severity === severityFilter;
      const matchesMetricType = metricTypeFilter === 'all' || rule.metric_type === metricTypeFilter;

      return matchesSearch && matchesStatus && matchesSeverity && matchesMetricType;
    });
  }, [rules, searchQuery, statusFilter, severityFilter, metricTypeFilter]);

  const stats = useMemo(() => {
    const total = rules.length;
    const enabledCount = rules.filter((r) => r.enabled).length;
    const disabledCount = rules.filter((r) => !r.enabled).length;
    const totalTriggersToday = rules.reduce((sum, r) => sum + r.trigger_count_today, 0);
    return [
      {
        id: 'total',
        title: '规则总数',
        value: total,
        icon: <Settings size={20} />,
        color: 'primary' as const,
      },
      {
        id: 'enabled',
        title: '启用规则',
        value: enabledCount,
        icon: <Power size={20} />,
        color: 'success' as const,
      },
      {
        id: 'disabled',
        title: '禁用规则',
        value: disabledCount,
        icon: <PowerOff size={20} />,
        color: 'default' as const,
      },
      {
        id: 'triggers',
        title: '今日触发次数',
        value: totalTriggersToday,
        icon: <AlertTriangle size={20} />,
        color: 'warning' as const,
      },
    ];
  }, [rules]);

  const columns: ColumnDef<AlertRule>[] = useMemo(
    () => [
      {
        id: 'name',
        label: '规则名称',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1,
                bgcolor: 'primary.light',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle
                size={18}
                color='primary.main'
              />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                {row.name}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {row.metric_name}
              </Typography>
            </Box>
          </Box>
        ),
      },
      {
        id: 'metric_type',
        label: '指标类型',
        render: (row) => {
          const config = METRIC_TYPE_CONFIG[row.metric_type] || {
            label: row.metric_type,
            color: 'default' as const,
            icon: <Bell size={14} />,
          };
          return (
            <Chip
              size='small'
              color={config.color}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {config.icon}
                  <span>{config.label}</span>
                </Box>
              }
              variant='outlined'
            />
          );
        },
      },
      {
        id: 'condition',
        label: '触发条件',
        render: (row) => (
          <Typography
            variant='body2'
            sx={{ fontFamily: 'monospace' }}
          >
            {row.condition} {row.threshold}
            {row.unit}
          </Typography>
        ),
      },
      {
        id: 'severity',
        label: '严重级别',
        render: (row) => {
          const config = SEVERITY_CONFIG[row.severity] || {
            label: row.severity,
            color: 'default' as const,
          };
          return (
            <Chip
              size='small'
              color={config.color}
              label={config.label}
            />
          );
        },
      },
      {
        id: 'channels',
        label: '通知渠道',
        render: (row) => (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {row.channels.slice(0, 3).map((channel) => {
              const config = CHANNEL_CONFIG[channel] || {
                label: channel,
                icon: (<Bell size={14} />) as React.ReactElement,
              };
              return (
                <Chip
                  key={channel}
                  size='small'
                  icon={config.icon as React.ReactElement}
                  label={config.label}
                  variant='outlined'
                  sx={{ height: 24, '& .MuiChip-icon': { ml: 0.5 } }}
                />
              );
            })}
            {row.channels.length > 3 && (
              <Chip
                size='small'
                label={`+${row.channels.length - 3}`}
                variant='outlined'
                sx={{ height: 24 }}
              />
            )}
          </Box>
        ),
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Switch
              checked={row.enabled}
              onChange={() => handleToggleStatus(row.id)}
              size='small'
              color='success'
            />
            <Typography
              variant='body2'
              color={row.enabled ? 'success.main' : 'text.disabled'}
              sx={{ fontWeight: 500 }}
            >
              {row.enabled ? '启用' : '禁用'}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'last_triggered_at',
        label: '最后触发时间',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Clock
              size={14}
              color='action'
            />
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {row.last_triggered_at || '-'}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'actions',
        label: '操作',
        align: 'right',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
            <Button
              size='small'
              variant='text'
              onClick={() => {}}
              startIcon={<Edit size={14} />}
            >
              编辑
            </Button>
            <Button
              size='small'
              variant='text'
              onClick={() => handleCopy(row.id)}
              startIcon={<Copy size={14} />}
            >
              复制
            </Button>
            <Button
              size='small'
              variant='text'
              onClick={() => handleToggleStatus(row.id)}
              startIcon={row.enabled ? <PowerOff size={14} /> : <Power size={14} />}
              color={row.enabled ? 'warning' : 'success'}
            >
              {row.enabled ? '禁用' : '启用'}
            </Button>
            <Button
              size='small'
              color='error'
              variant='text'
              onClick={() => handleDelete(row.id)}
              startIcon={<Trash2 size={14} />}
            >
              删除
            </Button>
          </Box>
        ),
      },
    ],
    [handleToggleStatus, handleDelete, handleCopy]
  );

  const filters = useMemo(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select' as const,
        options: [
          { label: '全部状态', value: 'all' },
          { label: '启用', value: 'enabled' },
          { label: '禁用', value: 'disabled' },
        ],
      },
      {
        id: 'severity',
        label: '严重级别',
        type: 'select' as const,
        options: [
          { label: '全部级别', value: 'all' },
          ...Object.entries(SEVERITY_CONFIG).map(([value, config]) => ({
            label: config.label,
            value,
          })),
        ],
      },
      {
        id: 'metricType',
        label: '指标类型',
        type: 'select' as const,
        options: [
          { label: '全部类型', value: 'all' },
          ...Object.entries(METRIC_TYPE_CONFIG).map(([value, config]) => ({
            label: config.label,
            value,
          })),
        ],
      },
    ],
    []
  );

  const handleFilterChange = useCallback((filters: Record<string, unknown>) => {
    if (typeof filters.status === 'string') {
      setStatusFilter(filters.status);
    }
    if (typeof filters.severity === 'string') {
      setSeverityFilter(filters.severity);
    }
    if (typeof filters.metricType === 'string') {
      setMetricTypeFilter(filters.metricType);
    }
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleCreate = useCallback(() => {
    addNotification({
      title: '提示',
      message: '新建告警规则功能开发中',
      type: 'info',
    });
  }, [addNotification]);

  return (
    <PageContainer
      headerProps={{
        pageIcon: <Settings size={20} />,
        backButton: {
          href: MONITOR_PATHS.dashboard,
        },
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={filteredRules}
        loading={loading}
        searchable
        searchPlaceholder='搜索规则名称、指标名...'
        searchValue={searchQuery}
        onSearch={setSearchQuery}
        filters={filters}
        filtersValue={{
          status: statusFilter,
          severity: severityFilter,
          metricType: metricTypeFilter,
        }}
        onFilterChange={handleFilterChange}
        pagination={{
          page,
          pageSize,
          total: filteredRules.length,
          onPageChange: handlePageChange,
        }}
        actions={[
          {
            label: '刷新',
            icon: <RefreshCw size={16} />,
            onClick: loadData,
            variant: 'outlined',
          },
          {
            label: '导出',
            icon: <Download size={16} />,
            onClick: () => {
              addNotification({
                title: '提示',
                message: '导出功能开发中',
                type: 'info',
              });
            },
            variant: 'outlined',
          },
          {
            label: '导入',
            icon: <Upload size={16} />,
            onClick: () => {
              addNotification({
                title: '提示',
                message: '导入功能开发中',
                type: 'info',
              });
            },
            variant: 'outlined',
          },
          {
            label: '新建规则',
            icon: <Plus size={16} />,
            onClick: handleCreate,
            variant: 'contained',
          },
        ]}
        onRefresh={loadData}
        emptyMessage='暂无告警规则'
      />

      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={() => {
          confirmDialogConfig?.onConfirm();
          setConfirmDialogOpen(false);
        }}
        title={confirmDialogConfig?.title || ''}
        message={confirmDialogConfig?.message || ''}
        danger={confirmDialogConfig?.danger}
      />
    </PageContainer>
  );
};

export default MonitorAlertRulesPage;
