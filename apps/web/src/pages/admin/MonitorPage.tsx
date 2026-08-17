import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Typography,
  LinearProgress,
  useTheme,
} from '@mui/material';
import i18n from '@/i18n';
import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { monitorApi, type SystemMetrics, type ServiceHealth, type Alert } from '@/api/monitor';
import { apiLogger } from '@/utils/logger';
import { useNotificationStore } from '@/store';
import { LoadingSpinner } from '@topems/shared-components';
import {
  Cpu,
  HardDrive,
  Database,
  AlertTriangle,
  CheckCircle,
  Activity,
  Server,
} from 'lucide-react';
import { PageContainer } from '@/components';
import { getStatusColor } from '@/utils/status';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { designTokens } from '@topems/tokens';

const MonitorPage: React.FC = () => {
  const theme = useTheme();
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
  const loading =
    systemMetricsQuery.isLoading || serviceHealthQuery.isLoading || alertsQuery.isLoading;
  const systemMetrics = systemMetricsQuery.data ?? null;
  const serviceHealth = serviceHealthQuery.data ?? [];
  const alerts = alertsQuery.data ?? [];
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
  if (loading) return <LoadingSpinner />;
  return (
    <PageContainer
      title={i18n.t('admin.monitor_page.k6')}
      subtitle={i18n.t('admin.monitor_page.k7')}
      headerProps={{
        pageIcon: <Activity sx={{ width: 24, height: 24 }} />,
        pageColor: 'success.main',
        onRefresh: () => {
          systemMetricsQuery.refetch();
          serviceHealthQuery.refetch();
          alertsQuery.refetch();
        },
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
        <Card>
          <CardHeader>
            <Typography
              variant='h6'
              sx={{
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Server sx={{ width: 20, height: 20 }} />
              {i18n.t('pages.monitor_page.k4')}
            </Typography>
          </CardHeader>
          <CardContent>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.875rem' }}>
                <thead style={{ backgroundColor: theme.palette.grey[100] }}>
                  <tr>
                    <th
                      style={{
                        padding: `${designTokens.spacing.md} 16px`,
                        textAlign: 'left',
                        fontWeight: 500,
                      }}
                    >
                      {i18n.t('pages.monitor_page.k5')}
                    </th>
                    <th
                      style={{
                        padding: `${designTokens.spacing.md} 16px`,
                        textAlign: 'center',
                        fontWeight: 500,
                      }}
                    >
                      {i18n.t('pages.monitor_page.k6')}
                    </th>
                    <th
                      style={{
                        padding: `${designTokens.spacing.md} 16px`,
                        textAlign: 'right',
                        fontWeight: 500,
                      }}
                    >
                      {i18n.t('pages.monitor_page.ms_7')}
                    </th>
                    <th
                      style={{
                        padding: `${designTokens.spacing.md} 16px`,
                        textAlign: 'right',
                        fontWeight: 500,
                      }}
                    >
                      {i18n.t('pages.monitor_page.k8')}
                    </th>
                    <th
                      style={{
                        padding: `${designTokens.spacing.md} 16px`,
                        textAlign: 'right',
                        fontWeight: 500,
                      }}
                    >
                      {i18n.t('pages.monitor_page.k9')}
                    </th>
                    <th
                      style={{
                        padding: `${designTokens.spacing.md} 16px`,
                        textAlign: 'left',
                        fontWeight: 500,
                      }}
                    >
                      {i18n.t('pages.monitor_page.k10')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {serviceHealth.length > 0 ? (
                    serviceHealth.map((service) => (
                      <tr
                        key={service.service_name}
                        style={{ borderBottom: '1px solid' }}
                      >
                        <td style={{ padding: `${designTokens.spacing.md} 16px` }}>
                          {service.service_name}
                        </td>
                        <td
                          style={{
                            padding: `${designTokens.spacing.md} 16px`,
                            textAlign: 'center',
                          }}
                        >
                          <Chip
                            size='small'
                            label={
                              service.status === 'healthy'
                                ? i18n.t('admin.monitor_page.k8')
                                : service.status === 'degraded'
                                  ? i18n.t('admin.monitor_page.k9')
                                  : i18n.t('admin.monitor_page.k10')
                            }
                            icon={
                              service.status === 'healthy' ? (
                                <CheckCircle sx={{ width: 14, height: 14 }} />
                              ) : (
                                <AlertTriangle sx={{ width: 14, height: 14 }} />
                              )
                            }
                            sx={{
                              bgcolor: `${getMonitorStatusColor(service.status)}20`,
                            }}
                          />
                        </td>
                        <td
                          style={{ padding: `${designTokens.spacing.md} 16px`, textAlign: 'right' }}
                        >
                          {service.latency}
                        </td>
                        <td
                          style={{ padding: `${designTokens.spacing.md} 16px`, textAlign: 'right' }}
                        >
                          {service.error_rate?.toFixed(2) ?? '0.00'}%
                        </td>
                        <td
                          style={{ padding: `${designTokens.spacing.md} 16px`, textAlign: 'right' }}
                        >
                          {service.uptime_percentage?.toFixed(1) ?? '0.0'}%
                        </td>
                        <td style={{ padding: `${designTokens.spacing.md} 16px` }}>
                          {service.last_checked
                            ? new Date(service.last_checked).toLocaleString()
                            : '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          padding: `${designTokens.spacing.xl} 16px`,
                          textAlign: 'center',
                          color: theme.palette.text.disabled,
                        }}
                      >
                        {i18n.t('pages.monitor_page.k11')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Typography
              variant='h6'
              sx={{
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <AlertTriangle sx={{ width: 20, height: 20 }} />
              {i18n.t('pages.monitor_page.k12')}
            </Typography>
            <Typography
              variant='body2'
              sx={{ color: 'grey.500' }}
            >
              {i18n.t('pages.monitor_page.20_13')}
            </Typography>
          </CardHeader>
          <CardContent>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.875rem' }}>
                <thead style={{ backgroundColor: theme.palette.grey[100] }}>
                  <tr>
                    <th
                      style={{
                        padding: `${designTokens.spacing.md} 16px`,
                        textAlign: 'left',
                        fontWeight: 500,
                      }}
                    >
                      {i18n.t('pages.monitor_page.k14')}
                    </th>
                    <th
                      style={{
                        padding: `${designTokens.spacing.md} 16px`,
                        textAlign: 'center',
                        fontWeight: 500,
                      }}
                    >
                      {i18n.t('pages.monitor_page.k15')}
                    </th>
                    <th
                      style={{
                        padding: `${designTokens.spacing.md} 16px`,
                        textAlign: 'left',
                        fontWeight: 500,
                      }}
                    >
                      {i18n.t('pages.monitor_page.k16')}
                    </th>
                    <th
                      style={{
                        padding: `${designTokens.spacing.md} 16px`,
                        textAlign: 'left',
                        fontWeight: 500,
                      }}
                    >
                      {i18n.t('pages.monitor_page.k17')}
                    </th>
                    <th
                      style={{
                        padding: `${designTokens.spacing.md} 16px`,
                        textAlign: 'center',
                        fontWeight: 500,
                      }}
                    >
                      {i18n.t('pages.monitor_page.k18')}
                    </th>
                    <th
                      style={{
                        padding: `${designTokens.spacing.md} 16px`,
                        textAlign: 'left',
                        fontWeight: 500,
                      }}
                    >
                      {i18n.t('pages.monitor_page.k19')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.length > 0 ? (
                    alerts.map((alert) => (
                      <tr
                        key={alert.id}
                        style={{ borderBottom: '1px solid' }}
                      >
                        <td style={{ padding: `${designTokens.spacing.md} 16px` }}>
                          {alert.title}
                        </td>
                        <td
                          style={{
                            padding: `${designTokens.spacing.md} 16px`,
                            textAlign: 'center',
                          }}
                        >
                          <Chip
                            size='small'
                            label={
                              alert.severity === 'critical'
                                ? i18n.t('admin.monitor_page.k11')
                                : alert.severity === 'warning'
                                  ? i18n.t('admin.monitor_page.k12')
                                  : i18n.t('admin.monitor_page.k13')
                            }
                            sx={{
                              bgcolor: `${getSeverityColor(alert.severity)}20`,
                              color: getSeverityColor(alert.severity),
                            }}
                          />
                        </td>
                        <td style={{ padding: `${designTokens.spacing.md} 16px` }}>
                          {alert.service_name}
                        </td>
                        <td
                          style={{
                            padding: `${designTokens.spacing.md} 16px`,
                            maxWidth: 300,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {alert.message}
                        </td>
                        <td
                          style={{
                            padding: `${designTokens.spacing.md} 16px`,
                            textAlign: 'center',
                          }}
                        >
                          <Chip
                            size='small'
                            label={
                              alert.status === 'active'
                                ? i18n.t('admin.monitor_page.k14')
                                : alert.status === 'resolved'
                                  ? i18n.t('admin.monitor_page.k15')
                                  : i18n.t('admin.monitor_page.k16')
                            }
                            sx={{
                              bgcolor: alert.status === 'active' ? 'error.light' : 'success.light',
                            }}
                          />
                        </td>
                        <td style={{ padding: `${designTokens.spacing.md} 16px` }}>
                          {new Date(alert.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          padding: `${designTokens.spacing.xl} 16px`,
                          textAlign: 'center',
                          color: theme.palette.text.disabled,
                        }}
                      >
                        {i18n.t('pages.monitor_page.k20')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </PageContainer>
  );
};
export default MonitorPage;
