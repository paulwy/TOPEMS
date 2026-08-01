/**
 * 告警规则配置页面
 *
 * 使用 CrudPage 组件实现 schema 驱动的告警规则管理，
 * 支持列表展示、创建、编辑、删除、启停等完整 CRUD 功能。
 *
 * @module pages/monitor
 * @path /monitor/alert-rules
 */

import React, { useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Power,
  PowerOff,
  AlertTriangle,
  Cpu,
  HardDrive,
  Database,
  Globe,
  Mail,
  Smartphone,
  MessageSquare,
  Webhook,
  Activity,
} from 'lucide-react';
import { Box, Typography, Chip, Switch, Stack, Paper } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { ColumnDef, RowAction } from '@/components/templates/list/types';
import { useNotificationStore } from '@/store';
import { PageContainer } from '@/components/common';
import { MONITOR_PATHS } from '@/modules/monitor/config';
import { metricsApi, type AlertRuleRecord, type RuleAction } from '@/api/monitor/metrics';
import { alertRuleSchema } from '@/schemas/monitor';

const SEVERITY_CONFIG: Record<
  string,
  { labelKey: string; color: 'error' | 'warning' | 'info' | 'default' }
> = {
  critical: { labelKey: 'monitor.common.severity.critical', color: 'error' },
  error: { labelKey: 'monitor.common.severity.error', color: 'error' },
  warning: { labelKey: 'monitor.common.severity.warning', color: 'warning' },
  info: { labelKey: 'monitor.common.severity.info', color: 'info' },
};

const ACTION_TYPE_CONFIG: Record<string, { labelKey: string; icon: React.ReactNode }> = {
  notification: { labelKey: 'monitor.common.action_type.notification', icon: <Bell size={14} /> },
  email: { labelKey: 'monitor.common.action_type.email', icon: <Mail size={14} /> },
  sms: { labelKey: 'monitor.common.action_type.sms', icon: <Smartphone size={14} /> },
  webhook: { labelKey: 'monitor.common.action_type.webhook', icon: <Webhook size={14} /> },
  wechat: { labelKey: 'monitor.common.action_type.wechat', icon: <MessageSquare size={14} /> },
};

const OPERATOR_LABELS: Record<string, string> = {
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  eq: '=',
  neq: '!=',
};

const FIELD_ICONS: Record<string, React.ReactNode> = {
  response_time: <Activity size={14} />,
  cpu_usage: <Cpu size={14} />,
  memory_usage: <HardDrive size={14} />,
  disk_usage: <HardDrive size={14} />,
  connection_pool_usage: <Database size={14} />,
  error_rate: <AlertTriangle size={14} />,
  request_count: <Globe size={14} />,
};

const CRUD_QUERY_KEY = ['crud', 'monitor_alert_rule'];

type SwitchWithMissingProps = React.ComponentProps<typeof Switch> & {
  checked?: boolean;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => void;
};

const ToggleSwitch = Switch as React.ComponentType<SwitchWithMissingProps>;

const renderConditionCell = (row: Record<string, unknown>) => {
  const rule = row as unknown as AlertRuleRecord;
  const op = OPERATOR_LABELS[rule.condition.operator] ?? rule.condition.operator;
  const fieldIcon = FIELD_ICONS[rule.condition.field];
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {fieldIcon}
      <Typography
        variant='body2'
        sx={{ fontFamily: 'monospace' }}
      >
        {rule.condition.field} {op} {String(rule.condition.value)}
        {rule.condition.comparison_type ? ` (${rule.condition.comparison_type})` : ''}
      </Typography>
    </Box>
  );
};

const renderActionsCell = (row: Record<string, unknown>, t: (key: string) => string) => {
  const rule = row as unknown as AlertRuleRecord;
  const actions = rule.actions as RuleAction[];
  if (actions.length === 0) {
    return (
      <Typography
        variant='caption'
        color='text.disabled'
      >
        {t('monitor.common.label.none')}
      </Typography>
    );
  }
  return (
    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
      {actions.slice(0, 3).map((a, idx) => {
        const cfg = ACTION_TYPE_CONFIG[a.action_type] || {
          labelKey: a.action_type,
          icon: <Bell size={14} />,
        };
        return (
          <Chip
            key={idx}
            size='small'
            icon={cfg.icon as React.ReactElement}
            label={`${t(cfg.labelKey)}${a.target ? `:${a.target}` : ''}`}
            variant='outlined'
            sx={{ height: 24, '& .MuiChip-icon': { ml: 0.5 } }}
          />
        );
      })}
      {actions.length > 3 && (
        <Chip
          size='small'
          label={`+${actions.length - 3}`}
          variant='outlined'
          sx={{ height: 24 }}
        />
      )}
    </Box>
  );
};

