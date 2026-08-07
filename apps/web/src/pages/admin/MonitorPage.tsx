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

const MonitorPage: React.FC = () => {
  const theme = useTheme();
  const { addNotification } = useNotificationStore();

  const systemMetricsQuery = useQuery<SystemMetrics | null>({
    queryKey: ['admin-monitor-system-metrics'],
    queryFn: async () => {
      const res = await monitorApi.getSystemMetrics();
      return res.success && res.data ? res.data : null;
    },
    refetchInterval: 30000,
    staleTime: 5 * 60 * 1000,
  });

  const serviceHealthQuery = useQuery<ServiceHealth[]>({
    queryKey: ['admin-monitor-service-health'],
    queryFn: async () => {
      const res = await monitorApi.getServiceHealth();
      return res.success && res.data ? res.data : [];
    },
    refetchInterval: 30000,
    staleTime: 5 * 60 * 1000,
  });

  const alertsQuery = useQuery<Alert[]>({
    queryKey: ['admin-monitor-alerts'],
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
      apiLogger.error('加载系统指标失败:', systemMetricsQuery.error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载系统指标',
      });
    }
  }, [systemMetricsQuery.isError, systemMetricsQuery.error, addNotification]);

  useEffect(() => {
    if (serviceHealthQuery.isError) {
      apiLogger.error('加载服务健康失败:', serviceHealthQuery.error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载服务健康数据',
      });
    }
  }, [serviceHealthQuery.isError, serviceHealthQuery.error, addNotification]);

  useEffect(() => {
    if (alertsQuery.isError) {
      apiLogger.error('加载告警列表失败:', alertsQuery.error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载告警列表',
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
    return `${days}天 ${hours}小时 ${minutes}分钟`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB/s`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB/s`;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <PageContainer
      title='系统监控'
      subtitle='实时监控系统运行状态和服务健康度'
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
                  CPU 使用率
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
                  内存使用率
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
                  磁盘使用率
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
                  系统运行时间
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
              服务健康状态
            </Typography>
          </CardHeader>
          <CardContent>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.875rem' }}>
                <thead style={{ backgroundColor: theme.palette.grey[100] }}>
                  <tr>
                    <th
                      style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontWeight: 500,
                      }}
                    >
                      服务名称
                    </th>
                    <th
                      style={{
                        padding: '12px 16px',
                        textAlign: 'center',
                        fontWeight: 500,
                      }}
                    >
                      状态
                    </th>
                    <th
                      style={{
                        padding: '12px 16px',
                        textAlign: 'right',
                        fontWeight: 500,
                      }}
                    >
                      延迟 (ms)
                    </th>
                    <th
                      style={{
                        padding: '12px 16px',
                        textAlign: 'right',
                        fontWeight: 500,
                      }}
                    >
                      错误率
                    </th>
                    <th
                      style={{
                        padding: '12px 16px',
                        textAlign: 'right',
                        fontWeight: 500,
                      }}
                    >
                      可用性
                    </th>
                    <th
                      style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontWeight: 500,
                      }}
                    >
                      最后检查
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
                        <td style={{ padding: '12px 16px' }}>{service.service_name}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <Chip
                            size='small'
                            label={
                              service.status === 'healthy'
                                ? '健康'
                                : service.status === 'degraded'
                                  ? '降级'
                                  : '异常'
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
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          {service.latency}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          {service.error_rate?.toFixed(2) ?? '0.00'}%
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          {service.uptime_percentage?.toFixed(1) ?? '0.0'}%
                        </td>
                        <td style={{ padding: '12px 16px' }}>
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
                          padding: '32px 16px',
                          textAlign: 'center',
                          color: theme.palette.text.disabled,
                        }}
                      >
                        暂无服务健康数据
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
              告警列表
            </Typography>
            <Typography
              variant='body2'
              sx={{ color: 'grey.500' }}
            >
              最近20条告警记录
            </Typography>
          </CardHeader>
          <CardContent>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.875rem' }}>
                <thead style={{ backgroundColor: theme.palette.grey[100] }}>
                  <tr>
                    <th
                      style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontWeight: 500,
                      }}
                    >
                      标题
                    </th>
                    <th
                      style={{
                        padding: '12px 16px',
                        textAlign: 'center',
                        fontWeight: 500,
                      }}
                    >
                      级别
                    </th>
                    <th
                      style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontWeight: 500,
                      }}
                    >
                      服务
                    </th>
                    <th
                      style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontWeight: 500,
                      }}
                    >
                      消息
                    </th>
                    <th
                      style={{
                        padding: '12px 16px',
                        textAlign: 'center',
                        fontWeight: 500,
                      }}
                    >
                      状态
                    </th>
                    <th
                      style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontWeight: 500,
                      }}
                    >
                      创建时间
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
                        <td style={{ padding: '12px 16px' }}>{alert.title}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <Chip
                            size='small'
                            label={
                              alert.severity === 'critical'
                                ? '严重'
                                : alert.severity === 'warning'
                                  ? '警告'
                                  : '信息'
                            }
                            sx={{
                              bgcolor: `${getSeverityColor(alert.severity)}20`,
                              color: getSeverityColor(alert.severity),
                            }}
                          />
                        </td>
                        <td style={{ padding: '12px 16px' }}>{alert.service_name}</td>
                        <td
                          style={{
                            padding: '12px 16px',
                            maxWidth: 300,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {alert.message}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <Chip
                            size='small'
                            label={
                              alert.status === 'active'
                                ? '活跃'
                                : alert.status === 'resolved'
                                  ? '已解决'
                                  : '已确认'
                            }
                            sx={{
                              bgcolor: alert.status === 'active' ? 'error.light' : 'success.light',
                            }}
                          />
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {new Date(alert.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          padding: '32px 16px',
                          textAlign: 'center',
                          color: theme.palette.text.disabled,
                        }}
                      >
                        暂无告警记录
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
