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
import { alertSchema, SEVERITY_LABELS, STATUS_LABELS } from '@/schemas/monitor';

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
    void queryClient.invalidateQueries({ queryKey: CRUD_QUERY_KEY });
  }, [queryClient]);

  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) => monitorApi.acknowledgeAlert(id),
    onSuccess: () => {
      invalidateAlerts();
      addNotification({ title: '确认成功', message: '告警已确认', type: 'success' });
    },
    onError: (err: unknown) => {
      const message = extractErrorMessage(err, '确认操作失败');
      addNotification({ title: '操作失败', message, type: 'error' });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => monitorApi.resolveAlert(id),
    onSuccess: () => {
      invalidateAlerts();
      addNotification({ title: '已解决', message: '告警已标记为已解决', type: 'success' });
    },
    onError: (err: unknown) => {
      const message = extractErrorMessage(err, '解决操作失败');
      addNotification({ title: '操作失败', message, type: 'error' });
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
        title: '屏蔽告警',
        message: `已屏蔽「${alert.title}」告警`,
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
          title: '批量确认成功',
          message: `已确认 ${selectedIds.length} 条告警`,
          type: 'success',
        });
      } catch (err: unknown) {
        const message = extractErrorMessage(err, '批量确认失败');
        addNotification({ title: '操作失败', message, type: 'error' });
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
          title: '批量解决成功',
          message: `已解决 ${selectedIds.length} 条告警`,
          type: 'success',
        });
      } catch (err: unknown) {
        const message = extractErrorMessage(err, '批量解决失败');
        addNotification({ title: '操作失败', message, type: 'error' });
      }
    },
    [invalidateAlerts, addNotification]
  );

  const handleExport = useCallback(async () => {
    try {
      const response = await monitorApi.listAlerts({ pagesize: 1000 });
      const alerts = response.data?.items ?? [];
      const exportData = alerts.map((alert) => ({
        告警名称: alert.title,
        严重级别: SEVERITY_LABELS[alert.severity as AlertSeverity] || alert.severity,
        所属服务: alert.service_name,
        告警描述: alert.message,
        触发时间: alert.created_at,
        状态: STATUS_LABELS[alert.status as AlertStatus] || alert.status,
        确认人: alert.acknowledged_at ? '已确认' : '-',
        解决时间: alert.resolved_at || '-',
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
    } catch (err: unknown) {
      const message = extractErrorMessage(err, '导出失败');
      addNotification({ title: '导出失败', message, type: 'error' });
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
        throw new Error('告警为系统生成数据，不可手动创建');
      },
      update: async () => {
        throw new Error('告警请通过确认/解决操作更新');
      },
      delete: async () => {
        throw new Error('告警不可删除');
      },
    }),
    []
  );

  const customRowActions = useMemo<RowAction[]>(
    () => [
      {
        label: '确认',
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
        label: '解决',
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
        label: '屏蔽',
        icon: <Ban size={16} />,
        onClick: handleSuppress,
      },
    ],
    [handleAcknowledge, handleResolve, handleSuppress]
  );

  const dynamicSchema = useMemo(
    () => ({
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
    }),
    [handleBatchAcknowledge, handleBatchResolve]
  );

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
                label='全部告警'
                value='all'
              />
              <Tab
                label='严重告警'
                value='critical'
              />
              <Tab
                label='警告'
                value='warning'
              />
              <Tab
                label='通知'
                value='info'
              />
              <Tab
                label='已处理'
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
            <Tooltip title='导出告警数据'>
              <IconButton
                size='small'
                onClick={handleExport}
                aria-label='下载'
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
        breadcrumbs={[{ label: '监控' }, { label: '告警' }]}
      />
    </PageContainer>
  );
};

export default MonitorAlertsPage;