const renderStatsCards = (rows: Record<string, unknown>[], t: (key: string) => string) => {
  const rules = rows as unknown as AlertRuleRecord[];
  const total = rules.length;
  const enabled = rules.filter((r) => r.enabled).length;
  const disabled = rules.filter((r) => !r.enabled).length;
  const critical = rules.filter((r) => r.severity === 'critical' || r.severity === 'error').length;

  const stats = [
    {
      id: 'total',
      title: t('monitor.alert_rules.stat.total'),
      value: total,
      unit: t('monitor.common.unit.count'),
      icon: <Bell size={20} />,
      color: 'primary' as const,
    },
    {
      id: 'enabled',
      title: t('monitor.alert_rules.stat.enabled'),
      value: enabled,
      unit: t('monitor.common.unit.count'),
      icon: <Power size={20} />,
      color: 'success' as const,
    },
    {
      id: 'disabled',
      title: t('monitor.alert_rules.stat.disabled'),
      value: disabled,
      unit: t('monitor.common.unit.count'),
      icon: <PowerOff size={20} />,
      color: 'info' as const,
    },
    {
      id: 'critical',
      title: t('monitor.alert_rules.stat.critical'),
      value: critical,
      unit: t('monitor.common.unit.count'),
      icon: <AlertTriangle size={20} />,
      color: 'error' as const,
    },
  ];

  return (
    <Stack
      direction='row'
      spacing={2}
      sx={{ mb: 2, flexWrap: 'wrap' }}
    >
      {stats.map((s) => (
        <Paper
          key={s.id}
          sx={{
            p: 2,
            flex: '1 1 200px',
            minWidth: 180,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            borderRadius: 2,
          }}
        >
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: `${s.color}.light`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: `${s.color}.main`,
            }}
          >
            {s.icon}
          </Box>
          <Box>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {s.title}
            </Typography>
            <Typography
              variant='h5'
              sx={{ fontWeight: 700 }}
            >
              {s.value}
              <Typography
                component='span'
                variant='body2'
                color='text.secondary'
                sx={{ ml: 0.5 }}
              >
                {s.unit}
              </Typography>
            </Typography>
          </Box>
        </Paper>
      ))}
    </Stack>
  );
};

