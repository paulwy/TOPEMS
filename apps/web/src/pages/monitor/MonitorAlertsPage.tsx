/**
 * 告警管理页面
 *
 * 使用 CrudPage 组件实现 schema 驱动的告警管理，
 * 支持列表展示、确认/解决操作、批量处理、Tab 切换和统计卡片。
 *
 * @module pages/monitor
 * @path /monitor/alerts
 */
import React, { useMemo, useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material';
import i18n from '@/i18n';
import {
  AlertTriangle,
  AlertCircle,
  Bell,
  Clock,
  CheckSquare,
  CheckCircle,
  Ban,
  Download,
} from 'lucide-react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { PageContainer } from '@/components/common';
import { useNotificationStore } from '@/store';
import { extractErrorMessage } from '@/utils/errors';
import { MONITOR_PATHS } from '@/modules/monitor/config';
import { monitorApi, type Alert, type AlertQueryParams } from '@/api/monitor';
import { getAlertSchema, getSeverityLabels, getStatusLabels } from '@/schemas/monitor';
import { queryClient, QUERY_KEYS } from '@/lib/reactQuery';

type AlertSeverity = 'critical' | 'warning' | 'info';
type AlertStatus = 'active' | 'acknowledged' | 'resolved';
type TabType = 'all' | 'critical' | 'warning' | 'info' | 'resolved';
const CRUD_QUERY_KEY = ['monitor_alert'];
const renderStatsCards = (rows: Record<string, unknown>[]): React.ReactNode => {
  const alerts = rows as unknown as Alert[];
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
  const stats = [
    {
      id: 'active',
      title: i18n.t('monitor.monitor_alerts_page.k0'),
      value: activeCount,
      icon: <Bell size={20} />,
      color: 'error' as const,
    },
    {
      id: 'critical',
      title: i18n.t('monitor.monitor_alerts_page.k1'),
      value: criticalCount,
      icon: <AlertCircle size={20} />,
      color: 'error' as const,
    },
    {
      id: 'warning',
      title: i18n.t('monitor.monitor_alerts_page.k2'),
      value: warningCount,
      icon: <AlertTriangle size={20} />,
      color: 'warning' as const,
    },
    {
      id: 'today',
      title: i18n.t('monitor.monitor_alerts_page.k3'),
      value: todayCount,
      icon: <Clock size={20} />,
      color: 'primary' as const,
    },
  ];
  return (
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
  );
};
export const MonitorAlertsPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const invalidateAlerts = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: CRUD_QUERY_KEY,
      exact: false,
      refetchType: 'active',
    });
  }, [queryClient]);
  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) => monitorApi.acknowledgeAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.MONITOR.DASHBOARD,
        exact: false,
        refetchType: 'active',
      });
      invalidateAlerts();
      addNotification({
        title: i18n.t('monitor.monitor_alerts_page.k5'),
        message: i18n.t('monitor.monitor_alerts_page.k4'),
        type: 'success',
      });
    },
    onError: (err: unknown) => {
      const message = extractErrorMessage(err, i18n.t('monitor.monitor_alerts_page.k6'));
      addNotification({ title: i18n.t('monitor.monitor_alerts_page.k7'), message, type: 'error' });
    },
  });
  const resolveMutation = useMutation({
    mutationFn: (id: string) => monitorApi.resolveAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.MONITOR.DASHBOARD,
        exact: false,
        refetchType: 'active',
      });
      invalidateAlerts();
      addNotification({
        title: i18n.t('monitor.monitor_alerts_page.k9'),
        message: i18n.t('monitor.monitor_alerts_page.k8'),
        type: 'success',
      });
    },
    onError: (err: unknown) => {
      const message = extractErrorMessage(err, i18n.t('monitor.monitor_alerts_page.k10'));
      addNotification({ title: i18n.t('monitor.monitor_alerts_page.k11'), message, type: 'error' });
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
  const handleSuppress = useCallback(
    (row: Record<string, unknown>) => {
      const alert = row as unknown as Alert;
      addNotification({
        title: i18n.t('monitor.monitor_alerts_page.k12'),
        message: `${i18n.t('pages.monitor_alerts_page.k0')}${alert.title}${i18n.t('pages.monitor_alerts_page.k1')}`,
        type: 'warning',
      });
    },
    [addNotification]
  );
  const handleBatchAcknowledge = useCallback(
    async (selectedIds: string[]) => {
      try {
        await Promise.all(selectedIds.map((id) => monitorApi.acknowledgeAlert(id)));
        invalidateAlerts();
        addNotification({
          title: i18n.t('monitor.monitor_alerts_page.k13'),
          message: `${i18n.t('pages.monitor_alerts_page.k2')}${selectedIds.length}${i18n.t('pages.monitor_alerts_page.k3')}`,
          type: 'success',
        });
      } catch (err: unknown) {
        const message = extractErrorMessage(err, i18n.t('monitor.monitor_alerts_page.k14'));
        addNotification({
          title: i18n.t('monitor.monitor_alerts_page.k15'),
          message,
          type: 'error',
        });
      }
    },
    [invalidateAlerts, addNotification]
  );
  const handleBatchResolve = useCallback(
    async (selectedIds: string[]) => {
      try {
        await Promise.all(selectedIds.map((id) => monitorApi.resolveAlert(id)));
        invalidateAlerts();
        addNotification({
          title: i18n.t('monitor.monitor_alerts_page.k16'),
          message: `${i18n.t('pages.monitor_alerts_page.k4')}${selectedIds.length}${i18n.t('pages.monitor_alerts_page.k5')}`,
          type: 'success',
        });
      } catch (err: unknown) {
        const message = extractErrorMessage(err, i18n.t('monitor.monitor_alerts_page.k17'));
        addNotification({
          title: i18n.t('monitor.monitor_alerts_page.k18'),
          message,
          type: 'error',
        });
      }
    },
    [invalidateAlerts, addNotification]
  );
  const handleExport = useCallback(async () => {
    try {
      const response = await monitorApi.listAlerts({ pagesize: 1000 });
      const alerts = response.data?.items ?? [];
      const exportData = alerts.map((alert) => ({
        [i18n.t('pages.monitor_alerts_page.k0')]: alert.title,
        [i18n.t('pages.monitor_alerts_page.k1')]:
          getSeverityLabels()[alert.severity as AlertSeverity] || alert.severity,
        [i18n.t('pages.monitor_alerts_page.k2')]: alert.service_name,
        [i18n.t('pages.monitor_alerts_page.k3')]: alert.message,
        [i18n.t('pages.monitor_alerts_page.k4')]: alert.created_at,
        [i18n.t('pages.monitor_alerts_page.k5')]:
          getStatusLabels()[alert.status as AlertStatus] || alert.status,
        [i18n.t('pages.monitor_alerts_page.k6')]: alert.acknowledged_at
          ? i18n.t('monitor.monitor_alerts_page.k19')
          : '-',
        [i18n.t('pages.monitor_alerts_page.k7')]: alert.resolved_at || '-',
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
        title: i18n.t('monitor.monitor_alerts_page.k20'),
        message: i18n.t('monitor.monitor_alerts_page.k21'),
        type: 'success',
      });
    } catch (err: unknown) {
      const message = extractErrorMessage(err, i18n.t('monitor.monitor_alerts_page.k22'));
      addNotification({ title: i18n.t('monitor.monitor_alerts_page.k23'), message, type: 'error' });
    }
  }, [addNotification]);
  const apiAdapter = useMemo<CrudApiAdapter<Alert>>(
    () => ({
      list: async (params) => {
        const queryParams: AlertQueryParams = {
          page: params?.page,
          pagesize: params?.pageSize,
        };
        if (params?.severity && params.severity !== 'all') {
          queryParams.severity = params.severity as string;
        }
        if (params?.status && params.status !== 'all') {
          queryParams.status = params.status as string;
        }
        if (params?.service_name && params.service_name !== 'all') {
          queryParams.service_name = params.service_name as string;
        }
        const response = await monitorApi.listAlerts(queryParams);
        let items = response.data?.items ?? [];
        const total = response.data?.total ?? 0;
        const tab = params?.activeTab as TabType | undefined;
        if (tab && tab !== 'all') {
          if (tab === 'resolved') {
            items = items.filter((a) => a.status === 'resolved');
          } else {
            items = items.filter((a) => a.severity === tab);
          }
        }
        return { data: items, total: tab && tab !== 'all' ? items.length : total };
      },
      create: async () => {
        throw new Error(i18n.t('monitor.monitor_alerts_page.k24'));
      },
      update: async () => {
        throw new Error(i18n.t('monitor.monitor_alerts_page.k25'));
      },
      delete: async () => {
        throw new Error(i18n.t('monitor.monitor_alerts_page.k26'));
      },
    }),
    []
  );
  const customRowActions = useMemo<RowAction[]>(
    () => [
      {
        label: i18n.t('monitor.monitor_alerts_page.k27'),
        icon: <CheckSquare size={16} />,
        color: 'primary',
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
        label: i18n.t('monitor.monitor_alerts_page.k28'),
        icon: <CheckCircle size={16} />,
        color: 'success',
        onClick: (row: Record<string, unknown>) => {
          const alert = row as unknown as Alert;
          if (alert.status !== 'resolved') {
            handleResolve(row);
          }
        },
        show: (row: Record<string, unknown>) => {
          const alert = row as unknown as Alert;
          return alert.status !== 'resolved';
        },
      },
      {
        label: i18n.t('monitor.monitor_alerts_page.k29'),
        icon: <Ban size={16} />,
        onClick: handleSuppress,
      },
    ],
    [handleAcknowledge, handleResolve, handleSuppress]
  );
  const dynamicSchema = useMemo(() => {
    const alertSchema = getAlertSchema();
    return {
      ...alertSchema,
      batchActions: alertSchema.batchActions?.map((action) => {
        if (action.key === 'batch-acknowledge') {
          return { ...action, onClick: handleBatchAcknowledge };
        }
        if (action.key === 'batch-resolve') {
          return { ...action, onClick: handleBatchResolve };
        }
        return action;
      }),
    };
  }, [handleBatchAcknowledge, handleBatchResolve]);
  const headerContent = useCallback(
    (rows: Record<string, unknown>[], _total: number) => {
      return (
        <>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs
              value={activeTab}
              onChange={(_, newValue: TabType) => setActiveTab(newValue)}
              sx={{
                '& .MuiTab-root': {
                  textTransform: 'none',
                  minHeight: 48,
                  fontWeight: 500,
                },
              }}
            >
              <Tab
                label={i18n.t('monitor.monitor_alerts_page.k30')}
                value='all'
              />
              <Tab
                label={i18n.t('monitor.monitor_alerts_page.k31')}
                value='critical'
              />
              <Tab
                label={i18n.t('monitor.monitor_alerts_page.k32')}
                value='warning'
              />
              <Tab
                label={i18n.t('monitor.monitor_alerts_page.k33')}
                value='info'
              />
              <Tab
                label={i18n.t('monitor.monitor_alerts_page.k34')}
                value='resolved'
              />
            </Tabs>
          </Box>
          {renderStatsCards(rows)}
        </>
      );
    },
    [activeTab]
  );
  return (
    <PageContainer
      headerProps={{
        pageIcon: <AlertTriangle size={20} />,
        backButton: {
          href: MONITOR_PATHS.dashboard,
        },
        children: (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title={i18n.t('monitor.monitor_alerts_page.k35')}>
              <IconButton
                size='small'
                onClick={handleExport}
                aria-label={i18n.t('monitor.monitor_alerts_page.k36')}
              >
                <Download size={18} />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      }}
    >
      <CrudPage
        schema={dynamicSchema}
        apiAdapter={apiAdapter}
        extraQueryParams={{ activeTab }}
        customRowActions={customRowActions}
        headerContent={headerContent}
        breadcrumbs={[
          { label: i18n.t('monitor.monitor_alerts_page.k38') },
          { label: i18n.t('monitor.monitor_alerts_page.k37') },
        ]}
      />
    </PageContainer>
  );
};
export default MonitorAlertsPage;
