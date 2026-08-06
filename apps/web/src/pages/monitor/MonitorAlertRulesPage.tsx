import React, { useState, useMemo } from 'react';
import { Box, Typography, Chip, Switch } from '@mui/material';
import { PageContainer } from '@/components/common';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { alertRuleSchema } from '@/schemas/monitor';
import type { ColumnDef, RowAction } from '@/components/templates/list/types';
import { useNotificationStore } from '@/store';
import {
  Settings,
  Copy,
  Power,
  PowerOff,
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

const initialMockRules: AlertRule[] = [
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

const MonitorAlertRulesPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [rules, setRules] = useState<AlertRule[]>(initialMockRules);

  const mockApiAdapter: CrudApiAdapter<AlertRule> = {
    list: async () => {
      return { data: rules, total: rules.length };
    },
    create: async (data) => {
      const newRule: AlertRule = {
        ...(data as AlertRule),
        id: String(Date.now()),
        created_at: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString().split('T')[0],
      };
      setRules([...rules, newRule]);
      return newRule;
    },
    update: async (id, data) => {
      setRules(
        rules.map((r) =>
          r.id === id ? { ...r, ...data, updated_at: new Date().toISOString().split('T')[0] } : r
        )
      );
      return { ...rules.find((r) => r.id === id), ...data } as AlertRule;
    },
    delete: async (id) => {
      setRules(rules.filter((r) => r.id !== id));
    },
  };

  const handleToggleStatus = (ruleId: string) => {
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule) return;

    const action = rule.enabled ? '禁用' : '启用';
    setRules(
      rules.map((r) =>
        r.id === ruleId
          ? { ...r, enabled: !r.enabled, updated_at: new Date().toISOString().split('T')[0] }
          : r
      )
    );
    addNotification({
      title: '成功',
      message: `告警规则${action}成功`,
      type: 'success',
    });
  };

  const handleCopy = (ruleId: string) => {
    const rule = rules.find((r) => r.id === ruleId);
    if (rule) {
      const newRule: AlertRule = {
        ...rule,
        id: String(Date.now()),
        name: `${rule.name} - 副本`,
        enabled: false,
        created_at: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString().split('T')[0],
      };
      setRules([...rules, newRule]);
      addNotification({
        title: '成功',
        message: '告警规则复制成功',
        type: 'success',
      });
    }
  };

  const customColumns: ColumnDef<AlertRule>[] = useMemo(
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
                icon: <Bell size={14} />,
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
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {row.last_triggered_at || '-'}
          </Typography>
        ),
      },
    ],
    [handleToggleStatus]
  );

  const customRowActions: RowAction<AlertRule>[] = useMemo(
    () => [
      {
        label: '复制',
        icon: <Copy size={16} />,
        onClick: (row) => handleCopy(row.id),
      },
      {
        label: '启用/禁用',
        icon: <Power size={16} />,
        onClick: (row) => handleToggleStatus(row.id),
      },
    ],
    [handleCopy, handleToggleStatus]
  );

  const headerContent = (rows: Record<string, unknown>[]) => {
    const ruleList = rows as unknown as AlertRule[];
    const total = ruleList.length;
    const enabledCount = ruleList.filter((r) => r.enabled).length;
    const disabledCount = ruleList.filter((r) => !r.enabled).length;
    const totalTriggersToday = ruleList.reduce((sum, r) => sum + r.trigger_count_today, 0);

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box sx={{ p: 2, bgcolor: 'primary.100', borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Settings
              size={18}
              sx={{ color: 'primary.dark' }}
            />
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary' }}
            >
              规则总数
            </Typography>
          </Box>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700, color: 'primary.dark' }}
          >
            {total}
          </Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Power
              size={18}
              sx={{ color: 'success.700' }}
            />
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary' }}
            >
              启用规则
            </Typography>
          </Box>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700, color: 'success.700' }}
          >
            {enabledCount}
          </Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <PowerOff
              size={18}
              sx={{ color: 'text.secondary' }}
            />
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary' }}
            >
              禁用规则
            </Typography>
          </Box>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700 }}
          >
            {disabledCount}
          </Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <AlertTriangle
              size={18}
              sx={{ color: 'warning.700' }}
            />
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary' }}
            >
              今日触发次数
            </Typography>
          </Box>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700, color: 'warning.700' }}
          >
            {totalTriggersToday}
          </Typography>
        </Box>
      </Box>
    );
  };

  return (
    <PageContainer
      headerProps={{
        pageIcon: <Settings size={20} />,
      }}
    >
      <CrudPage
        schema={alertRuleSchema}
        apiAdapter={mockApiAdapter as unknown as CrudApiAdapter}
        breadcrumbs={[{ label: '监控' }, { label: '告警规则' }]}
        customColumns={customColumns as unknown as ColumnDef<Record<string, unknown>>[]}
        customRowActions={customRowActions as unknown as RowAction<Record<string, unknown>>[]}
        detailMaxWidth='md'
        headerContent={headerContent}
      />
    </PageContainer>
  );
};

export default MonitorAlertRulesPage;