export const AlertRulesPage: React.FC = () => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const { t } = useTranslation();

  const handleToggleRule = useCallback(
    async (rule: AlertRuleRecord) => {
      const actionKey = rule.enabled
        ? 'monitor.alert_rules.action.disable'
        : 'monitor.alert_rules.action.enable';
      const action = t(actionKey);
      try {
        if (rule.enabled) {
          await metricsApi.disableAlertRule(rule.id);
        } else {
          await metricsApi.enableAlertRule(rule.id);
        }
        addNotification({
          type: 'success',
          title: t('monitor.alert_rules.message.toggle_success_title', { action }),
          message: t('monitor.alert_rules.message.toggle_success_body', { action }),
        });
        void queryClient.invalidateQueries({ queryKey: CRUD_QUERY_KEY });
      } catch (err) {
        addNotification({
          type: 'error',
          title: t('monitor.alert_rules.message.toggle_fail_title', { action }),
          message: err instanceof Error ? err.message : t('monitor.alert_rules.message.toggle_fail_body', { action }),
        });
      }
    },
    [addNotification, queryClient, t]
  );

  const apiAdapter = useMemo<CrudApiAdapter<AlertRuleRecord>>(
    () => ({
      list: async () => {
        const res = await metricsApi.listAlertRules();
        const data = res.data ?? [];
        return { data, total: data.length };
      },
      create: async (data) => {
        const payload = {
          name: data.name as string,
          description: (data.description as string) ?? null,
          service_name: (data.service_name as string) ?? null,
          severity: data.severity as string,
          enabled: (data.enabled as boolean) ?? true,
          condition: {
            field: 'cpu_usage',
            operator: 'gt',
            value: 80,
            comparison_type: null,
          },
          actions: [],
        };
        const res = await metricsApi.createAlertRule(payload);
        return res.data ?? ({} as AlertRuleRecord);
      },
      update: async (id, data) => {
        const existing = await metricsApi.getAlertRule(id);
        const existingData = existing.data;
        if (!existingData) throw new Error(t('monitor.alert_rules.message.rule_not_found'));
        const payload = {
          name: data.name as string,
          description: (data.description as string) ?? null,
          service_name: (data.service_name as string) ?? null,
          severity: data.severity as string,
          enabled: (data.enabled as boolean) ?? true,
          condition: existingData.condition,
          actions: existingData.actions,
        };
        const res = await metricsApi.updateAlertRule(id, payload);
        return res.data ?? existingData;
      },
      delete: async (id) => {
        await metricsApi.deleteAlertRule(id);
      },
    }),
    [t]
  );

  const customColumns = useMemo<ColumnDef[]>(
    () => [
      {
        id: 'name',
        label: t('monitor.alert_rules.column.name'),
        minWidth: 220,
        render: (row) => {
          const r = row as unknown as AlertRuleRecord;
          return (
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
                <Bell
                  size={18}
                  color={theme.palette.primary.main}
                />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 500 }}
                >
                  {r.name}
                </Typography>
                {r.description && (
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {r.description}
                  </Typography>
                )}
              </Box>
            </Box>
          );
        },
      },
      {
        id: 'service',
        label: t('monitor.alert_rules.column.service'),
        render: (row) => {
          const r = row as unknown as AlertRuleRecord;
          return r.service_name ? (
            <Chip
              size='small'
              label={r.service_name}
              variant='outlined'
            />
          ) : (
            <Typography
              variant='caption'
              color='text.disabled'
            >
              {t('monitor.common.label.global')}
            </Typography>
          );
        },
      },
      {
        id: 'condition',
        label: t('monitor.alert_rules.column.condition'),
        minWidth: 240,
        render: (row) => renderConditionCell(row),
      },
      {
        id: 'severity',
        label: t('monitor.alert_rules.column.severity'),
        render: (row) => {
          const r = row as unknown as AlertRuleRecord;
          const cfg = SEVERITY_CONFIG[r.severity] || {
            labelKey: r.severity,
            color: 'default' as const,
          };
          return (
            <Chip
              size='small'
              label={t(cfg.labelKey)}
              color={cfg.color}
            />
          );
        },
      },
      {
        id: 'actions',
        label: t('monitor.alert_rules.column.actions'),
        minWidth: 220,
        render: (row) => renderActionsCell(row, t),
      },
      {
        id: 'status',
        label: t('monitor.alert_rules.column.status'),
        render: (row) => {
          const r = row as unknown as AlertRuleRecord;
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ToggleSwitch
                checked={r.enabled}
                size='small'
                color='success'
                onChange={() => handleToggleRule(r)}
              />
              <Typography
                variant='body2'
                color={r.enabled ? 'success.main' : 'text.disabled'}
                sx={{ fontWeight: 500 }}
              >
                {r.enabled ? t('monitor.common.status.enable') : t('monitor.common.status.disable')}
              </Typography>
            </Box>
          );
        },
      },
      {
        id: 'updated_at',
        label: t('monitor.alert_rules.column.updated_at'),
        render: (row) => {
          const r = row as unknown as AlertRuleRecord;
          return (
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {new Date(r.updated_at).toLocaleString('zh-CN')}
            </Typography>
          );
        },
      },
    ],
    [theme, handleToggleRule, t]
  );

  const customRowActions = useMemo<RowAction[]>(
    () => [
      {
        label: t('monitor.alert_rules.action.toggle'),
        icon: <Power size={16} />,
        onClick: (row: Record<string, unknown>) => {
          const r = row as unknown as AlertRuleRecord;
          void handleToggleRule(r);
        },
      },
    ],
    [handleToggleRule, t]
  );

  return (
    <PageContainer
      headerProps={{
        pageIcon: <Bell size={20} />,
        backButton: { href: MONITOR_PATHS.dashboard },
      }}
    >
      <CrudPage
        schema={alertRuleSchema}
        apiAdapter={apiAdapter}
        customColumns={customColumns}
        customRowActions={customRowActions}
        headerContent={(rows: Record<string, unknown>[]) => renderStatsCards(rows, t)}
        breadcrumbs={[{ label: t('monitor.alert_rules.breadcrumb_monitor') }, { label: t('monitor.alert_rules.breadcrumb_alert_rules') }]}
      />
    </PageContainer>
  );
};

export default AlertRulesPage;
