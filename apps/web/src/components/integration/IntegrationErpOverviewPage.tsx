/**
 * ERP 集成概览页面
 *
 * @module pages/integration
 * @path /integration/erp-overview
 */

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Divider,
} from '@mui/material';
import {
  Building2,
  RefreshCw,
  Settings,
  Database,
  GitMerge,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Bell,
} from 'lucide-react';

import { PageContainer } from '@/components/common';
import {
  DashboardTemplate,
  type StatCard,
  type QuickAction,
  type RecentItem,
} from '@/components/templates';
import { useNotificationStore } from '@/store';
import { connectionApi } from '@/api/integration/connection';
import { designTokens } from '@/theme/tokens';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { formatDateTime } from '@/utils/date';

type SyncStatus = 'success' | 'syncing' | 'error' | 'pending';

interface SyncTask {
  id: string;
  name: string;
  type: string;
  status: SyncStatus;
  lastSyncTime: string;
  records: number;
  progress?: number;
}

interface SyncLog {
  id: string;
  action: string;
  module: string;
  user: string;
  time: string;
  status: 'success' | 'error';
}

interface ErpConnectionRow {
  id: string;
  name: string;
  type: string;
  api_url?: string | null;
  sync_direction?: string | null;
  sync_mode?: string | null;
  status: string;
  isactive?: boolean;
  last_sync_at?: string | null;
  updated_at?: string | null;
}

const toSyncStatus = (s: string, isActive?: boolean): SyncStatus => {
  if (s === 'error' || s === 'failed') return 'error';
  if (s === 'syncing') return 'syncing';
  if (s === 'active' || s === 'connected' || isActive) return 'success';
  return 'pending';
};

const toTask = (c: ErpConnectionRow): SyncTask => ({
  id: c.id,
  name: c.name,
  type: c.type,
  status: toSyncStatus(c.status, c.isactive),
  lastSyncTime: c.last_sync_at ? formatDateTime(c.last_sync_at) : '-',
  records: 0,
});

const toLog = (c: ErpConnectionRow): SyncLog => ({
  id: c.id,
  action: c.name,
  module: c.type,
  user: c.sync_direction ?? '-',
  time: (c.updated_at ?? '').slice(11, 19),
  status: c.status === 'error' || c.status === 'failed' ? 'error' : 'success',
});

const getStatusIcon = (status: SyncStatus) => {
  switch (status) {
    case 'success':
      return (
        <CheckCircle2
          size={16}
          color='success.main'
        />
      );
    case 'syncing':
      return (
        <RefreshCw
          size={16}
          color='primary.main'
          className='spin'
        />
      );
    case 'error':
      return (
        <AlertCircle
          size={16}
          color='error.main'
        />
      );
    case 'pending':
      return (
        <Clock
          size={16}
          color='text.disabled'
        />
      );
  }
};

const getStatusLabel = (status: SyncStatus) => {
  const labels: Record<SyncStatus, string> = {
    success: i18n.t('integration.integration_erp_overview_page.k20'),
    syncing: i18n.t('integration.integration_erp_overview_page.k21'),
    error: i18n.t('integration.integration_erp_overview_page.k22'),
    pending: i18n.t('integration.integration_erp_overview_page.k23'),
  };
  return labels[status];
};

const getStatusColor = (status: SyncStatus) => {
  const colors: Record<SyncStatus, string> = {
    success: 'success',
    syncing: 'primary',
    error: 'error',
    pending: 'default',
  };
  return colors[status];
};

