/**
 * ERP 集成概览页面
 *
 * @module pages/integration
 * @path /integration/erp-overview
 */

import React, { useState, useMemo } from 'react';
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
import { designTokens } from '@/theme/tokens';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { integrationApi } from '@/api/integration';
import { externalErpApi } from '@/api/external-erp';

const ct = designTokens.colors;

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

const MOCK_SYNC_TASKS: SyncTask[] = [
  {
    id: 'sync-001',
    name: i18n.t('integration.integration_erp_overview_page.k0'),
    type: 'IAM',
    status: 'success',
    lastSyncTime: '2024-01-15 14:30:00',
    records: 1250,
  },
  {
    id: 'sync-002',
    name: i18n.t('integration.integration_erp_overview_page.k1'),
    type: 'WMS',
    status: 'syncing',
    lastSyncTime: '2024-01-15 14:25:00',
    records: 856,
    progress: 65,
  },
  {
    id: 'sync-003',
    name: i18n.t('integration.integration_erp_overview_page.k2'),
    type: 'ERP',
    status: 'success',
    lastSyncTime: '2024-01-15 14:20:00',
    records: 342,
  },
  {
    id: 'sync-004',
    name: i18n.t('integration.integration_erp_overview_page.k3'),
    type: 'FIN',
    status: 'error',
    lastSyncTime: '2024-01-15 14:15:00',
    records: 0,
  },
  {
    id: 'sync-005',
    name: i18n.t('integration.integration_erp_overview_page.k4'),
    type: 'CRM',
    status: 'pending',
    lastSyncTime: '-',
    records: 0,
  },
];

const MOCK_SYNC_LOGS: SyncLog[] = [
  {
    id: 'log-001',
    action: i18n.t('integration.integration_erp_overview_page.k5'),
    module: i18n.t('integration.integration_erp_overview_page.k6'),
    user: i18n.t('integration.integration_erp_overview_page.k7'),
    time: '14:30:00',
    status: 'success',
  },
  {
    id: 'log-002',
    action: i18n.t('integration.integration_erp_overview_page.k8'),
    module: i18n.t('integration.integration_erp_overview_page.k9'),
    user: i18n.t('integration.integration_erp_overview_page.k10'),
    time: '14:15:00',
    status: 'error',
  },
  {
    id: 'log-003',
    action: i18n.t('integration.integration_erp_overview_page.k11'),
    module: i18n.t('integration.integration_erp_overview_page.k12'),
    user: i18n.t('integration.integration_erp_overview_page.k13'),
    time: '14:25:00',
    status: 'success',
  },
  {
    id: 'log-004',
    action: i18n.t('integration.integration_erp_overview_page.k14'),
    module: i18n.t('integration.integration_erp_overview_page.k15'),
    user: i18n.t('integration.integration_erp_overview_page.k16'),
    time: '14:20:00',
    status: 'success',
  },
  {
    id: 'log-005',
    action: i18n.t('integration.integration_erp_overview_page.k17'),
    module: i18n.t('integration.integration_erp_overview_page.k18'),
    user: i18n.t('integration.integration_erp_overview_page.k19'),
    time: '14:10:00',
    status: 'success',
  },
];

const getStatusIcon = (status: SyncStatus) => {
  switch (status) {
    case 'success':
      return (
        <CheckCircle2
          size={16}
          color={ct.success.main}
        />
      );
    case 'syncing':
      return (
        <RefreshCw
          size={16}
          color={ct.primary.dark}
          className='spin'
        />
      );
    case 'error':
      return (
        <AlertCircle
          size={16}
          color={ct.error.main}
        />
      );
    case 'pending':
      return (
        <Clock
          size={16}
          color={ct.grey[400]}
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
  const { data: backendData } = useQuery({
    queryKey: ['integration', 'erpOverview'],
    queryFn: async () => {
      try {
        return await externalErpApi.syncLogs.getSyncStatistics();
      } catch {
        return {};
      }
    },
  });
  const { t } = useTranslation('integration');
  const addNotification = useNotificationStore((state) => state.addNotification);

  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'total-syncs',
        title: i18n.t('integration.integration_erp_overview_page.k24'),
        value: '12',
        icon: <GitMerge size={20} />,
        change: 2,
        changeLabel: i18n.t('integration.integration_erp_overview_page.k25'),
        color: 'primary',
      },
      {
        id: 'success-rate',
        title: i18n.t('integration.integration_erp_overview_page.k26'),
        value: '96.5%',
        icon: <TrendingUp size={20} />,
        change: 1.2,
        changeLabel: i18n.t('integration.integration_erp_overview_page.k27'),
        color: 'success',
      },
      {
        id: 'total-records',
        title: i18n.t('integration.integration_erp_overview_page.k28'),
        value: '12,580',
        icon: <Database size={20} />,
        change: 1250,
        changeLabel: i18n.t('integration.integration_erp_overview_page.k29'),
        color: 'info',
      },
      {
        id: 'errors',
        title: i18n.t('integration.integration_erp_overview_page.k30'),
        value: '3',
        icon: <AlertCircle size={20} />,
        change: -2,
        changeLabel: i18n.t('integration.integration_erp_overview_page.k31'),
        color: 'error',
      },
    ],
    []
  );

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
      MOCK_SYNC_LOGS.slice(0, 5).map((log) => ({
        id: log.id,
        title: log.action,
        description: `${log.module} · ${log.user}`,
        time: log.time,
        icon: log.status === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />,
        iconColor: log.status === 'success' ? 'success.main' : 'error.main',
      })),
    []
  );

  const syncTasksList = useMemo(
    () =>
      MOCK_SYNC_TASKS.map((task) => (
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
                  sx={{ height: 18, fontSize: '0.65rem' }}
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
      )),
    []
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
                      1,250
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
                      3.2s
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
                      99.2%
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
