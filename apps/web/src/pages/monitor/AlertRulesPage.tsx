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

import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { ColumnDef, RowAction } from '@/components/templates/list/types';
import { useNotificationStore } from '@/store';
import { PageContainer } from '@/components/common';
import { MONITOR_PATHS } from '@/modules/monitor/config';
import { metricsApi, type AlertRuleRecord, type RuleAction } from '@/api/monitor/metrics';
import { alertRuleSchema } from '@/schemas/monitor';

const SEVERITY_CONFIG: Record<
  string,
  { label: string; color: 'error' | 'warning' | 'info' | 'default' }
> = {
  critical: { label: '严重', color: 'error' },
  error: { label: '错误', color: 'error' },
  warning: { label: '警告', color: 'warning' },
  info: { label: '信息', color: 'info' },
};

const ACTION_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  notification: { label: '通知', icon: <Bell size={14} /> },
  email: { label: '邮件', icon: <Mail size={14} /> },
  sms: { label: '短信', icon: <Smartphone size={14} /> },
  webhook: { label: 'Webhook', icon: <Webhook size={14} /> },
  wechat: { label: '企业微信', icon: <MessageSquare size={14} /> },
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

const renderActionsCell = (row: Record<string, unknown>) => {
  const rule = row as unknown as AlertRuleRecord;
  const actions = rule.actions as RuleAction[];
  if (actions.length === 0) {
    return (
      <Typography
        variant='caption'
        color='text.disabled'
      >
        无
      </Typography>
    );
  }
  return (
    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
      {actions.slice(0, 3).map((a, idx) => {
        const cfg = ACTION_TYPE_CONFIG[a.action_type] || {
          label: a.action_type,
          icon: <Bell size={14} />,
        };
        return (
          <Chip
            key={idx}
            size='small'
            icon={cfg.icon as React.ReactElement}
            label={`${cfg.label}${a.target ? `:${a.target}` : ''}`}
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

const renderStatsCards = (rows: Record<string, unknown>[]) => {
  const rules = rows as unknown as AlertRuleRecord[];
  const total = rules.length;
  const enabled = rules.filter((r) => r.enabled).length;
  const disabled = rules.filter((r) => !r.enabled).length;
  const critical = rules.filter((r) => r.severity === 'critical' || r.severity === 'error').length;

  const stats = [
    {
      id: 'total',
      title: '规则总数',
      value: total,
      unit: '条',
      icon: <Bell size={20} />,
      color: 'primary' as const,
    },
    {
      id: 'enabled',
      title: '已启用',
      value: enabled,
      unit: '条',
      icon: <Power size={20} />,
      color: 'success' as const,
    },
    {
      id: 'disabled',
      title: '已禁用',
      value: disabled,
      unit: '条',
      icon: <PowerOff size={20} />,
      color: 'info' as const,
    },
    {
      id: 'critical',
      title: '高严重度',
      value: critical,
      unit: '条',
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

  const handleToggleRule = useCallback(
    async (rule: AlertRuleRecord) => {
      const action = rule.enabled ? '禁用' : '启用';
      try {
        if (rule.enabled) {
          await metricsApi.disableAlertRule(rule.id);
        } else {
          await metricsApi.enableAlertRule(rule.id);
        }
        addNotification({
          type: 'success',
          title: `已${action}`,
          message: `告警规则已${action}`,
        });
        void queryClient.invalidateQueries({ queryKey: CRUD_QUERY_KEY });
      } catch (err) {
        addNotification({
          type: 'error',
          title: `${action}失败`,
          message: err instanceof Error ? err.message : `${action}失败`,
        });
      }
    },
    [addNotification, queryClient]
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
        if (!existingData) throw new Error('规则不存在');
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
    []
  );

  const customColumns = useMemo<ColumnDef[]>(
    () => [
      {
        id: 'name',
        label: '规则名称',
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
        label: '服务',
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
              全局
            </Typography>
          );
        },
      },
      {
        id: 'condition',
        label: '触发条件',
        minWidth: 240,
        render: (row) => renderConditionCell(row),
      },
      {
        id: 'severity',
        label: '严重级别',
        render: (row) => {
          const r = row as unknown as AlertRuleRecord;
          const cfg = SEVERITY_CONFIG[r.severity] || {
            label: r.severity,
            color: 'default' as const,
          };
          return (
            <Chip
              size='small'
              label={cfg.label}
              color={cfg.color}
            />
          );
        },
      },
      {
        id: 'actions',
        label: '通知动作',
        minWidth: 220,
        render: (row) => renderActionsCell(row),
      },
      {
        id: 'status',
        label: '状态',
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
                {r.enabled ? '启用' : '禁用'}
              </Typography>
            </Box>
          );
        },
      },
      {
        id: 'updated_at',
        label: '更新时间',
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
    [theme, handleToggleRule]
  );

  const customRowActions = useMemo<RowAction[]>(
    () => [
      {
        label: '启用/禁用',
        icon: <Power size={16} />,
        onClick: (row: Record<string, unknown>) => {
          const r = row as unknown as AlertRuleRecord;
          void handleToggleRule(r);
        },
      },
    ],
    [handleToggleRule]
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
        headerContent={renderStatsCards}
        breadcrumbs={[{ label: '监控' }, { label: '告警规则' }]}
      />
    </PageContainer>
  );
};

export default AlertRulesPage;
