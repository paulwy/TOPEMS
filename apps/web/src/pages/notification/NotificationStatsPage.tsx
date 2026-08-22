import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCircle, Archive } from 'lucide-react';
import { PageContainer } from '@/components/common';
import type { NotificationStats } from '@/api/notification';
import { getMyNotificationStats, notificationServiceApi } from '@/api/notification';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';
import { designTokens } from '@/theme/tokens';
import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

const ct = designTokens.colors;
interface ServiceStatus {
  status: string;
  uptime: string;
  dependencies: Array<{ name: string; status: string }>;
}
const NotificationStatsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [timeRange, setTimeRange] = useState('week');
  const { data: stats, isPending: statsLoading } = useQuery<NotificationStats>({
    queryKey: QUERY_KEYS.NOTIFICATION.STATS,
    queryFn: async () => {
      const res = await getMyNotificationStats();
      if (res.success && res.data) {
        return res.data;
      }
      throw new Error(res.message || i18n.t('notification.notification_stats_page.k0'));
    },
    staleTime: 5 * 60 * 1000,
  });
  const { data: serviceStatus } = useQuery<ServiceStatus>({
    queryKey: QUERY_KEYS.NOTIFICATION.SERVICE_HEALTH,
    queryFn: async () => {
      const healthRes = await notificationServiceApi.health();
      if (healthRes.success && healthRes.data) {
        const deps = healthRes.data.dependencies;
        const dependencies =
          typeof deps === 'object' && !Array.isArray(deps)
            ? [
                { name: 'database', status: deps.database },
                { name: 'redis', status: deps.redis },
              ]
            : deps || [];
        return {
          status: healthRes.data.status,
          uptime: healthRes.data.uptime,
          dependencies,
        };
      }
      throw new Error(i18n.t('notification.notification_stats_page.k1'));
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  const loading = statsLoading;
  const loadData = () => {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.NOTIFICATION.STATS,
      exact: false,
      refetchType: 'active',
    });
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.NOTIFICATION.SERVICE_HEALTH,
      exact: false,
      refetchType: 'active',
    });
  };
  const getTypeStats = () => {
    if (!stats) return [];
    const byType = stats.notifications_by_type;
    return [
      { name: i18n.t('notification.notification_stats_page.k2'), value: byType?.system || 0 },
      { name: i18n.t('notification.notification_stats_page.k3'), value: byType?.workflow || 0 },
      { name: i18n.t('notification.notification_stats_page.k4'), value: byType?.reminder || 0 },
      { name: i18n.t('notification.notification_stats_page.k5'), value: byType?.alert || 0 },
      { name: i18n.t('notification.notification_stats_page.k6'), value: byType?.message || 0 },
    ];
  };
  const getDailyStats = () => {
    if (!stats) return [];
    const byDay = stats.notifications_by_day;
    if (!byDay || typeof byDay !== 'object') return [];
    return Object.entries(byDay)
      .map(([date, count]) => ({
        name: date,
        value: typeof count === 'number' ? count : 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(-7);
  };
  const statCards = stats
    ? [
        {
          id: 'total-notifications',
          title: i18n.t('notification.notification_stats_page.k7'),
          value: stats.total_notifications,
          icon: <Bell size={24} />,
          color: 'primary' as const,
        },
        {
          id: 'unread-notifications',
          title: i18n.t('notification.notification_stats_page.k8'),
          value: stats.unread_notifications,
          icon: <Bell size={24} />,
          color: 'error' as const,
        },
        {
          id: 'read-notifications',
          title: i18n.t('notification.notification_stats_page.k9'),
          value: stats.read_notifications,
          icon: <CheckCircle size={24} />,
          color: 'success' as const,
        },
        {
          id: 'archived-notifications',
          title: i18n.t('notification.notification_stats_page.k10'),
          value: stats.archived_notifications,
          icon: <Archive size={24} />,
          color: 'warning' as const,
        },
      ]
    : [];
  const charts = [
    {
      id: 'notification-type-distribution',
      title: i18n.t('notification.notification_stats_page.k11'),
      type: 'bar' as const,
      dataKey: 'value',
      nameKey: 'name',
      data: getTypeStats(),
      colors: ['primary.main', 'secondary.main', 'warning.main', 'error.main', 'success.main'],
    },
    {
      id: 'daily-trend',
      title: i18n.t('notification.notification_stats_page.7_12'),
      type: 'line' as const,
      dataKey: 'value',
      nameKey: 'name',
      data: getDailyStats(),
      colors: ['primary.main'],
    },
  ];
  const tables = stats
    ? [
        {
          id: 'notification-details',
          title: i18n.t('notification.notification_stats_page.k13'),
          columns: [
            { id: 'type', label: i18n.t('notification.notification_stats_page.k14') },
            { id: 'count', label: i18n.t('notification.notification_stats_page.k15') },
            {
              id: 'percentage',
              label: i18n.t('notification.notification_stats_page.k16'),
              render: (value: unknown) => `${Number(value).toFixed(1)}%`,
            },
          ],
          data: [
            {
              type: i18n.t('notification.notification_stats_page.k17'),
              count: stats.notifications_by_type?.system || 0,
              percentage:
                stats.total_notifications > 0
                  ? ((stats.notifications_by_type?.system || 0) / stats.total_notifications) * 100
                  : 0,
            },
            {
              type: i18n.t('notification.notification_stats_page.k18'),
              count: stats.notifications_by_type?.workflow || 0,
              percentage:
                stats.total_notifications > 0
                  ? ((stats.notifications_by_type?.workflow || 0) / stats.total_notifications) * 100
                  : 0,
            },
            {
              type: i18n.t('notification.notification_stats_page.k19'),
              count: stats.notifications_by_type?.reminder || 0,
              percentage:
                stats.total_notifications > 0
                  ? ((stats.notifications_by_type?.reminder || 0) / stats.total_notifications) * 100
                  : 0,
            },
            {
              type: i18n.t('notification.notification_stats_page.k20'),
              count: stats.notifications_by_type?.alert || 0,
              percentage:
                stats.total_notifications > 0
                  ? ((stats.notifications_by_type?.alert || 0) / stats.total_notifications) * 100
                  : 0,
            },
            {
              type: i18n.t('notification.notification_stats_page.k21'),
              count: stats.notifications_by_type?.message || 0,
              percentage:
                stats.total_notifications > 0
                  ? ((stats.notifications_by_type?.message || 0) / stats.total_notifications) * 100
                  : 0,
            },
          ],
        },
      ]
    : [];
  const timeRangeOptions = [
    { label: i18n.t('notification.notification_stats_page.k22'), value: 'today' },
    { label: i18n.t('notification.notification_stats_page.k23'), value: 'week' },
    { label: i18n.t('notification.notification_stats_page.k24'), value: 'month' },
    { label: i18n.t('notification.notification_stats_page.k25'), value: 'quarter' },
    { label: i18n.t('notification.notification_stats_page.k26'), value: 'year' },
  ];
  return (
    <PageContainer padding={false}>
      <StatsPageTemplate
        title={i18n.t('notification.notification_stats_page.k27')}
        subtitle={i18n.t('notification.notification_stats_page.k28')}
        statCards={statCards}
        charts={charts}
        tables={tables}
        loading={loading}
        timeRangeOptions={timeRangeOptions}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        onRefresh={loadData}
        showTimeRange={true}
        showRefresh={true}
        showExport={true}
        showSearch={false}
        customToolbar={
          serviceStatus && (
            <div
              style={{
                backgroundColor: 'common.white',
                borderRadius: 8,
                padding: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    marginRight: 12,
                    backgroundColor:
                      serviceStatus.status === 'healthy' ? ct.success[600] : 'error.700',
                  }}
                />
                <span
                  style={{
                    fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                    fontWeight: 500,
                    color: ct.grey[800],
                  }}
                >
                  {i18n.t('pages.notification_stats_page.k0')}
                  {serviceStatus.status === 'healthy'
                    ? i18n.t('notification.notification_stats_page.k30')
                    : i18n.t('notification.notification_stats_page.k29')}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 24,
                  fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                  color: 'grey.500',
                }}
              >
                <span>{i18n.t('pages.notification_stats_page.k0')}</span>
                {serviceStatus.dependencies.map((dep, idx) => (
                  <span key={idx}>
                    {dep.name}：
                    {dep.status === 'healthy'
                      ? i18n.t('notification.notification_stats_page.k32')
                      : i18n.t('notification.notification_stats_page.k31')}
                  </span>
                ))}
              </div>
            </div>
          )
        }
        chartSectionTitle={i18n.t('notification.notification_stats_page.k33')}
        tableSectionTitle={i18n.t('notification.notification_stats_page.k34')}
      />
    </PageContainer>
  );
};
export default NotificationStatsPage;
