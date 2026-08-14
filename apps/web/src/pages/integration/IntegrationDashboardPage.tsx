/**
 * 集成平台仪表盘页面 - V4.0 标准化改造
 *
 * @module pages/integration
 * @path /integration/dashboard
 */

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Plug,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Settings,
  GitMerge,
} from 'lucide-react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

import { PageContainer } from '@/components/common';
import {
  DashboardTemplate,
  type StatCard,
  type ChartCard,
  type QuickAction,
  type RecentItem,
} from '@/components/templates';
import { INTEGRATION_PATHS } from '@/modules/integration/config';
import { useNotificationStore } from '@/store';

import { QUERY_KEYS } from '@/lib/reactQuery';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

export const IntegrationDashboardPage: React.FC = () => {
  const { t } = useTranslation('integration');
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const loadingQuery = useQuery<boolean>({
    queryKey: QUERY_KEYS.AD_HOC.INTEGRATION_DASHBOARD_BASE,
    queryFn: async () => true,
    staleTime: Infinity,
  });
  const loading = loadingQuery.isLoading;

  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'active-connections',
        title: i18n.t('integration.integration_dashboard_page.k0'),
        value: '12',
        icon: <Plug size={20} />,
        change: 2,
        changeLabel: i18n.t('integration.integration_dashboard_page.k1'),
        color: 'success',
      },
      {
        id: 'sync-tasks',
        title: i18n.t('integration.integration_dashboard_page.k2'),
        value: '156',
        icon: <GitMerge size={20} />,
        change: 23,
        changeLabel: i18n.t('integration.integration_dashboard_page.k3'),
        color: 'primary',
      },
      {
        id: 'success-rate',
        title: i18n.t('integration.integration_dashboard_page.k4'),
        value: '98.5%',
        icon: <CheckCircle2 size={20} />,
        change: 0.5,
        changeLabel: i18n.t('integration.integration_dashboard_page.k5'),
        color: 'success',
      },
      {
        id: 'avg-latency',
        title: i18n.t('integration.integration_dashboard_page.k6'),
        value: '125ms',
        icon: <Activity size={20} />,
        change: -15,
        changeLabel: 'ms下降',
        color: 'info',
      },
      {
        id: 'sync-records',
        title: i18n.t('integration.integration_dashboard_page.k7'),
        value: '12,580',
        icon: <RefreshCw size={20} />,
        change: 1250,
        changeLabel: i18n.t('integration.integration_dashboard_page.k8'),
        color: 'primary',
      },
      {
        id: 'errors',
        title: i18n.t('integration.integration_dashboard_page.k9'),
        value: '23',
        icon: <AlertTriangle size={20} />,
        change: -5,
        changeLabel: t('integration.integration_dashboard_page.k10'),
        color: 'error',
      },
    ],
    []
  );

  const charts: ChartCard[] = useMemo(
    () => [
      {
        id: 'trend',
        title: i18n.t('integration.integration_dashboard_page.k11'),
        chart: <Activity size={18} />,
        type: 'line',
      },
      {
        id: 'status',
        title: i18n.t('integration.integration_dashboard_page.k12'),
        chart: <Plug size={18} />,
        type: 'pie',
      },
      {
        id: 'systems',
        title: i18n.t('integration.integration_dashboard_page.k13'),
        chart: <GitMerge size={18} />,
        type: 'bar',
      },
    ],
    []
  );

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: 'new-connection',
        label: i18n.t('integration.integration_dashboard_page.k14'),
        icon: <Plug size={20} />,
        color: 'primary',
        onClick: () => navigate(INTEGRATION_PATHS.connections),
      },
      {
        id: 'view-logs',
        label: i18n.t('integration.integration_dashboard_page.k15'),
        icon: <Activity size={20} />,
        color: 'info',
        onClick: () => navigate(INTEGRATION_PATHS.events),
      },
      {
        id: 'data-mapping',
        label: i18n.t('integration.integration_dashboard_page.k16'),
        icon: <GitMerge size={20} />,
        color: 'success',
        onClick: () => navigate(INTEGRATION_PATHS.mappings),
      },
      {
        id: 'settings',
        label: i18n.t('integration.integration_dashboard_page.k17'),
        icon: <Settings size={20} />,
        color: 'warning',
        onClick: () => navigate(INTEGRATION_PATHS.settings),
      },
    ],
    [navigate]
  );

  const recentItems: RecentItem[] = useMemo(
    () => [
      {
        id: '1',
        title: 'ERP - 采购订单同步',
        subtitle: i18n.t('integration.integration_dashboard_page.2_18'),
        status: 'success',
        onClick: () => navigate(INTEGRATION_PATHS.events),
      },
      {
        id: '2',
        title: 'WMS - 库存数据同步',
        subtitle: i18n.t('integration.integration_dashboard_page.5_19'),
        status: 'success',
        onClick: () => navigate(INTEGRATION_PATHS.events),
      },
      {
        id: '3',
        title: 'MES - 工单数据同步',
        subtitle: i18n.t('integration.integration_dashboard_page.10_20'),
        status: 'success',
        onClick: () => navigate(INTEGRATION_PATHS.events),
      },
      {
        id: '4',
        title: 'CRM - 客户数据同步',
        subtitle: i18n.t('integration.integration_dashboard_page.15_21'),
        status: 'warning',
        onClick: () => navigate(INTEGRATION_PATHS.events),
      },
      {
        id: '5',
        title: 'SCM - 供应商数据同步',
        subtitle: i18n.t('integration.integration_dashboard_page.30_22'),
        status: 'error',
        onClick: () => navigate(INTEGRATION_PATHS.events),
      },
    ],
    [navigate]
  );

  return (
    <PageContainer
      headerProps={{
        pageIcon: <Plug size={20} />,
      }}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        loading={loading}
        stats={stats}
        charts={charts}
        quickActions={quickActions}
        recentItems={recentItems}
        recentTitle={t('integration.integration_dashboard_page.k23')}
        onRefresh={() => {
          loadingQuery.refetch();
          addNotification({
            title: t('integration.integration_dashboard_page.k25'),
            message: t('integration.integration_dashboard_page.k24'),
            type: 'success',
          });
        }}
      />
    </PageContainer>
  );
};

export default IntegrationDashboardPage;
