import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  LinearProgress,
  Typography,
} from '@mui/material';
import i18n from '@/i18n';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { monitorApi, type SystemMetrics, type ServiceHealth, type Alert } from '@/api/monitor';
import { apiLogger } from '@/utils/logger';
import { useNotificationStore } from '@/store';
import { Cpu, HardDrive, Database, AlertTriangle, CheckCircle, Activity } from 'lucide-react';
import { PageContainer } from '@/components';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef } from '@/components/templates/list/types';
import { getStatusColor } from '@/utils/status';
import { QUERY_KEYS } from '@/lib/reactQuery';

const MonitorPage: React.FC = () => {
  const { addNotification } = useNotificationStore();
  const systemMetricsQuery = useQuery<SystemMetrics | null>({
    queryKey: QUERY_KEYS.AD_HOC.ADMIN_MONITOR_SYSTEM_METRICS_BASE,
    queryFn: async () => {
      const res = await monitorApi.getSystemMetrics();
      return res.success && res.data ? res.data : null;
    },
    refetchInterval: 30000,
    staleTime: 5 * 60 * 1000,
  });
  const serviceHealthQuery = useQuery<ServiceHealth[]>({
    queryKey: QUERY_KEYS.AD_HOC.ADMIN_MONITOR_SERVICE_HEALTH_BASE,
    queryFn: async () => {
      const res = await monitorApi.getServiceHealth();
      return res.success && res.data ? res.data : [];
    },
    refetchInterval: 30000,
    staleTime: 5 * 60 * 1000,
  });
  const alertsQuery = useQuery<Alert[]>({
    queryKey: QUERY_KEYS.AD_HOC.ADMIN_MONITOR_ALERTS_BASE,
    queryFn: async () => {
      const res = await monitorApi.listAlerts({ pagesize: 20 });
      return res.success && res.data ? res.data.items : [];
    },
    refetchInterval: 30000,
    staleTime: 5 * 60 * 1000,
  });

  const handleRefresh = useCallback(() => {
    systemMetricsQuery.refetch();
    serviceHealthQuery.refetch();
    alertsQuery.refetch();
  }, [systemMetricsQuery, serviceHealthQuery, alertsQuery]);

  const systemMetrics = systemMetricsQuery.data ?? null;

  useEffect(() => {
    if (systemMetricsQuery.isError) {
      apiLogger.error(i18n.t('pages.monitor_page.k0'), systemMetricsQuery.error);
      addNotification({
        type: 'error',
        title: i18n.t('admin.monitor_page.k0'),
        message: i18n.t('admin.monitor_page.k1'),
      });
    }
  }, [systemMetricsQuery.isError, systemMetricsQuery.error, addNotification]);

  useEffect(() => {
    if (serviceHealthQuery.isError) {
      apiLogger.error(i18n.t('pages.monitor_page.k1'), serviceHealthQuery.error);
      addNotification({
        type: 'error',
        title: i18n.t('admin.monitor_page.k2'),
        message: i18n.t('admin.monitor_page.k3'),
      });
    }
  }, [serviceHealthQuery.isError, serviceHealthQuery.error, addNotification]);

  useEffect(() => {
    if (alertsQuery.isError) {
      apiLogger.error(i18n.t('pages.monitor_page.k2'), alertsQuery.error);
      addNotification({
        type: 'error',
        title: i18n.t('admin.monitor_page.k4'),
        message: i18n.t('admin.monitor_page.k5'),
      });
    }
  }, [alertsQuery.isError, alertsQuery.error, addNotification]);

  const getMonitorStatusColor = (status: string) => getStatusColor(status, { category: 'monitor' });
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'error.main';
      case 'warning':
        return 'warning.main';
      case 'info':
        return 'info.main';
      default:
        return 'grey.500';
    }
  };
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}${i18n.t('pages.monitor_page.k3')}${hours}${i18n.t('pages.monitor_page.k4')}${minutes}${i18n.t('pages.monitor_page.k5')}`;
  };
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB/s`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB/s`;
  };

  const serviceHealthColumns: ColumnDef<ServiceHealth>[] = useMemo(
    () => [
      {
        id: 'service_name',
        label: i18n.t('pages.monitor_page.k5'),
        render: (row) => row.service_name,
      },
      {
        id: 'status',
        label: i18n.t('pages.monitor_page.k6'),
        align: 'center',
        render: (row) => {
          const color = getMonitorStatusColor(row.status);
          return (
            <Chip
              size='small'
              label={
                row.status === 'healthy'
                  ? i18n.t('admin.monitor_page.k8')
                  : row.status === 'degraded'
                    ? i18n.t('admin.monitor_page.k9')
                    : i18n.t('admin.monitor_page.k10')
              }
              icon={
                row.status === 'healthy' ? (
                  <CheckCircle sx={{ width: 14, height: 14 }} />
                ) : (
                  <AlertTriangle sx={{ width: 14, height: 14 }} />
                )
              }
              sx={{ bgcolor: `${color}20` }}
            />
          );
        },
      },
      {
        id: 'latency',
        label: i18n.t('pages.monitor_page.ms_7'),
        align: 'right',
        render: (row) => row.latency ?? '-',
      },
      {
        id: 'error_rate',
        label: i18n.t('pages.monitor_page.k8'),
        align: 'right',
        render: (row) => `${row.error_rate?.toFixed(2) ?? '0.00'}%`,
      },
      {
        id: 'uptime_percentage',
        label: i18n.t('pages.monitor_page.k9'),
        align: 'right',
        render: (row) => `${row.uptime_percentage?.toFixed(1) ?? '0.0'}%`,
      },
      {
        id: 'last_checked',
        label: i18n.t('pages.monitor_page.k10'),
        render: (row) => (row.last_checked ? new Date(row.last_checked).toLocaleString() : '-'),
      },
    ],
    []
  );

  const alertColumns: ColumnDef<Alert>[] = useMemo(
    () => [
      {
        id: 'title',
        label: i18n.t('pages.monitor_page.k14'),
        render: (row) => row.title,
      },
      {
        id: 'severity',
        label: i18n.t('pages.monitor_page.k15'),
        align: 'center',
        render: (row) => {
          const color = getSeverityColor(row.severity);
          return (
            <Chip
              size='small'
              label={
                row.severity === 'critical'
                  ? i18n.t('admin.monitor_page.k11')
                  : row.severity === 'warning'
                    ? i18n.t('admin.monitor_page.k12')
                    : i18n.t('admin.monitor_page.k13')
              }
              sx={{ bgcolor: `${color}20`, color }}
            />
          );
        },
      },
      {
        id: 'service_name',
        label: i18n.t('pages.monitor_page.k16'),
        render: (row) => row.service_name,
      },
      {
        id: 'message',
        label: i18n.t('pages.monitor_page.k17'),
        render: (row) => (
          <Typography
            noWrap
            sx={{ maxWidth: 300 }}
            title={row.message}
          >
            {row.message}
          </Typography>
        ),
      },
      {
        id: 'status',
        label: i18n.t('pages.monitor_page.k18'),
        align: 'center',
        render: (row) => (
          <Chip
            size='small'
            label={
              row.status === 'active'
                ? i18n.t('admin.monitor_page.k14')
                : row.status === 'resolved'
                  ? i18n.t('admin.monitor_page.k15')
                  : i18n.t('admin.monitor_page.k16')
            }
            sx={{ bgcolor: row.status === 'active' ? 'error.light' : 'success.light' }}
          />
        ),
      },
      {
        id: 'created_at',
        label: i18n.t('pages.monitor_page.k19'),
        render: (row) => new Date(row.created_at).toLocaleString(),
      },
    ],
    []
  );

  return (
    <PageContainer
      title={i18n.t('admin.monitor_page.k6')}
      subtitle={i18n.t('admin.monitor_page.k7')}
      headerProps={{
        pageIcon: <Activity sx={{ width: 24, height: 24 }} />,
        pageColor: 'success.main',
        onRefresh: handleRefresh,
      }}
      maxWidth='xl'
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)',
            },
            gap: 2,
          }}
        >
          <Card>
            <CardHeader>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Cpu sx={{ width: 16, height: 16, color: 'primary.main' }} />
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('pages.monitor_page.cpu_0')}
                </Typography>
              </Box>
            </CardHeader>
            <CardContent>
              <Typography
                variant='h4'
                sx={{
                  fontWeight: 'bold',
                  color:
                    (systemMetrics?.cpu_usage || 0) >= 80
                      ? 'error.main'
                      : (systemMetrics?.cpu_usage || 0) >= 60
                        ? 'warning.main'
                        : 'success.main',
                }}
              >
                {(systemMetrics?.cpu_usage || 0).toFixed(1)}%
              </Typography>
              <LinearProgress
                variant='determinate'
                value={systemMetrics?.cpu_usage || 0}
                sx={{ mt: 2, height: 8 }}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <HardDrive sx={{ width: 16, height: 16, color: 'primary.main' }} />
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('pages.monitor_page.k1')}
                </Typography>
              </Box>
            </CardHeader>
            <CardContent>
              <Typography
                variant='h4'
                sx={{
                  fontWeight: 'bold',
                  color:
                    (systemMetrics?.memory_usage || 0) >= 80
                      ? 'error.main'
                      : (systemMetrics?.memory_usage || 0) >= 60
                        ? 'warning.main'
                        : 'success.main',
                }}
              >
                {(systemMetrics?.memory_usage || 0).toFixed(1)}%
              </Typography>
              <LinearProgress
                variant='determinate'
                value={systemMetrics?.memory_usage || 0}
                sx={{ mt: 2, height: 8 }}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Database sx={{ width: 16, height: 16, color: 'primary.main' }} />
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('pages.monitor_page.k2')}
                </Typography>
              </Box>
            </CardHeader>
            <CardContent>
              <Typography
                variant='h4'
                sx={{
                  fontWeight: 'bold',
                  color:
                    (systemMetrics?.disk_usage || 0) >= 80
                      ? 'error.main'
                      : (systemMetrics?.disk_usage || 0) >= 60
                        ? 'warning.main'
                        : 'success.main',
                }}
              >
                {(systemMetrics?.disk_usage || 0).toFixed(1)}%
              </Typography>
              <LinearProgress
                variant='determinate'
                value={systemMetrics?.disk_usage || 0}
                sx={{ mt: 2, height: 8 }}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Activity sx={{ width: 16, height: 16, color: 'primary.main' }} />
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('pages.monitor_page.k3')}
                </Typography>
              </Box>
            </CardHeader>
            <CardContent>
              <Typography
                variant='h4'
                sx={{ fontWeight: 'bold', color: 'success.main' }}
              >
                {formatUptime(systemMetrics?.uptime || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Box>

        <ListPageTemplate<ServiceHealth>
          title={i18n.t('pages.monitor_page.k4')}
          columns={serviceHealthColumns}
          data={serviceHealthQuery.data ?? []}
          loading={serviceHealthQuery.isPending}
          getRowId={(row) => row.service_name}
          emptyMessage={i18n.t('pages.monitor_page.k11')}
          onRefresh={handleRefresh}
        />

        <ListPageTemplate<Alert>
          title={i18n.t('pages.monitor_page.k12')}
          subtitle={i18n.t('pages.monitor_page.20_13')}
          columns={alertColumns}
          data={alertsQuery.data ?? []}
          loading={alertsQuery.isPending}
          getRowId={(row) => row.id}
          emptyMessage={i18n.t('pages.monitor_page.k20')}
          onRefresh={handleRefresh}
        />
      </Box>
    </PageContainer>
  );
};

export default MonitorPage;
