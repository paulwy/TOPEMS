import React, { useCallback, useMemo, useState } from 'react';
import { Box, Typography, Chip, Switch } from '@mui/material';
import { PageContainer } from '@/components/common';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { alertRuleSchema } from '@/schemas/monitor';
import type { ColumnDef, RowAction } from '@/components/templates/list/types';
import { useNotificationStore } from '@/store';
import { monitorApi } from '@/api/monitor';
import type { AlertRuleRecord, AlertRuleCreateRequest } from '@/api/monitor/metrics';
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
const MonitorAlertRulesPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const mapRecord = (r: AlertRuleRecord): AlertRule => ({
    id: r.id,
    name: r.name,
    metric_type: r.condition?.comparison_type || 'threshold',
    metric_name: r.condition?.field || '',
    condition: `${r.condition?.operator || ''} ${String(r.condition?.value ?? '')}`.trim(),
    threshold: String(r.condition?.value ?? ''),
    unit: '',
    severity: r.severity,
    channels: (r.actions || []).map((a) => a.action_type),
    enabled: r.enabled,
    last_triggered_at: null,
    trigger_count_today: 0,
    created_at: r.created_at,
    updated_at: r.updated_at,
  });

  const toCreateRequest = (data: Partial<AlertRule>): AlertRuleCreateRequest => ({
    name: data.name || '',
    description: data.condition ?? null,
    service_name: data.metric_type ?? null,
    severity: data.severity || 'warning',
    condition: {
      field: data.metric_name || '',
      operator: (data.condition || '').split(' ')[0] || '>',
      value: data.threshold ?? '',
    },
    actions: (data.channels || []).map((c) => ({ action_type: c, config: {} })),
    enabled: data.enabled ?? true,
  });

  const fetchRules = async (): Promise<AlertRule[]> => {
    const res = await monitorApi.ruleTyped.list();
    if (!res.success || !Array.isArray(res.data)) {
      throw new Error(res.message || i18n.t('monitor.monitor_alert_rules_page.error_load'));
    }
    const rows = (res.data as unknown as AlertRuleRecord[]).map(mapRecord);
    setRules(rows);
    return rows;
  };

  const apiAdapter: CrudApiAdapter<AlertRule> = {
    list: async () => {
      const rows = await fetchRules();
      return { data: rows, total: rows.length };
    },
    create: async (data) => {
      const res = await monitorApi.ruleTyped.create(toCreateRequest(data));
      if (!res.success) {
        throw new Error(res.message || i18n.t('monitor.monitor_alert_rules_page.error_save'));
      }
      await fetchRules();
      return mapRecord(res.data as unknown as AlertRuleRecord);
    },
    update: async (id, data) => {
      const res = await monitorApi.ruleTyped.update(id, toCreateRequest(data));
      if (!res.success) {
        throw new Error(res.message || i18n.t('monitor.monitor_alert_rules_page.error_save'));
      }
      await fetchRules();
      return mapRecord(res.data as unknown as AlertRuleRecord);
    },
    delete: async (id) => {
      const res = await monitorApi.ruleTyped.delete(id);
      if (!res.success) {
        throw new Error(res.message || i18n.t('monitor.monitor_alert_rules_page.error_save'));
      }
      await fetchRules();
    },
  };
  const handleToggleStatus = useCallback(
    async (ruleId: string) => {
      const rule = rules.find((r) => r.id === ruleId);
      if (!rule) return;
      const action = rule.enabled
        ? i18n.t('monitor.monitor_alert_rules_page.k19')
        : i18n.t('monitor.monitor_alert_rules_page.k18');
      const res = await monitorApi.ruleTyped.update(ruleId, {
        ...toCreateRequest(rule),
        enabled: !rule.enabled,
      });
      if (!res.success) {
        addNotification({
          title: i18n.t('monitor.monitor_alert_rules_page.k20'),
          message: res.message || i18n.t('monitor.monitor_alert_rules_page.error_save'),
          type: 'error',
        });
        return;
      }
      await fetchRules();
      addNotification({
        title: i18n.t('monitor.monitor_alert_rules_page.k20'),
        message: `${i18n.t('pages.monitor_alert_rules_page.k4')}${action}${i18n.t('pages.monitor_alert_rules_page.k5')}`,
        type: 'success',
      });
    },
    [rules, addNotification]
  );
  const handleCopy = useCallback(
    async (ruleId: string) => {
      const rule = rules.find((r) => r.id === ruleId);
      if (!rule) return;
      const res = await monitorApi.ruleTyped.create({
        ...toCreateRequest(rule),
        name: `${rule.name}${i18n.t('pages.monitor_alert_rules_page.k6')}`,
        enabled: false,
      });
      if (!res.success) {
        addNotification({
          title: i18n.t('monitor.monitor_alert_rules_page.k21'),
          message: res.message || i18n.t('monitor.monitor_alert_rules_page.error_save'),
          type: 'error',
        });
        return;
      }
      await fetchRules();
      addNotification({
        title: i18n.t('monitor.monitor_alert_rules_page.k21'),
        message: i18n.t('monitor.monitor_alert_rules_page.k22'),
        type: 'success',
      });
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
                bgcolor: 'primary.50',
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
              sx={{ color: 'primary.700' }}
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
            sx={{ fontWeight: 700, color: 'primary.700' }}
          >
            {total}
          </Typography>
        </Box>
        <Box
          sx={{
            p: 2,
            bgcolor: 'var(--surface-2)',
            borderLeft: '3px solid',
            borderColor: 'success.main',
            borderRadius: 3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Power
              size={18}
              sx={{ color: 'var(--success-text)' }}
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
            sx={{ fontWeight: 700, color: 'var(--success-text)' }}
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
        <Box
          sx={{
            p: 2,
            bgcolor: 'var(--surface-2)',
            borderLeft: '3px solid',
            borderColor: 'warning.main',
            borderRadius: 3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <AlertTriangle
              size={18}
              sx={{ color: 'var(--warning-text)' }}
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
            sx={{ fontWeight: 700, color: 'var(--warning-text)' }}
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
        apiAdapter={apiAdapter as unknown as CrudApiAdapter}
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
