import React, { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography, Chip, Switch } from '@mui/material';
import { PageContainer } from '@/components/common';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { alertRuleSchema } from '@/schemas/monitor';
import type { ColumnDef, RowAction } from '@/components/templates/list/types';
import { useNotificationStore } from '@/store';
import { monitorApi } from '@/api/monitor';
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
import i18n from '@/i18n';

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
  memory: {
    label: i18n.t('monitor.monitor_alert_rules_page.k0'),
    color: 'success',
    icon: <HardDrive size={14} />,
  },
  disk: {
    label: i18n.t('monitor.monitor_alert_rules_page.k1'),
    color: 'warning',
    icon: <HardDrive size={14} />,
  },
  network: {
    label: i18n.t('monitor.monitor_alert_rules_page.k2'),
    color: 'info',
    icon: <Network size={14} />,
  },
  database: {
    label: i18n.t('monitor.monitor_alert_rules_page.k3'),
    color: 'error',
    icon: <Database size={14} />,
  },
  api: { label: 'API', color: 'default', icon: <Globe size={14} /> },
};
const getSeverityConfig = (): Record<
  string,
  { label: string; color: 'error' | 'warning' | 'info' }
> => ({
  critical: { label: i18n.t('monitor.monitor_alert_rules_page.k4'), color: 'error' },
  warning: { label: i18n.t('monitor.monitor_alert_rules_page.k5'), color: 'warning' },
  info: { label: i18n.t('monitor.monitor_alert_rules_page.k6'), color: 'info' },
});
const getChannelConfig = (): Record<string, { label: string; icon: React.ReactNode }> => ({
  email: { label: i18n.t('monitor.monitor_alert_rules_page.k7'), icon: <Mail size={14} /> },
  sms: { label: i18n.t('monitor.monitor_alert_rules_page.k8'), icon: <Smartphone size={14} /> },
  push: { label: i18n.t('monitor.monitor_alert_rules_page.k9'), icon: <Bell size={14} /> },
  wechat: {
    label: i18n.t('monitor.monitor_alert_rules_page.k10'),
    icon: <MessageSquare size={14} />,
  },
});
const initialMockRules: AlertRule[] = [
  {
    id: '1',
    name: i18n.t('pages.monitor_alert_rules_page.cpu_0'),
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
    name: i18n.t('monitor.monitor_alert_rules_page.k11'),
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
    name: i18n.t('monitor.monitor_alert_rules_page.k12'),
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
    name: i18n.t('monitor.monitor_alert_rules_page.k13'),
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
    name: i18n.t('monitor.monitor_alert_rules_page.k14'),
    metric_type: 'database',
    metric_name: 'db_connections',
    condition: '>',
    threshold: '500',
    unit: i18n.t('monitor.monitor_alert_rules_page.k15'),
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
    name: i18n.t('pages.monitor_alert_rules_page.api_1'),
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
    name: i18n.t('pages.monitor_alert_rules_page.api_2'),
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
    name: i18n.t('pages.monitor_alert_rules_page.cpu_3'),
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
    name: i18n.t('monitor.monitor_alert_rules_page.k16'),
    metric_type: 'database',
    metric_name: 'db_slow_queries',
    condition: '>',
    threshold: '10',
    unit: i18n.t('monitor.monitor_alert_rules_page.k17'),
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
  const { data: backendData } = useQuery({
    queryKey: ['monitor', 'alertRules'],
    queryFn: async () => {
      try {
        return await monitorApi.ruleTyped.list();
      } catch {
        return {};
      }
    },
  });
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
  const handleToggleStatus = useCallback(
    (ruleId: string) => {
      const rule = rules.find((r) => r.id === ruleId);
      if (!rule) return;
      const action = rule.enabled
        ? i18n.t('monitor.monitor_alert_rules_page.k19')
        : i18n.t('monitor.monitor_alert_rules_page.k18');
      setRules(
        rules.map((r) =>
          r.id === ruleId
            ? { ...r, enabled: !r.enabled, updated_at: new Date().toISOString().split('T')[0] }
            : r
        )
      );
      addNotification({
        title: i18n.t('monitor.monitor_alert_rules_page.k20'),
        message: `${i18n.t('pages.monitor_alert_rules_page.k4')}${action}${i18n.t('pages.monitor_alert_rules_page.k5')}`,
        type: 'success',
      });
    },
    [rules, addNotification]
  );
  const handleCopy = useCallback(
    (ruleId: string) => {
      const rule = rules.find((r) => r.id === ruleId);
      if (rule) {
        const newRule: AlertRule = {
          ...rule,
          id: String(Date.now()),
          name: `${rule.name}${i18n.t('pages.monitor_alert_rules_page.k6')}`,
          enabled: false,
          created_at: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString().split('T')[0],
        };
        setRules([...rules, newRule]);
        addNotification({
          title: i18n.t('monitor.monitor_alert_rules_page.k21'),
          message: i18n.t('monitor.monitor_alert_rules_page.k22'),
          type: 'success',
        });
      }
    },
    [rules, addNotification]
  );
  const customColumns: ColumnDef<AlertRule>[] = useMemo(
    () => [
      {
        id: 'name',
        label: i18n.t('monitor.monitor_alert_rules_page.k23'),
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
        label: i18n.t('monitor.monitor_alert_rules_page.k24'),
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
        label: i18n.t('monitor.monitor_alert_rules_page.k25'),
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
        label: i18n.t('monitor.monitor_alert_rules_page.k26'),
        render: (row) => {
          const config = getSeverityConfig()[row.severity] || {
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
        label: i18n.t('monitor.monitor_alert_rules_page.k27'),
        render: (row) => (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {row.channels.slice(0, 3).map((channel) => {
              const config = getChannelConfig()[channel] || {
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
        label: i18n.t('monitor.monitor_alert_rules_page.k28'),
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
              {row.enabled
                ? i18n.t('monitor.monitor_alert_rules_page.k30')
                : i18n.t('monitor.monitor_alert_rules_page.k29')}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'last_triggered_at',
        label: i18n.t('monitor.monitor_alert_rules_page.k31'),
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
        label: i18n.t('monitor.monitor_alert_rules_page.k32'),
        icon: <Copy size={16} />,
        onClick: (row) => handleCopy(row.id),
      },
      {
        label: i18n.t('monitor.monitor_alert_rules_page.k33'),
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
              {i18n.t('pages.monitor_alert_rules_page.k0')}
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
              {i18n.t('pages.monitor_alert_rules_page.k1')}
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
              {i18n.t('pages.monitor_alert_rules_page.k2')}
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
              {i18n.t('pages.monitor_alert_rules_page.k3')}
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
        breadcrumbs={[
          { label: i18n.t('monitor.monitor_alert_rules_page.k35') },
          { label: i18n.t('monitor.monitor_alert_rules_page.k34') },
        ]}
        customColumns={customColumns as unknown as ColumnDef<Record<string, unknown>>[]}
        customRowActions={customRowActions as unknown as RowAction<Record<string, unknown>>[]}
        detailMaxWidth='md'
        headerContent={headerContent}
      />
    </PageContainer>
  );
};
export default MonitorAlertRulesPage;
