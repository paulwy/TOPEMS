/**
 * 告警历史页面
 *
 * 使用 CrudPage 组件实现 schema 驱动的告警历史查看，
 * 支持列表展示、详情查看、确认/解决操作、指标筛选和统计卡片。
 *
 * @module pages/monitor
 * @path /monitor/alert-history
 */
import React, { useMemo, useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import i18n from '@/i18n';
import { AlertTriangle, CheckCircle, Clock, Bell, Check, Download } from 'lucide-react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { PageContainer } from '@/components/common';
import { useNotification } from '@/hooks/useNotification';
import { apiLogger } from '@/utils/logger';
import { MONITOR_PATHS } from '@/modules/monitor/config';
import { monitorApi, type Alert, type AlertQueryParams } from '@/api/monitor';
import { alertHistorySchema } from '@/schemas/monitor';
import { QUERY_KEYS } from '@/lib/reactQuery';

const CRUD_QUERY_KEY = ['monitor_alert_history'];
const METRIC_FILTER_OPTIONS = [
  { label: 'CPU', value: 'cpu' },
  { label: i18n.t('monitor.monitor_alert_history_page.k0'), value: 'memory' },
  { label: i18n.t('monitor.monitor_alert_history_page.k1'), value: 'disk' },
  { label: i18n.t('monitor.monitor_alert_history_page.k2'), value: 'network' },
  { label: 'API', value: 'api' },
  { label: i18n.t('monitor.monitor_alert_history_page.k3'), value: 'database' },
];
const renderStatsCards = (rows: Record<string, unknown>[], total: number): React.ReactNode => {
  const alerts = rows as unknown as Alert[];
  const totalCount = total || alerts.length;
  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;
  const activeCount = alerts.filter((a) => a.status === 'active').length;
  const resolvedCount = alerts.filter((a) => a.status === 'resolved').length;
  const resolvedAlerts = alerts.filter((a) => a.resolved_at);
  const avgResolutionTime = resolvedAlerts.length
    ? `${Math.round(
        resolvedAlerts.reduce((acc, a) => {
          const created = new Date(a.created_at).getTime();
          const resolved = new Date(a.resolved_at!).getTime();
          return acc + (resolved - created) / 60000;
        }, 0) / resolvedAlerts.length
      )}{i18n.t('pages.monitor_alert_history_page.k0')}`
    : '-';
  const stats = [
    {
      id: 'total-alerts',
      title: i18n.t('monitor.monitor_alert_history_page.k4'),
      value: totalCount,
      icon: <Bell size={20} />,
      color: 'primary' as const,
    },
    {
      id: 'critical-alerts',
      title: i18n.t('monitor.monitor_alert_history_page.k5'),
      value: criticalCount,
      icon: <AlertTriangle size={20} />,
      color: 'error' as const,
    },
    {
      id: 'warning-alerts',
      title: i18n.t('monitor.monitor_alert_history_page.k6'),
      value: warningCount,
      icon: <AlertTriangle size={20} />,
      color: 'warning' as const,
    },
    {
      id: 'active-alerts',
      title: i18n.t('monitor.monitor_alert_history_page.k7'),
      value: activeCount,
      icon: <Clock size={20} />,
      color: 'error' as const,
    },
    {
      id: 'resolved-alerts',
      title: i18n.t('monitor.monitor_alert_history_page.k8'),
      value: resolvedCount,
      icon: <CheckCircle size={20} />,
      color: 'success' as const,
    },
    {
      id: 'avg-resolution',
      title: i18n.t('monitor.monitor_alert_history_page.k9'),
      value: avgResolutionTime,
      icon: <Clock size={20} />,
      color: 'secondary' as const,
    },
  ];
  return (
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
  );
};
const MonitorAlertHistoryPage: React.FC = () => {
  const { error: notifyError, success: notifySuccess } = useNotification();
  const queryClient = useQueryClient();
  const [metricFilter, setMetricFilter] = useState<string>('all');
  const invalidateAlerts = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: CRUD_QUERY_KEY,
      exact: false,
      refetchType: 'active',
    });
  }, [queryClient]);
  const acknowledgeMutation = useMutation({
    mutationFn: async (id: string) => monitorApi.acknowledgeAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.MONITOR.DASHBOARD,
        exact: false,
        refetchType: 'active',
      });
      notifySuccess(i18n.t('monitor.monitor_alert_history_page.k10'));
      invalidateAlerts();
    },
    onError: (err: unknown) => {
      apiLogger.error(i18n.t('pages.monitor_alert_history_page.k0'), err);
      notifyError(i18n.t('monitor.monitor_alert_history_page.k11'));
    },
  });
  const resolveMutation = useMutation({
    mutationFn: async (id: string) => monitorApi.resolveAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.MONITOR.DASHBOARD,
        exact: false,
        refetchType: 'active',
      });
      notifySuccess(i18n.t('monitor.monitor_alert_history_page.k12'));
      invalidateAlerts();
    },
    onError: (err: unknown) => {
      apiLogger.error(i18n.t('pages.monitor_alert_history_page.k1'), err);
      notifyError(i18n.t('monitor.monitor_alert_history_page.k13'));
    },
  });
  const handleAcknowledge = useCallback(
    (row: Record<string, unknown>) => {
      const alert = row as unknown as Alert;
      acknowledgeMutation.mutate(alert.id);
    },
    [acknowledgeMutation]
  );
  const handleResolve = useCallback(
    (row: Record<string, unknown>) => {
      const alert = row as unknown as Alert;
      resolveMutation.mutate(alert.id);
    },
    [resolveMutation]
  );
  const handleExport = useCallback(async () => {
    try {
      const response = await monitorApi.listAlerts({ pagesize: 1000 });
      const alerts = response.data?.items ?? [];
      const headers = [
        i18n.t('monitor.monitor_alert_history_page.k20'),
        i18n.t('monitor.monitor_alert_history_page.k19'),
        i18n.t('monitor.monitor_alert_history_page.k18'),
        i18n.t('monitor.monitor_alert_history_page.k17'),
        i18n.t('monitor.monitor_alert_history_page.k16'),
        i18n.t('monitor.monitor_alert_history_page.k15'),
        i18n.t('monitor.monitor_alert_history_page.k14'),
      ];
      const rows = alerts.map((a) => [
        a.title,
        a.severity,
        a.status,
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
      link.download = `${i18n.t('pages.monitor_alert_history_page.__2')}${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      notifySuccess(i18n.t('monitor.monitor_alert_history_page.k21'));
    } catch (err: unknown) {
      apiLogger.error(i18n.t('pages.monitor_alert_history_page.k3'), err);
      notifyError(i18n.t('monitor.monitor_alert_history_page.k22'));
    }
  }, [notifySuccess, notifyError]);
  const apiAdapter = useMemo<CrudApiAdapter<Alert>>(
    () => ({
      list: async (params) => {
        const queryParams: AlertQueryParams = { pagesize: 100 };
        if (params?.severity && params.severity !== 'all') {
          queryParams.severity = params.severity as string;
        }
        if (params?.status && params.status !== 'all') {
          queryParams.status = params.status as string;
        }
        const response = await monitorApi.listAlerts(queryParams);
        let items = response.data?.items ?? [];
        const total = response.data?.total ?? 0;
        const metric = params?.metricFilter as string | undefined;
        if (metric && metric !== 'all') {
          items = items.filter((a) => a.alert_type.toLowerCase().includes(metric));
        }
        return { data: items, total };
      },
      create: async () => {
        throw new Error(i18n.t('monitor.monitor_alert_history_page.k23'));
      },
      update: async () => {
        throw new Error(i18n.t('monitor.monitor_alert_history_page.k24'));
      },
      delete: async () => {
        throw new Error(i18n.t('monitor.monitor_alert_history_page.k25'));
      },
    }),
    []
  );
  const customRowActions = useMemo<RowAction[]>(
    () => [
      {
        label: i18n.t('monitor.monitor_alert_history_page.k26'),
        icon: <Check size={16} />,
        color: 'warning',
        onClick: (row: Record<string, unknown>) => {
          const alert = row as unknown as Alert;
          if (alert.status === 'active') {
            handleAcknowledge(row);
          }
        },
        show: (row: Record<string, unknown>) => {
          const alert = row as unknown as Alert;
          return alert.status === 'active';
        },
      },
      {
        label: i18n.t('monitor.monitor_alert_history_page.k27'),
        icon: <CheckCircle size={16} />,
        color: 'success',
        onClick: (row: Record<string, unknown>) => {
          const alert = row as unknown as Alert;
          if (alert.status === 'acknowledged') {
            handleResolve(row);
          }
        },
        show: (row: Record<string, unknown>) => {
          const alert = row as unknown as Alert;
          return alert.status === 'acknowledged';
        },
      },
    ],
    [handleAcknowledge, handleResolve]
  );
  const headerContent = useCallback(
    (rows: Record<string, unknown>[], total: number) => {
      return (
        <>
          {renderStatsCards(rows, total)}
          <Box sx={{ pb: 2 }}>
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
    },
    [metricFilter]
  );
  return (
    <PageContainer
      title={i18n.t('monitor.monitor_alert_history_page.k28')}
      subtitle={i18n.t('monitor.monitor_alert_history_page.k29')}
      headerProps={{
        pageIcon: <Clock size={20} />,
        backButton: {
          href: MONITOR_PATHS.dashboard,
        },
        children: (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title={i18n.t('monitor.monitor_alert_history_page.k30')}>
              <IconButton
                size='small'
                onClick={handleExport}
                aria-label={i18n.t('monitor.monitor_alert_history_page.k31')}
              >
                <Download size={18} />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      }}
    >
      <CrudPage
        schema={alertHistorySchema}
        apiAdapter={apiAdapter}
        extraQueryParams={{ metricFilter }}
        customRowActions={customRowActions}
        headerContent={headerContent}
        breadcrumbs={[
          { label: i18n.t('monitor.monitor_alert_history_page.k33') },
          { label: i18n.t('monitor.monitor_alert_history_page.k32') },
        ]}
      />
    </PageContainer>
  );
};
export default MonitorAlertHistoryPage;
