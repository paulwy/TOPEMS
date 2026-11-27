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
import { useNavigate } from 'react-router-dom';

import {
  DashboardTemplate,
  type StatCard,
  type ChartCard,
  type QuickAction,
  type RecentItem,
} from '@/components/templates';
import { INTEGRATION_PATHS } from '@/module-configs/integration/config';
import { useNotificationStore } from '@/store';
import { integrationApi } from '@/api/integration';
import type { IntegrationSyncStats } from '@/api/integration';

import { QUERY_KEYS } from '@/lib/reactQuery';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

export const IntegrationDashboardPage: React.FC = () => {
  const { t } = useTranslation('integration');
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);

  // 全部数字来自真实接口：/integration/stats、/integration/sync-stats、
  // /integration/erp/connections、/integration/events。
  // 原先写死的 12/156/98.5%/125ms/12,580/23 及各自 change 环比（+2/+23/-15/+1250…）已删除。
  const statsQuery = useQuery<IntegrationSyncStats | null>({
    queryKey: [...QUERY_KEYS.AD_HOC.INTEGRATION_DASHBOARD_BASE, 'sync-stats'],
    queryFn: async () => {
      const res = await integrationApi.sync.getIntegrationSyncStats();
      return (res?.data ?? null) as IntegrationSyncStats | null;
    },
    staleTime: 60 * 1000,
  });

  const connectionsQuery = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.INTEGRATION_DASHBOARD_BASE, 'connections'],
    queryFn: async () => {
      const res = await integrationApi.connections.listConnections();
      return Array.isArray(res?.data)
        ? (res.data as Array<{ status?: string; isactive?: boolean }>)
        : [];
    },
    staleTime: 5 * 60 * 1000,
  });
  // 「活跃连接」只数启用的：status=active/connected，缺该字段时回落到 isactive
  const activeConnections = (connectionsQuery.data ?? []).filter((c) =>
    c.status ? ['active', 'connected'].includes(c.status) : c.isactive !== false
  ).length;

  const historyQuery = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.INTEGRATION_DASHBOARD_BASE, 'history'],
    queryFn: async () => {
      const res = await integrationApi.sync.getIntegrationSyncHistory({ page: 1, pageSize: 50 });
      return Array.isArray(res?.data) ? res.data : [];
    },
    staleTime: 60 * 1000,
  });

  const eventsQuery = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.INTEGRATION_DASHBOARD_BASE, 'events'],
    queryFn: async () => {
      const res = await integrationApi.listEvents();
      return Array.isArray(res?.data) ? res.data : [];
    },
    staleTime: 60 * 1000,
  });

  const loading =
    statsQuery.isFetching ||
    connectionsQuery.isFetching ||
    eventsQuery.isFetching ||
    historyQuery.isFetching;

  const syncStats = statsQuery.data;
  const totalSyncs = Number(syncStats?.total_syncs ?? 0);
  const successRate = Number(syncStats?.success_rate ?? 0);
  const failed = Number(syncStats?.integration_stats
    ? Object.values(syncStats.integration_stats).reduce((sum, v) => sum + Number(v.failed ?? 0), 0)
    : 0);
  const lastSyncText = syncStats?.last_sync_at
    ? new Date(syncStats.last_sync_at).toLocaleString('zh-CN', { hour12: false })
    : '--';

  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'active-connections',
        title: i18n.t('integration.integration_dashboard_page.k0'),
        value: activeConnections,
        icon: <Plug size={20} />,
        color: 'success',
      },
      {
        id: 'sync-tasks',
        title: i18n.t('integration.integration_dashboard_page.k2'),
        value: totalSyncs,
        icon: <GitMerge size={20} />,
        color: 'primary',
      },
      {
        id: 'success-rate',
        title: i18n.t('integration.integration_dashboard_page.k4'),
        value: successRate.toFixed(1),
        unit: '%',
        icon: <CheckCircle2 size={20} />,
        progress: Math.round(successRate),
        color: 'success',
      },
      {
        id: 'last-sync',
        title: i18n.t('integration.integration_dashboard_page.last_sync'),
        value: lastSyncText,
        icon: <Activity size={20} />,
        color: 'info',
      },
      {
        id: 'errors',
        title: i18n.t('integration.integration_dashboard_page.k9'),
        value: failed,
        icon: <AlertTriangle size={20} />,
        color: 'error',
      },
      {
        id: 'sync-records',
        title: i18n.t('integration.integration_dashboard_page.event_count'),
        value: eventsQuery.data?.length ?? 0,
        icon: <RefreshCw size={20} />,
        color: 'primary',
      },
    ],
    [activeConnections, totalSyncs, successRate, lastSyncText, failed, eventsQuery.data, t]
  );

  const historyByDay = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const row of historyQuery.data ?? []) {
      const day = (row.started_at ?? '').slice(0, 10);
      if (!day) continue;
      buckets.set(day, (buckets.get(day) ?? 0) + 1);
    }
    return [...buckets.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, value]) => ({ label, value }));
  }, [historyQuery.data]);

  const charts: ChartCard[] = useMemo(
    () => [
      {
        id: 'trend',
        title: i18n.t('integration.integration_dashboard_page.k11'),
        type: 'line',
        // 同步历史按天聚合（后端当前库为空时如实显示「暂无数据」）
        data: historyByDay,
      },
      {
        id: 'status',
        title: i18n.t('integration.integration_dashboard_page.k13'),
        type: 'pie',
        data: Object.entries(syncStats?.integration_stats ?? {}).map(([label, v]) => ({
          label,
          value: Number(v.total ?? 0),
        })),
      },
      {
        id: 'systems',
        title: i18n.t('integration.integration_dashboard_page.failed_by_system'),
        type: 'bar',
        data: Object.entries(syncStats?.integration_stats ?? {}).map(([label, v]) => ({
          label,
          value: Number(v.failed ?? 0),
        })),
      },
    ],
    [syncStats, failed, historyByDay]
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
    () =>
      (eventsQuery.data ?? []).slice(0, 5).map((ev) => ({
        id: ev.id,
        title: `${ev.source_system ?? '-'} → ${ev.target_system ?? '-'}`,
        description: `${ev.event_type ?? ''}${ev.error_message ? `：${ev.error_message}` : ''}`,
        time: ev.created_at
          ? new Date(ev.created_at).toLocaleString('zh-CN', { hour12: false })
          : '',
        status: (
          ev.status === 'success' || ev.status === 'synced'
            ? 'success'
            : ev.status === 'failed' || ev.status === 'error'
              ? 'error'
              : 'default'
        ) as 'success' | 'error' | 'default',
        onClick: () => navigate(INTEGRATION_PATHS.events),
      })),
    [eventsQuery.data, navigate]
  );

  return (
    <DashboardTemplate
      title=''
      autoTitle
      loading={loading}
      stats={stats}
      charts={charts}
      quickActions={quickActions}
      recentItems={recentItems}
      recentTitle={t('integration.integration_dashboard_page.k23')}
      onRefresh={() => {
        void statsQuery.refetch();
        void connectionsQuery.refetch();
        void eventsQuery.refetch();
        void historyQuery.refetch();
        addNotification({
          title: t('integration.integration_dashboard_page.k25'),
          message: t('integration.integration_dashboard_page.k24'),
          type: 'success',
        });
      }}
    />
  );
};

export default IntegrationDashboardPage;
