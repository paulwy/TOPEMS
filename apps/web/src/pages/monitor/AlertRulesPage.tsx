/**
 * 告警规则配置页面 (Phase 4 可观测性增强)
 *
 * 接入 monitor 后端 /rules 接口，支持告警规则的 CRUD 与启停管理。
 *
 * @module pages/monitor
 * @path /monitor/alert-rules-v2
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
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
import {
  Box,
  Typography,
  Chip,
  Button,
  Switch,
  Stack,
  Skeleton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
} from '@mui/material';

import { useNotificationStore } from '@/store';
import { PageContainer } from '@/components/common';
import { ConfirmDialog } from '@topems/shared-components';
import { ListPageTemplate, type ColumnDef, type StatCard } from '@/components/templates';
import { extractErrorMessage } from '@/utils/errors';
import { MONITOR_PATHS } from '@/modules/monitor/config';
import { metricsApi, type AlertRuleRecord, type RuleAction } from '@/api/monitor/metrics';

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

export const AlertRulesPage: React.FC = () => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  } | null>(null);

  const openConfirm = useCallback(
    (config: { title: string; message: string; onConfirm: () => void; danger?: boolean }) => {
      setConfirmDialog({ ...config, open: true });
    },
    []
  );

  const closeConfirm = () => setConfirmDialog(null);

  const rulesQuery = useQuery({
    queryKey: ['monitor', 'alert-rules', 'list'],
    queryFn: async () => {
      const res = await metricsApi.listAlertRules();
      return res.data ?? [];
    },
  });

  const enableMutation = useMutation({
    mutationFn: (id: string) => metricsApi.enableAlertRule(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: '已启用', message: '告警规则已启用' });
      void queryClient.invalidateQueries({ queryKey: ['monitor', 'alert-rules'] });
    },
    onError: (err: unknown) =>
      addNotification({
        type: 'error',
        title: '启用失败',
        message: extractErrorMessage(err, '启用失败'),
      }),
  });

  const disableMutation = useMutation({
    mutationFn: (id: string) => metricsApi.disableAlertRule(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: '已禁用', message: '告警规则已禁用' });
      void queryClient.invalidateQueries({ queryKey: ['monitor', 'alert-rules'] });
    },
    onError: (err: unknown) =>
      addNotification({
        type: 'error',
        title: '禁用失败',
        message: extractErrorMessage(err, '禁用失败'),
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => metricsApi.deleteAlertRule(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: '已删除', message: '告警规则已删除' });
      void queryClient.invalidateQueries({ queryKey: ['monitor', 'alert-rules'] });
    },
    onError: (err: unknown) =>
      addNotification({
        type: 'error',
        title: '删除失败',
        message: extractErrorMessage(err, '删除失败'),
      }),
  });

  const rules: AlertRuleRecord[] = rulesQuery.data ?? [];
  const loading = rulesQuery.isLoading;

  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      if (search) {
        const k = search.toLowerCase();
        if (
          !r.name.toLowerCase().includes(k) &&
          !(r.description?.toLowerCase().includes(k) ?? false) &&
          !(r.service_name?.toLowerCase().includes(k) ?? false)
        ) {
          return false;
        }
      }
      if (statusFilter === 'enabled' && !r.enabled) return false;
      if (statusFilter === 'disabled' && r.enabled) return false;
      if (severityFilter !== 'all' && r.severity !== severityFilter) return false;
      if (serviceFilter !== 'all' && r.service_name !== serviceFilter) return false;
      return true;
    });
  }, [rules, search, statusFilter, severityFilter, serviceFilter]);

  const stats: StatCard[] = useMemo(() => {
    const total = rules.length;
    const enabled = rules.filter((r) => r.enabled).length;
    const disabled = rules.filter((r) => !r.enabled).length;
    const critical = rules.filter(
      (r) => r.severity === 'critical' || r.severity === 'error'
    ).length;
    return [
      {
        id: 'total',
        title: '规则总数',
        value: total,
        unit: '条',
        icon: <Bell size={20} />,
        color: 'primary',
      },
      {
        id: 'enabled',
        title: '已启用',
        value: enabled,
        unit: '条',
        icon: <Power size={20} />,
        color: 'success',
      },
      {
        id: 'disabled',
        title: '已禁用',
        value: disabled,
        unit: '条',
        icon: <PowerOff size={20} />,
        color: 'info',
      },
      {
        id: 'critical',
        title: '高严重度',
        value: critical,
        unit: '条',
        icon: <AlertTriangle size={20} />,
        color: 'error',
      },
    ];
  }, [rules]);

  const serviceOptions = useMemo(() => {
    const set = new Set<string>();
    rules.forEach((r) => r.service_name && set.add(r.service_name));
    return Array.from(set);
  }, [rules]);

  const handleToggle = useCallback(
    (rule: AlertRuleRecord) => {
      const action = rule.enabled ? '禁用' : '启用';
      openConfirm({
        title: `确认${action}`,
        message: `确定要${action}告警规则"${rule.name}"吗？`,
        danger: rule.enabled,
        onConfirm: () => {
          if (rule.enabled) {
            disableMutation.mutate(rule.id);
          } else {
            enableMutation.mutate(rule.id);
          }
        },
      });
    },
    [openConfirm, enableMutation, disableMutation]
  );

  const handleDelete = useCallback(
    (rule: AlertRuleRecord) => {
      openConfirm({
        title: '确认删除',
        message: `确定要删除告警规则"${rule.name}"吗？此操作不可恢复。`,
        danger: true,
        onConfirm: () => deleteMutation.mutate(rule.id),
      });
    },
    [openConfirm, deleteMutation]
  );

  const renderCondition = (rule: AlertRuleRecord) => {
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

  const renderActions = (actions: RuleAction[]) => {
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

  const columns: ColumnDef<AlertRuleRecord>[] = useMemo(
    () => [
      {
        id: 'name',
        label: '规则名称',
        minWidth: 220,
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
                {row.name}
              </Typography>
              {row.description && (
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {row.description}
                </Typography>
              )}
            </Box>
          </Box>
        ),
      },
      {
        id: 'service',
        label: '服务',
        render: (row) =>
          row.service_name ? (
            <Chip
              size='small'
              label={row.service_name}
              variant='outlined'
            />
          ) : (
            <Typography
              variant='caption'
              color='text.disabled'
            >
              全局
            </Typography>
          ),
      },
      {
        id: 'condition',
        label: '触发条件',
        minWidth: 240,
        render: (row) => renderCondition(row),
      },
      {
        id: 'severity',
        label: '严重级别',
        render: (row) => {
          const cfg = SEVERITY_CONFIG[row.severity] || {
            label: row.severity,
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
        render: (row) => renderActions(row.actions),
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Switch
              size='small'
              color='success'
              checked={row.enabled}
              onChange={() => handleToggle(row)}
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
        id: 'updated_at',
        label: '更新时间',
        render: (row) => (
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {new Date(row.updated_at).toLocaleString('zh-CN')}
          </Typography>
        ),
      },
      {
        id: 'row_actions',
        label: '操作',
        align: 'right',
        render: (row) => (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
            <Button
              size='small'
              variant='text'
              onClick={() =>
                addNotification({
                  type: 'info',
                  title: '提示',
                  message: '编辑功能开发中',
                })
              }
              startIcon={<Edit size={14} />}
            >
              编辑
            </Button>
            <Button
              size='small'
              variant='text'
              color={row.enabled ? 'warning' : 'success'}
              onClick={() => handleToggle(row)}
              startIcon={row.enabled ? <PowerOff size={14} /> : <Power size={14} />}
            >
              {row.enabled ? '禁用' : '启用'}
            </Button>
            <Button
              size='small'
              variant='text'
              color='error'
              onClick={() => handleDelete(row)}
              startIcon={<Trash2 size={14} />}
            >
              删除
            </Button>
          </Box>
        ),
      },
    ],
    [theme, handleToggle, handleDelete, addNotification]
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
          ...Object.entries(SEVERITY_CONFIG).map(([v, c]) => ({ label: c.label, value: v })),
        ],
      },
      {
        id: 'service',
        label: '服务',
        type: 'select' as const,
        options: [
          { label: '全部服务', value: 'all' },
          ...serviceOptions.map((s) => ({ label: s, value: s })),
        ],
      },
    ],
    [serviceOptions]
  );

  const handleFilterChange = useCallback((next: Record<string, unknown>) => {
    if (typeof next.status === 'string') setStatusFilter(next.status);
    if (typeof next.severity === 'string') setSeverityFilter(next.severity);
    if (typeof next.service === 'string') setServiceFilter(next.service);
    setPage(1);
  }, []);

  const handleRefresh = () => rulesQuery.refetch();

  const handleCreate = () =>
    addNotification({
      type: 'info',
      title: '提示',
      message: '告警规则创建向导开发中',
    });

  const renderStats = () => (
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

  return (
    <PageContainer
      headerProps={{
        pageIcon: <Bell size={20} />,
        backButton: { href: MONITOR_PATHS.dashboard },
      }}
    >
      {loading ? (
        <Paper sx={{ p: 2, borderRadius: 2, mb: 2 }}>
          <Skeleton
            variant='rectangular'
            height={80}
            sx={{ mb: 2 }}
          />
          <Skeleton
            variant='rectangular'
            height={400}
          />
        </Paper>
      ) : (
        renderStats()
      )}
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={filteredRules}
        loading={loading}
        searchable
        searchPlaceholder='搜索规则名称、描述、服务'
        searchValue={search}
        onSearch={setSearch}
        filters={filters}
        filtersValue={{
          status: statusFilter,
          severity: severityFilter,
          service: serviceFilter,
        }}
        onFilterChange={handleFilterChange}
        pagination={{
          page,
          pageSize,
          total: filteredRules.length,
          onPageChange: setPage,
        }}
        actions={[
          {
            label: '刷新',
            icon: <RefreshCw size={16} />,
            onClick: handleRefresh,
            variant: 'outlined',
          },
          {
            label: '新建规则',
            icon: <Plus size={16} />,
            onClick: handleCreate,
            variant: 'contained',
          },
        ]}
        onRefresh={handleRefresh}
        emptyMessage='暂无告警规则'
      />

      <ConfirmDialog
        isOpen={confirmDialog?.open ?? false}
        onClose={closeConfirm}
        onConfirm={() => {
          confirmDialog?.onConfirm();
          closeConfirm();
        }}
        title={confirmDialog?.title || ''}
        message={confirmDialog?.message || ''}
        danger={confirmDialog?.danger}
      />
    </PageContainer>
  );
};

export default AlertRulesPage;
