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
import { AlertTriangle, CheckCircle, Clock, Bell, Check, Download } from 'lucide-react';

import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { PageContainer } from '@/components/common';
import { useNotification } from '@/hooks/useNotification';
import { apiLogger } from '@/utils/logger';
import { MONITOR_PATHS } from '@/modules/monitor/config';
import { monitorApi, type Alert, type AlertQueryParams } from '@/api/monitor';
import { alertHistorySchema } from '@/schemas/monitor';

const CRUD_QUERY_KEY = ['monitor_alert_history'];

const METRIC_FILTER_OPTIONS = [
  { label: 'CPU', value: 'cpu' },
  { label: '内存', value: 'memory' },
  { label: '磁盘', value: 'disk' },
  { label: '网络', value: 'network' },
  { label: 'API', value: 'api' },
  { label: '数据库', value: 'database' },
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
      )}分钟`
    : '-';

  const stats = [
    {
      id: 'total-alerts',
      title: '总告警数',
      value: totalCount,
      icon: <Bell size={20} />,
      color: 'primary' as const,
    },
    {
      id: 'critical-alerts',
      title: '严重告警',
      value: criticalCount,
      icon: <AlertTriangle size={20} />,
      color: 'error' as const,
    },
    {
      id: 'warning-alerts',
      title: '警告告警',
      value: warningCount,
      icon: <AlertTriangle size={20} />,
      color: 'warning' as const,
    },
    {
      id: 'active-alerts',
      title: '未处理',
      value: activeCount,
      icon: <Clock size={20} />,
      color: 'error' as const,
    },
    {
      id: 'resolved-alerts',
      title: '已解决',
      value: resolvedCount,
      icon: <CheckCircle size={20} />,
      color: 'success' as const,
    },
    {
      id: 'avg-resolution',
      title: '平均解决时间',
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
    void queryClient.invalidateQueries({ queryKey: CRUD_QUERY_KEY });
  }, [queryClient]);

  const acknowledgeMutation = useMutation({
    mutationFn: async (id: string) => monitorApi.acknowledgeAlert(id),
    onSuccess: () => {
      notifySuccess('告警已确认');
      invalidateAlerts();
    },
    onError: (err: unknown) => {
      apiLogger.error('确认告警失败:', err);
      notifyError('确认告警失败');
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => monitorApi.resolveAlert(id),
    onSuccess: () => {
      notifySuccess('告警已解决');
      invalidateAlerts();
    },
    onError: (err: unknown) => {
      apiLogger.error('解决告警失败:', err);
      notifyError('解决告警失败');
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

      const headers = ['告警标题', '级别', '状态', '来源服务', '类型', '触发时间', '解决时间'];
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
      link.download = `告警历史_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      notifySuccess('导出成功');
    } catch (err: unknown) {
      apiLogger.error('导出失败:', err);
      notifyError('导出失败');
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
        throw new Error('告警历史为只读数据，不可创建');
      },
      update: async () => {
        throw new Error('告警请通过确认/解决操作更新');
      },
      delete: async () => {
        throw new Error('告警历史不可删除');
      },
    }),
    []
  );

  const customRowActions = useMemo<RowAction[]>(
    () => [
      {
        label: '确认',
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
        label: '解决',
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
      title='告警历史'
      subtitle='查看和处理所有告警记录'
      headerProps={{
        pageIcon: <Clock size={20} />,
        backButton: {
          href: MONITOR_PATHS.dashboard,
        },
        children: (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title='导出告警历史'>
              <IconButton
                size='small'
                onClick={handleExport}
              aria-label="下载"
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
        breadcrumbs={[{ label: '监控' }, { label: '告警历史' }]}
      />
    </PageContainer>
  );
};

export default MonitorAlertHistoryPage;