export const IntegrationErpOverviewPage: React.FC = () => {
  const { t } = useTranslation('integration');
  const addNotification = useNotificationStore((state) => state.addNotification);

  const { data: connections = [] } = useQuery<ErpConnectionRow[]>({
    queryKey: ['integration-erp-connections'],
    queryFn: async () => {
      const res = await connectionApi.listConnections({ page: 1, pageSize: 100 });
      const arr = res.data as unknown;
      return Array.isArray(arr)
        ? (arr as ErpConnectionRow[])
        : ((arr as { data?: ErpConnectionRow[] }).data ?? []);
    },
  });

  const stats: StatCard[] = useMemo(() => {
    const total = connections.length;
    const errors = connections.filter((c) => c.status === 'error' || c.status === 'failed').length;
    const active = connections.filter(
      (c) => c.status === 'active' || c.status === 'connected' || c.isactive
    ).length;
    const successRate = total ? Math.round((active / total) * 1000) / 10 : 0;
    return [
      {
        id: 'total-syncs',
        title: i18n.t('integration.integration_erp_overview_page.k24'),
        value: String(total),
        icon: <GitMerge size={20} />,
        change: 0,
        changeLabel: i18n.t('integration.integration_erp_overview_page.k25'),
        color: 'primary',
      },
      {
        id: 'success-rate',
        title: i18n.t('integration.integration_erp_overview_page.k26'),
        value: `${successRate}%`,
        icon: <TrendingUp size={20} />,
        change: 0,
        changeLabel: i18n.t('integration.integration_erp_overview_page.k27'),
        color: 'success',
      },
      {
        id: 'active-connections',
        title: i18n.t('integration.integration_erp_overview_page.k28'),
        value: String(active),
        icon: <Database size={20} />,
        change: 0,
        changeLabel: i18n.t('integration.integration_erp_overview_page.k29'),
        color: 'info',
      },
      {
        id: 'errors',
        title: i18n.t('integration.integration_erp_overview_page.k30'),
        value: String(errors),
        icon: <AlertCircle size={20} />,
        change: 0,
        changeLabel: i18n.t('integration.integration_erp_overview_page.k31'),
        color: 'error',
      },
    ];
  }, [connections]);

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: 'new-sync',
        label: i18n.t('integration.integration_erp_overview_page.k32'),
        icon: <RefreshCw size={20} />,
        onClick: () =>
          addNotification({
            title: i18n.t('integration.integration_erp_overview_page.k33'),
            message: i18n.t('integration.integration_erp_overview_page.k34'),
            type: 'info',
          }),
      },
      {
        id: 'view-logs',
        label: i18n.t('integration.integration_erp_overview_page.k35'),
        icon: <Clock size={20} />,
        onClick: () =>
          addNotification({
            title: i18n.t('integration.integration_erp_overview_page.k36'),
            message: i18n.t('integration.integration_erp_overview_page.k37'),
            type: 'info',
          }),
      },
      {
        id: 'settings',
        label: i18n.t('integration.integration_erp_overview_page.k38'),
        icon: <Settings size={20} />,
        onClick: () =>
          addNotification({
            title: i18n.t('integration.integration_erp_overview_page.k39'),
            message: i18n.t('integration.integration_erp_overview_page.erp_40'),
            type: 'info',
          }),
      },
    ],
    [addNotification]
  );

  const recentItems: RecentItem[] = useMemo(
    () =>
      connections
        .slice()
        .sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))
        .slice(0, 5)
        .map((c) => toLog(c))
        .map((log) => ({
          id: log.id,
          title: log.action,
          description: `${log.module} · ${log.user}`,
          time: log.time,
          icon: log.status === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />,
          iconColor: log.status === 'success' ? 'success.main' : 'error.main',
        })),
    [connections]
  );

  const syncTasksList = useMemo(
    () =>
      connections.map((c) => {
        const task = toTask(c);
        return (
          <ListItem
            key={task.id}
            sx={{
              px: 2,
              py: 1.5,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: `${getStatusColor(task.status)}.main`,
                  opacity: task.status === 'syncing' ? 0.7 : 1,
                }}
              >
                {getStatusIcon(task.status)}
              </Avatar>
            </ListItemIcon>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {task.name}
                  </Typography>
                  <Chip
                    size='small'
                    label={task.type}
                    variant='outlined'
                    sx={{ height: 18, fontSize: designTokens.typography.fontSize.scale['0.65rem'] }}
                  />
                </Box>
              }
              secondary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {task.lastSyncTime}
                  </Typography>
                  {task.records > 0 && (
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {t('integration.integration_erp_overview_page.m1', { v1: task.records })}
                    </Typography>
                  )}
                  {task.progress !== undefined && (
                    <Box sx={{ width: 60 }}>
                      <LinearProgress
                        variant='determinate'
                        value={task.progress}
                        sx={{ height: 4, borderRadius: 3 }}
                      />
                    </Box>
                  )}
                </Box>
              }
            />
            <Chip
              size='small'
              label={getStatusLabel(task.status)}
              color={getStatusColor(task.status) as React.ComponentProps<typeof Chip>['color']}
              variant={task.status === 'syncing' ? 'outlined' : 'filled'}
            />
          </ListItem>
        );
      }),
    [connections, t]
  );

  return (
    <PageContainer
      title={t('integration.integration_erp_overview_page.m2')}
      subtitle={t('integration.integration_erp_overview_page.erp_41')}
    >
      <DashboardTemplate
        title={t('integration.integration_erp_overview_page.m2')}
        stats={stats}
        quickActions={quickActions}
        recentItems={recentItems}
        charts={[]}
      />

      {/* Sync Tasks Section */}
      <Card
        variant='outlined'
        sx={{ mt: 3 }}
      >
        <CardContent>
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Building2 size={20} />
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600 }}
              >
                {t('integration.integration_erp_overview_page.e1')}
              </Typography>
            </Box>
            <Button
              size='small'
              variant='outlined'
              startIcon={<RefreshCw size={14} />}
              onClick={() =>
                addNotification({
                  title: t('integration.integration_erp_overview_page.k42'),
                  message: t('integration.integration_erp_overview_page.k43'),
                  type: 'info',
                })
              }
            >
              {t('integration.integration_erp_overview_page.e2')}
            </Button>
          </Box>
          <Divider sx={{ mb: 1 }} />
          <List disablePadding>{syncTasksList}</List>
        </CardContent>
      </Card>

      {/* Connection Status */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
        <Box sx={{ flex: 1, minWidth: { xs: '100%', md: 'calc(50% - 8px)' } }}>
          <Card variant='outlined'>
            <CardContent>
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                {t('integration.integration_erp_overview_page.e1')}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Database size={16} />
                    <Typography variant='body2'>
                      {t('integration.integration_erp_overview_page.k44')}
                    </Typography>
                  </Box>
                  <Chip
                    size='small'
                    label={t('integration.integration_erp_overview_page.k45')}
                    color='success'
                  />
                </Box>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <GitMerge size={16} />
                    <Typography variant='body2'>
                      {t('integration.integration_erp_overview_page.k46')}
                    </Typography>
                  </Box>
                  <Chip
                    size='small'
                    label={t('integration.integration_erp_overview_page.k47')}
                    color='success'
                  />
                </Box>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Bell size={16} />
                    <Typography variant='body2'>
                      {t('integration.integration_erp_overview_page.k48')}
                    </Typography>
                  </Box>
                  <Chip
                    size='small'
                    label={t('integration.integration_erp_overview_page.k49')}
                    color='success'
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: 1, minWidth: { xs: '100%', md: 'calc(50% - 8px)' } }}>
          <Card variant='outlined'>
            <CardContent>
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                {t('integration.integration_erp_overview_page.e3')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ flex: 1, minWidth: 'calc(50% - 8px)' }}>
                  <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'success.50', borderRadius: 1 }}>
                    <Typography
                      variant='h5'
                      sx={{ fontWeight: 600, color: 'success.main' }}
                    >
                      {connections.length}
                    </Typography>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {t('integration.integration_erp_overview_page.e4')}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ flex: 1, minWidth: 'calc(50% - 8px)' }}>
                  <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'primary.50', borderRadius: 1 }}>
                    <Typography
                      variant='h5'
                      sx={{ fontWeight: 600, color: 'primary.main' }}
                    >
                      {stats.find((s) => s.id === 'active-connections')?.value ?? '0'}
                    </Typography>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {t('integration.integration_erp_overview_page.e5')}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ flex: 1, minWidth: 'calc(50% - 8px)' }}>
                  <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'warning.50', borderRadius: 1 }}>
                    <Typography
                      variant='h5'
                      sx={{ fontWeight: 600, color: 'warning.main' }}
                    >
                      {stats.find((s) => s.id === 'success-rate')?.value ?? '0%'}
                    </Typography>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {t('integration.integration_erp_overview_page.e6')}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ flex: 1, minWidth: 'calc(50% - 8px)' }}>
                  <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'info.50', borderRadius: 1 }}>
                    <Typography
                      variant='h5'
                      sx={{ fontWeight: 600, color: 'info.main' }}
                    >
                      15
                    </Typography>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {t('integration.integration_erp_overview_page.e7')}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </PageContainer>
  );
};

export default IntegrationErpOverviewPage;
