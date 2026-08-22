import {
  Card,
  CardContent,
  Chip,
  Typography,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Button,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import i18n from '@/i18n';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  RefreshCw,
  Bell,
  Settings,
  TrendingUp,
  Server,
  Cpu,
} from 'lucide-react';
import { PageContainer } from '@/components/common';
import { monitoringApi } from '@/api/admin/monitoring';
import type {
  Alert,
  AlertRule,
  SystemHealth,
  AlertStats,
  CreateAlertRuleRequest,
  UpdateAlertRuleRequest,
} from '@/api/admin/monitoring';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { extractErrorMessage } from '@/utils/errors';

import { QUERY_KEYS } from '@/lib/reactQuery';
import { getChipStatusColor as getStatusColor } from '@/utils/status';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef } from '@/components/templates/list/types';
import type { FilterConfig } from '@topems/shared-components';

interface MonitoringAlertPageProps {
  onNavigate?: (page: string) => void;
}

type TabType = 'alerts' | 'rules' | 'health';

const MonitoringAlertPage: React.FC<MonitoringAlertPageProps> = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('alerts');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);

  const PER_PAGE = 20;

  const alertsQuery = useQuery<{ items: Alert[]; total: number }>({
    queryKey: [
      ...QUERY_KEYS.AD_HOC.ADMIN_MONITORING_ALERTS_BASE,
      currentPage,
      searchQuery,
      filterLevel,
      filterStatus,
    ],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page: currentPage,
        per_page: PER_PAGE,
      };
      if (searchQuery) params.query = searchQuery;
      if (filterLevel !== 'all') params.level = filterLevel;
      if (filterStatus !== 'all') params.status = filterStatus;

      const response = await monitoringApi.listAlerts(params as never);
      if (response.success && response.data) {
        return { items: response.data.items || [], total: response.data.total || 0 };
      }
      return { items: [], total: 0 };
    },
    enabled: activeTab === 'alerts',
    staleTime: 5 * 60 * 1000,
  });

  const rulesQuery = useQuery<{ items: AlertRule[]; total: number }>({
    queryKey: QUERY_KEYS.AD_HOC.ADMIN_MONITORING_RULES_BASE,
    queryFn: async () => {
      const response = await monitoringApi.listAlertRules();
      if (response.success && response.data) {
        return { items: response.data.items || [], total: response.data.total || 0 };
      }
      return { items: [], total: 0 };
    },
    enabled: activeTab === 'rules',
    staleTime: 5 * 60 * 1000,
  });

  const healthQuery = useQuery<SystemHealth | null>({
    queryKey: QUERY_KEYS.AD_HOC.ADMIN_MONITORING_HEALTH_BASE,
    queryFn: async () => {
      const response = await monitoringApi.getSystemHealth();
      return response.success && response.data ? response.data : null;
    },
    enabled: activeTab === 'health',
    staleTime: 5 * 60 * 1000,
  });

  const alertStatsQuery = useQuery<AlertStats | null>({
    queryKey: QUERY_KEYS.AD_HOC.ADMIN_MONITORING_ALERT_STATS_BASE,
    queryFn: async () => {
      const response = await monitoringApi.getAlertStats();
      return response.success && response.data ? response.data : null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const alerts = alertsQuery.data?.items ?? [];
  const rules = rulesQuery.data?.items ?? [];
  const systemHealth = healthQuery.data ?? null;
  const alertStats = alertStatsQuery.data ?? null;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, filterLevel, filterStatus]);

  useEffect(() => {
    if (alertsQuery.isError) {
      apiLogger.error('Failed to load alerts:', alertsQuery.error);
      addNotification({
        type: 'error',
        message: `${i18n.t('pages.monitoring_alert_page.k0')} ${extractErrorMessage(alertsQuery.error)}`,
      });
    }
  }, [alertsQuery.isError, alertsQuery.error, addNotification]);

  useEffect(() => {
    if (rulesQuery.isError) {
      apiLogger.error('Failed to load rules:', rulesQuery.error);
      addNotification({
        type: 'error',
        message: `${i18n.t('pages.monitoring_alert_page.k1')} ${extractErrorMessage(rulesQuery.error)}`,
      });
    }
  }, [rulesQuery.isError, rulesQuery.error, addNotification]);

  useEffect(() => {
    if (healthQuery.isError) {
      apiLogger.error('Failed to load system health:', healthQuery.error);
      addNotification({
        type: 'error',
        message: `${i18n.t('pages.monitoring_alert_page.k2')} ${extractErrorMessage(healthQuery.error)}`,
      });
    }
  }, [healthQuery.isError, healthQuery.error, addNotification]);

  useEffect(() => {
    if (alertStatsQuery.isError) {
      apiLogger.error('Failed to load alert stats:', alertStatsQuery.error);
    }
  }, [alertStatsQuery.isError, alertStatsQuery.error]);

  const invalidateAlerts = () =>
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.AD_HOC.ADMIN_MONITORING_ALERTS_BASE,
      exact: false,
      refetchType: 'active',
    });
  const invalidateRules = () =>
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.AD_HOC.ADMIN_MONITORING_RULES_BASE,
      exact: false,
      refetchType: 'active',
    });

  const acknowledgeMutation = useMutation({
    mutationFn: (alertId: string) => monitoringApi.acknowledgeAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.ADMIN_MONITORING_ALERTS_BASE,
        exact: false,
        refetchType: 'active',
      });
      invalidateAlerts();
      addNotification({ type: 'success', message: i18n.t('pages.monitoring_alert_page.k0') });
    },
    onError: (err: unknown) => {
      addNotification({
        type: 'error',
        message: `${i18n.t('pages.monitoring_alert_page.k3')} ${extractErrorMessage(err)}`,
      });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (alertId: string) => monitoringApi.resolveAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.ADMIN_MONITORING_ALERTS_BASE,
        exact: false,
        refetchType: 'active',
      });
      invalidateAlerts();
      addNotification({ type: 'success', message: i18n.t('pages.monitoring_alert_page.k1') });
    },
    onError: (err: unknown) => {
      addNotification({
        type: 'error',
        message: `${i18n.t('pages.monitoring_alert_page.k4')} ${extractErrorMessage(err)}`,
      });
    },
  });

  const escalateMutation = useMutation({
    mutationFn: (alertId: string) => monitoringApi.escalateAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.ADMIN_MONITORING_ALERTS_BASE,
        exact: false,
        refetchType: 'active',
      });
      invalidateAlerts();
      addNotification({ type: 'success', message: i18n.t('pages.monitoring_alert_page.k2') });
    },
    onError: (err: unknown) => {
      addNotification({
        type: 'error',
        message: `${i18n.t('pages.monitoring_alert_page.k5')} ${extractErrorMessage(err)}`,
      });
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: (params: { ruleId: string; enabled: boolean }) =>
      params.enabled
        ? monitoringApi.enableAlertRule(params.ruleId)
        : monitoringApi.disableAlertRule(params.ruleId),
    onSuccess: (_data, params) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.ADMIN_MONITORING_ALERTS_BASE,
        exact: false,
        refetchType: 'active',
      });
      invalidateRules();
      addNotification({
        type: 'success',
        message: params.enabled
          ? i18n.t('pages.monitoring_alert_page.k4')
          : i18n.t('pages.monitoring_alert_page.k3'),
      });
    },
    onError: (err: unknown) => {
      addNotification({
        type: 'error',
        message: `${i18n.t('pages.monitoring_alert_page.k6')} ${extractErrorMessage(err)}`,
      });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (ruleId: string) => monitoringApi.deleteAlertRule(ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.ADMIN_MONITORING_ALERTS_BASE,
        exact: false,
        refetchType: 'active',
      });
      invalidateRules();
      addNotification({ type: 'success', message: i18n.t('pages.monitoring_alert_page.k5') });
    },
    onError: (err: unknown) => {
      addNotification({
        type: 'error',
        message: `${i18n.t('pages.monitoring_alert_page.k7')} ${extractErrorMessage(err)}`,
      });
    },
  });

  const saveRuleMutation = useMutation({
    mutationFn: (params: { id?: string; data: CreateAlertRuleRequest | UpdateAlertRuleRequest }) =>
      params.id
        ? monitoringApi.updateAlertRule(params.id, params.data as UpdateAlertRuleRequest)
        : monitoringApi.createAlertRule(params.data as CreateAlertRuleRequest),
    onSuccess: (_data, params) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.ADMIN_MONITORING_ALERTS_BASE,
        exact: false,
        refetchType: 'active',
      });
      invalidateRules();
      addNotification({
        type: 'success',
        message: params.id
          ? i18n.t('pages.monitoring_alert_page.k7')
          : i18n.t('pages.monitoring_alert_page.k6'),
      });
      setRuleDialogOpen(false);
    },
    onError: (err: unknown) => {
      addNotification({
        type: 'error',
        message: `${i18n.t('pages.monitoring_alert_page.k8')} ${extractErrorMessage(err)}`,
      });
    },
  });

  const handleAcknowledge = useCallback(
    (alertId: string) => {
      acknowledgeMutation.mutate(alertId);
    },
    [acknowledgeMutation]
  );

  const handleResolve = useCallback(
    (alertId: string) => {
      resolveMutation.mutate(alertId);
    },
    [resolveMutation]
  );

  const handleEscalate = useCallback(
    (alertId: string) => {
      escalateMutation.mutate(alertId);
    },
    [escalateMutation]
  );

  const handleToggleRule = useCallback(
    (ruleId: string, enabled: boolean) => {
      toggleRuleMutation.mutate({ ruleId, enabled });
    },
    [toggleRuleMutation]
  );

  const handleExport = useCallback(() => {
    monitoringApi.exportAlerts({ format: 'excel' });
  }, []);

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'critical':
        return <AlertCircle className='w-5 h-5 text-red-600' />;
      case 'warning':
        return <AlertTriangle className='w-5 h-5 text-yellow-600' />;
      case 'info':
        return <InfoIcon className='w-5 h-5 text-blue-600' />;
      default:
        return <Bell className='w-5 h-5 text-gray-600' />;
    }
  };

  const getLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      critical: i18n.t('pages.monitoring_alert_page.k8'),
      warning: i18n.t('pages.monitoring_alert_page.k9'),
      info: i18n.t('pages.monitoring_alert_page.k10'),
      error: i18n.t('pages.monitoring_alert_page.k11'),
    };
    return labels[level] || level;
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'critical':
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: i18n.t('pages.monitoring_alert_page.k12'),
      acknowledged: i18n.t('pages.monitoring_alert_page.k13'),
      resolved: i18n.t('pages.monitoring_alert_page.k14'),
      escalated: i18n.t('pages.monitoring_alert_page.k15'),
      dismissed: i18n.t('pages.monitoring_alert_page.k16'),
    };
    return labels[status] || status;
  };

  const getHealthStatus = (value: number, type: 'cpu' | 'memory' | 'disk' | 'network') => {
    if (type === 'network') {
      return value > 0 ? 'success' : 'error';
    }
    if (value >= 90) return 'error';
    if (value >= 70) return 'warning';
    return 'success';
  };

  const InfoIcon: React.FC<{ className?: string }> = ({ className }) => (
    <div className={className}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        width='20'
        height='20'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <circle
          cx='12'
          cy='12'
          r='10'
        ></circle>
        <line
          x1='12'
          y1='16'
          x2='12'
          y2='12'
        ></line>
        <line
          x1='12'
          y1='8'
          x2='12.01'
          y2='8'
        ></line>
      </svg>
    </div>
  );

  const isAlertMutating =
    acknowledgeMutation.isPending || resolveMutation.isPending || escalateMutation.isPending;
  const isRuleMutating =
    toggleRuleMutation.isPending || deleteRuleMutation.isPending || saveRuleMutation.isPending;

  const alertColumns: ColumnDef<Alert>[] = useMemo(
    () => [
      {
        id: 'level',
        label: i18n.t('pages.monitoring_alert_page.k33'),
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getLevelIcon(row.level)}
            <Chip
              label={getLevelLabel(row.level)}
              size='small'
              color={getLevelColor(row.level)}
            />
          </Box>
        ),
      },
      {
        id: 'title',
        label: i18n.t('pages.monitoring_alert_page.k34'),
        render: (row) => <Typography sx={{ fontWeight: 'medium' }}>{row.title}</Typography>,
      },
      {
        id: 'message',
        label: i18n.t('pages.monitoring_alert_page.k35'),
        render: (row) => (
          <Typography
            variant='body2'
            sx={{
              maxWidth: 300,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={row.message}
          >
            {row.message}
          </Typography>
        ),
      },
      {
        id: 'source',
        label: i18n.t('pages.monitoring_alert_page.k36'),
        render: (row) => (
          <Chip
            label={row.source}
            size='small'
          />
        ),
      },
      {
        id: 'created_at',
        label: i18n.t('pages.monitoring_alert_page.k37'),
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Clock className='w-4 h-4' />
            <Typography variant='body2'>
              {new Date(row.created_at).toLocaleString('zh-CN')}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'status',
        label: i18n.t('pages.monitoring_alert_page.k38'),
        render: (row) => (
          <Chip
            label={getStatusLabel(row.status)}
            size='small'
            color={getStatusColor(row.status)}
          />
        ),
      },
    ],
    []
  );

  const ruleColumns: ColumnDef<AlertRule>[] = useMemo(
    () => [
      {
        id: 'name',
        label: i18n.t('pages.monitoring_alert_page.k40'),
        render: (row) => <Typography sx={{ fontWeight: 'medium' }}>{row.name}</Typography>,
      },
      {
        id: 'level',
        label: i18n.t('pages.monitoring_alert_page.k41'),
        render: (row) => (
          <Chip
            label={getLevelLabel(row.level)}
            size='small'
            color={getLevelColor(row.level)}
          />
        ),
      },
      {
        id: 'condition',
        label: i18n.t('pages.monitoring_alert_page.k42'),
        render: (row) => <Typography variant='body2'>{row.condition}</Typography>,
      },
      {
        id: 'notification_channels',
        label: i18n.t('pages.monitoring_alert_page.k43'),
        render: (row) => (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {row.notification_channels?.includes('email') && (
              <Chip
                label={i18n.t('pages.monitoring_alert_page.k47')}
                size='small'
              />
            )}
            {row.notification_channels?.includes('sms') && (
              <Chip
                label={i18n.t('pages.monitoring_alert_page.k48')}
                size='small'
              />
            )}
            {row.notification_channels?.includes('internal') && (
              <Chip
                label={i18n.t('pages.monitoring_alert_page.k49')}
                size='small'
              />
            )}
          </Box>
        ),
      },
      {
        id: 'enabled',
        label: i18n.t('pages.monitoring_alert_page.k44'),
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Switch
              checked={row.enabled}
              onChange={() => handleToggleRule(row.id, !row.enabled)}
              color={row.enabled ? 'primary' : 'default'}
              disabled={isRuleMutating}
            />
            <Typography>
              {row.enabled
                ? i18n.t('pages.monitoring_alert_page.k51')
                : i18n.t('pages.monitoring_alert_page.k50')}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'created_at',
        label: i18n.t('pages.monitoring_alert_page.k45'),
        render: (row) => (
          <Typography variant='body2'>
            {new Date(row.created_at).toLocaleString('zh-CN')}
          </Typography>
        ),
      },
    ],
    [isRuleMutating]
  );

  const alertFilters = useMemo<FilterConfig[]>(
    () => [
      {
        id: 'level',
        label: i18n.t('pages.monitoring_alert_page.k21'),
        type: 'select',
        value: filterLevel,
        options: [
          { value: 'all', label: i18n.t('pages.monitoring_alert_page.k23') },
          { value: 'critical', label: i18n.t('pages.monitoring_alert_page.k24') },
          { value: 'warning', label: i18n.t('pages.monitoring_alert_page.k25') },
          { value: 'info', label: i18n.t('pages.monitoring_alert_page.k26') },
        ],
      },
      {
        id: 'status',
        label: i18n.t('pages.monitoring_alert_page.k27'),
        type: 'select',
        value: filterStatus,
        options: [
          { value: 'all', label: i18n.t('pages.monitoring_alert_page.k29') },
          { value: 'pending', label: i18n.t('pages.monitoring_alert_page.k30') },
          { value: 'acknowledged', label: i18n.t('pages.monitoring_alert_page.k31') },
          { value: 'resolved', label: i18n.t('pages.monitoring_alert_page.k32') },
        ],
      },
    ],
    [filterLevel, filterStatus]
  );

  const alertActions = useMemo(
    () => [
      {
        label: i18n.t('pages.monitoring_alert_page.k9'),
        icon: <RefreshCw className='w-4 h-4' />,
        onClick: () => alertsQuery.refetch(),
        variant: 'outlined' as const,
      },
      {
        label: i18n.t('pages.monitoring_alert_page.k10'),
        icon: <Download className='w-4 h-4' />,
        onClick: handleExport,
        variant: 'contained' as const,
      },
    ],
    [alertsQuery, handleExport]
  );

  const ruleActions = useMemo(
    () => [
      {
        label: i18n.t('pages.monitoring_alert_page.k11'),
        icon: <Settings className='w-4 h-4' />,
        onClick: () => {
          setEditingRule(null);
          setRuleDialogOpen(true);
        },
        variant: 'contained' as const,
      },
    ],
    []
  );

  const renderAlertRowActions = useCallback(
    (row: Alert) => (
      <Box sx={{ display: 'flex', gap: 1 }}>
        {row.status === 'pending' && (
          <Button
            size='small'
            onClick={() => handleAcknowledge(row.id)}
            variant='outlined'
            disabled={isAlertMutating}
          >
            {i18n.t('pages.monitoring_alert_page.k22')}
          </Button>
        )}
        {row.status === 'acknowledged' && (
          <Button
            size='small'
            onClick={() => handleResolve(row.id)}
            variant='contained'
            disabled={isAlertMutating}
          >
            {i18n.t('pages.monitoring_alert_page.k23')}
          </Button>
        )}
        {row.status !== 'escalated' && row.status !== 'resolved' && (
          <Button
            size='small'
            onClick={() => handleEscalate(row.id)}
            variant='outlined'
            color='error'
            disabled={isAlertMutating}
          >
            {i18n.t('pages.monitoring_alert_page.k24')}
          </Button>
        )}
      </Box>
    ),
    [isAlertMutating, handleAcknowledge, handleResolve, handleEscalate]
  );

  const renderRuleRowActions = useCallback(
    (row: AlertRule) => (
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          size='small'
          onClick={() => {
            setEditingRule(row);
            setRuleDialogOpen(true);
          }}
          variant='outlined'
          disabled={isRuleMutating}
        >
          {i18n.t('pages.monitoring_alert_page.k27')}
        </Button>
        <Button
          size='small'
          onClick={() => deleteRuleMutation.mutate(row.id)}
          variant='outlined'
          color='error'
          disabled={isRuleMutating}
        >
          {i18n.t('pages.monitoring_alert_page.k28')}
        </Button>
      </Box>
    ),
    [isRuleMutating, deleteRuleMutation]
  );

  const handleAlertFilterChange = useCallback((filters: Record<string, unknown>) => {
    if (filters.level !== undefined) setFilterLevel(String(filters.level));
    if (filters.status !== undefined) setFilterStatus(String(filters.status));
  }, []);

  return (
    <PageContainer
      title={i18n.t('pages.monitoring_alert_page.k17')}
      subtitle={i18n.t('pages.monitoring_alert_page.k18')}
      headerActions={
        activeTab === 'health'
          ? [
              <Button
                key='refresh'
                onClick={() => healthQuery.refetch()}
                startIcon={<RefreshCw className='w-4 h-4' />}
                variant='outlined'
              >
                {i18n.t('pages.monitoring_alert_page.k12')}
              </Button>,
            ]
          : undefined
      }
    >
      <Grid spacing={3}>
        {alertStats && activeTab === 'alerts' && (
          <>
            <Grid size={{ xs: 12, md: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <AlertCircle className='w-6 h-6 text-red-600' />
                    <div>
                      <Typography
                        variant='body2'
                        color='textSecondary'
                      >
                        {i18n.t('pages.monitoring_alert_page.k13')}
                      </Typography>
                      <Typography
                        variant='h4'
                        sx={{ fontWeight: 'bold' }}
                        color='error'
                      >
                        {alertStats.pending_count}
                      </Typography>
                    </div>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <AlertTriangle className='w-6 h-6 text-yellow-600' />
                    <div>
                      <Typography
                        variant='body2'
                        color='textSecondary'
                      >
                        {i18n.t('pages.monitoring_alert_page.k14')}
                      </Typography>
                      <Typography
                        variant='h4'
                        sx={{ fontWeight: 'bold' }}
                        color='warning'
                      >
                        {alertStats.today_count}
                      </Typography>
                    </div>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <CheckCircle className='w-6 h-6 text-green-600' />
                    <div>
                      <Typography
                        variant='body2'
                        color='textSecondary'
                      >
                        {i18n.t('pages.monitoring_alert_page.k15')}
                      </Typography>
                      <Typography
                        variant='h4'
                        sx={{ fontWeight: 'bold' }}
                        color='success'
                      >
                        {alertStats.resolved_count}
                      </Typography>
                    </div>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Bell className='w-6 h-6 text-blue-600' />
                    <div>
                      <Typography
                        variant='body2'
                        color='textSecondary'
                      >
                        {i18n.t('pages.monitoring_alert_page.k16')}
                      </Typography>
                      <Typography
                        variant='h4'
                        sx={{ fontWeight: 'bold' }}
                      >
                        {alertStats.rule_count}
                      </Typography>
                    </div>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}

        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Button
                  onClick={() => setActiveTab('alerts')}
                  variant={activeTab === 'alerts' ? 'contained' : 'outlined'}
                  startIcon={<AlertTriangle className='w-4 h-4' />}
                >
                  {i18n.t('pages.monitoring_alert_page.k17')}
                </Button>
                <Button
                  onClick={() => setActiveTab('rules')}
                  variant={activeTab === 'rules' ? 'contained' : 'outlined'}
                  startIcon={<Settings className='w-4 h-4' />}
                >
                  {i18n.t('pages.monitoring_alert_page.k18')}
                </Button>
                <Button
                  onClick={() => setActiveTab('health')}
                  variant={activeTab === 'health' ? 'contained' : 'outlined'}
                  startIcon={<Server className='w-4 h-4' />}
                >
                  {i18n.t('pages.monitoring_alert_page.k19')}
                </Button>
              </Box>

              {activeTab === 'alerts' && (
                <ListPageTemplate<Alert>
                  breadcrumbs={[]}
                  columns={alertColumns}
                  data={alerts}
                  loading={alertsQuery.isLoading}
                  actions={alertActions}
                  renderRowActions={renderAlertRowActions}
                  pagination={{
                    page: currentPage,
                    pageSize: PER_PAGE,
                    total: alertsQuery.data?.total ?? 0,
                    onPageChange: setCurrentPage,
                  }}
                  searchable
                  searchValue={searchQuery}
                  onSearch={setSearchQuery}
                  searchPlaceholder={i18n.t('pages.monitoring_alert_page.k20')}
                  filters={alertFilters}
                  filtersValue={{ level: filterLevel, status: filterStatus }}
                  onFilterChange={handleAlertFilterChange}
                  emptyMessage={i18n.t('pages.monitoring_alert_page.k21')}
                />
              )}

              {activeTab === 'rules' && (
                <ListPageTemplate<AlertRule>
                  breadcrumbs={[]}
                  columns={ruleColumns}
                  data={rules}
                  loading={rulesQuery.isLoading}
                  actions={ruleActions}
                  renderRowActions={renderRuleRowActions}
                  emptyMessage={i18n.t('pages.monitoring_alert_page.k26')}
                />
              )}

              {activeTab === 'health' && systemHealth && (
                <Grid spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                          <Server className='w-5 h-5 text-blue-600' />
                          <Typography variant='h6'>
                            {i18n.t('pages.monitoring_alert_page.k52')}
                          </Typography>
                        </Box>
                        <Grid spacing={2}>
                          {systemHealth.services?.map((service) => (
                            <Grid
                              size={{ xs: 12 }}
                              key={service.name}
                            >
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                }}
                              >
                                <Typography>{service.name}</Typography>
                                <Chip
                                  label={
                                    service.status === 'healthy'
                                      ? i18n.t('pages.monitoring_alert_page.k54')
                                      : i18n.t('pages.monitoring_alert_page.k53')
                                  }
                                  size='small'
                                  color={service.status === 'healthy' ? 'success' : 'error'}
                                />
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                          <Cpu className='w-5 h-5 text-green-600' />
                          <Typography variant='h6'>
                            {i18n.t('pages.monitoring_alert_page.k55')}
                          </Typography>
                        </Box>
                        <Grid spacing={2}>
                          <Grid size={{ xs: 6 }}>
                            <Typography
                              variant='body2'
                              color='textSecondary'
                            >
                              {i18n.t('pages.monitoring_alert_page.cpu_29')}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Typography
                                variant='h4'
                                sx={{ fontWeight: 'bold' }}
                              >
                                {systemHealth.cpu_usage ?? 0}%
                              </Typography>
                              <Chip
                                label={
                                  (systemHealth.cpu_usage ?? 0) >= 90
                                    ? i18n.t('pages.monitoring_alert_page.k56')
                                    : (systemHealth.cpu_usage ?? 0) >= 70
                                      ? i18n.t('pages.monitoring_alert_page.k57')
                                      : i18n.t('pages.monitoring_alert_page.k58')
                                }
                                size='small'
                                color={getHealthStatus(systemHealth.cpu_usage ?? 0, 'cpu')}
                              />
                            </Box>
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <Typography
                              variant='body2'
                              color='textSecondary'
                            >
                              {i18n.t('pages.monitoring_alert_page.k30')}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Typography
                                variant='h4'
                                sx={{ fontWeight: 'bold' }}
                              >
                                {systemHealth.memory_usage ?? 0}%
                              </Typography>
                              <Chip
                                label={
                                  (systemHealth.memory_usage ?? 0) >= 90
                                    ? i18n.t('pages.monitoring_alert_page.k59')
                                    : (systemHealth.memory_usage ?? 0) >= 70
                                      ? i18n.t('pages.monitoring_alert_page.k60')
                                      : i18n.t('pages.monitoring_alert_page.k61')
                                }
                                size='small'
                                color={getHealthStatus(systemHealth.memory_usage ?? 0, 'memory')}
                              />
                            </Box>
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <Typography
                              variant='body2'
                              color='textSecondary'
                            >
                              {i18n.t('pages.monitoring_alert_page.k31')}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Typography
                                variant='h4'
                                sx={{ fontWeight: 'bold' }}
                              >
                                {systemHealth.disk_usage ?? 0}%
                              </Typography>
                              <Chip
                                label={
                                  (systemHealth.disk_usage ?? 0) >= 90
                                    ? i18n.t('pages.monitoring_alert_page.k62')
                                    : (systemHealth.disk_usage ?? 0) >= 70
                                      ? i18n.t('pages.monitoring_alert_page.k63')
                                      : i18n.t('pages.monitoring_alert_page.k64')
                                }
                                size='small'
                                color={getHealthStatus(systemHealth.disk_usage ?? 0, 'disk')}
                              />
                            </Box>
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <Typography
                              variant='body2'
                              color='textSecondary'
                            >
                              {i18n.t('pages.monitoring_alert_page.k32')}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Typography
                                variant='h4'
                                sx={{ fontWeight: 'bold' }}
                              >
                                {systemHealth.network_latency ?? 0}ms
                              </Typography>
                              <Chip
                                label={
                                  (systemHealth.network_latency ?? 0) > 100
                                    ? i18n.t('pages.monitoring_alert_page.k65')
                                    : (systemHealth.network_latency ?? 0) > 50
                                      ? i18n.t('pages.monitoring_alert_page.k66')
                                      : i18n.t('pages.monitoring_alert_page.k67')
                                }
                                size='small'
                                color={
                                  (systemHealth.network_latency ?? 0) > 100
                                    ? 'error'
                                    : (systemHealth.network_latency ?? 0) > 50
                                      ? 'warning'
                                      : 'success'
                                }
                              />
                            </Box>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                          <TrendingUp className='w-5 h-5 text-purple-600' />
                          <Typography variant='h6'>
                            {i18n.t('pages.monitoring_alert_page.k68')}
                          </Typography>
                        </Box>
                        <Grid spacing={2}>
                          <Grid size={{ xs: 3 }}>
                            <Typography
                              variant='body2'
                              color='textSecondary'
                            >
                              {i18n.t('pages.monitoring_alert_page.api_33')}
                            </Typography>
                            <Typography
                              variant='h4'
                              sx={{ fontWeight: 'bold' }}
                            >
                              {systemHealth.api_requests ?? 0}
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 3 }}>
                            <Typography
                              variant='body2'
                              color='textSecondary'
                            >
                              {i18n.t('pages.monitoring_alert_page.k34')}
                            </Typography>
                            <Typography
                              variant='h4'
                              sx={{ fontWeight: 'bold' }}
                            >
                              {systemHealth.average_response_time ?? 0}ms
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 3 }}>
                            <Typography
                              variant='body2'
                              color='textSecondary'
                            >
                              {i18n.t('pages.monitoring_alert_page.k35')}
                            </Typography>
                            <Typography
                              variant='h4'
                              sx={{ fontWeight: 'bold' }}
                              color={(systemHealth.error_rate ?? 0) > 1 ? 'error' : 'success'}
                            >
                              {systemHealth.error_rate ?? 0}%
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 3 }}>
                            <Typography
                              variant='body2'
                              color='textSecondary'
                            >
                              {i18n.t('pages.monitoring_alert_page.k36')}
                            </Typography>
                            <Typography
                              variant='h4'
                              sx={{ fontWeight: 'bold' }}
                            >
                              {systemHealth.online_users ?? 0}
                            </Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog
        open={ruleDialogOpen}
        onClose={() => setRuleDialogOpen(false)}
        maxWidth='md'
      >
        <DialogTitle>
          {editingRule
            ? i18n.t('pages.monitoring_alert_page.k70')
            : i18n.t('pages.monitoring_alert_page.k69')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <TextField
              fullWidth
              label={i18n.t('pages.monitoring_alert_page.k71')}
              defaultValue={editingRule?.name}
              placeholder={i18n.t('pages.monitoring_alert_page.k72')}
            />
            <TextField
              fullWidth
              label={i18n.t('pages.monitoring_alert_page.k73')}
              defaultValue={editingRule?.condition}
              placeholder={i18n.t('pages.monitoring_alert_page.k37')}
            />
            <FormControl fullWidth>
              <InputLabel>{i18n.t('pages.monitoring_alert_page.k74')}</InputLabel>
              <Select
                defaultValue={editingRule?.level || 'warning'}
                label={i18n.t('pages.monitoring_alert_page.k75')}
              >
                <MenuItem value='info'>{i18n.t('pages.monitoring_alert_page.k76')}</MenuItem>
                <MenuItem value='warning'>{i18n.t('pages.monitoring_alert_page.k77')}</MenuItem>
                <MenuItem value='critical'>{i18n.t('pages.monitoring_alert_page.k78')}</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>{i18n.t('pages.monitoring_alert_page.k79')}</InputLabel>
              <Select
                defaultValue={editingRule?.notification_channels?.[0] || 'internal'}
                label={i18n.t('pages.monitoring_alert_page.k80')}
              >
                <MenuItem value='internal'>{i18n.t('pages.monitoring_alert_page.k81')}</MenuItem>
                <MenuItem value='email'>{i18n.t('pages.monitoring_alert_page.k82')}</MenuItem>
                <MenuItem value='sms'>{i18n.t('pages.monitoring_alert_page.k83')}</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRuleDialogOpen(false)}>
            {i18n.t('pages.monitoring_alert_page.k84')}
          </Button>
          <Button
            onClick={() => {
              if (editingRule) {
                saveRuleMutation.mutate({ id: editingRule.id, data: {} });
              } else {
                saveRuleMutation.mutate({ data: {} as CreateAlertRuleRequest });
              }
            }}
            variant='contained'
          >
            {editingRule
              ? i18n.t('pages.monitoring_alert_page.k86')
              : i18n.t('pages.monitoring_alert_page.k85')}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default MonitoringAlertPage;
