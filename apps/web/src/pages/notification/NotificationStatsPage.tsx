import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCircle, Archive } from 'lucide-react';
import { PageContainer } from '@/components/common';
import type { NotificationStats } from '@/api/notification';
import { getMyNotificationStats, notificationServiceApi } from '@/api/notification';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';
import { designTokens } from '@/theme/tokens';

import { QUERY_KEYS } from '@/lib/reactQuery';

const ct= designTokens.colors;

interface ServiceStatus {
  status: string;
  uptime: string;
  dependencies: Array<{ name: string; status: string }>;
}

const NotificationStatsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [timeRange, setTimeRange] = useState('week');

  const { data: stats, isPending: statsLoading} = useQuery<NotificationStats>({
    queryKey: QUERY_KEYS.NOTIFICATION.STATS,
    queryFn: async () => {
      const res = await getMyNotificationStats();
      if (res.success && res.data) {
        return res.data;
      }
      throw new Error(res.message || '加载通知统计失败');
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
      throw new Error('加载服务健康状态失败');
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const loading = statsLoading;

  const loadData = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATION.STATS ,
  exact: false,
  refetchType: 'active',
});
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATION.SERVICE_HEALTH ,
  exact: false,
  refetchType: 'active',
});
  };

  const getTypeStats = () => {
    if (!stats) return [];
    const byType = stats.notifications_by_type;
    return [
      { name: '系统通知', value: byType?.system || 0 },
      { name: '审批通知', value: byType?.workflow || 0 },
      { name: '提醒通知', value: byType?.reminder || 0 },
      { name: '告警通知', value: byType?.alert || 0 },
      { name: '消息通知', value: byType?.message || 0 },
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
          title: '总通知数',
          value: stats.total_notifications,
          icon: <Bell size={24} />,
          color: 'primary' as const,
        },
        {
          id: 'unread-notifications',
          title: '未读通知',
          value: stats.unread_notifications,
          icon: <Bell size={24} />,
          color: 'error' as const,
        },
        {
          id: 'read-notifications',
          title: '已读通知',
          value: stats.read_notifications,
          icon: <CheckCircle size={24} />,
          color: 'success' as const,
        },
        {
          id: 'archived-notifications',
          title: '归档通知',
          value: stats.archived_notifications,
          icon: <Archive size={24} />,
          color: 'warning' as const,
        },
      ]
    : [];

  const charts = [
    {
      id: 'notification-type-distribution',
      title: '通知类型分布',
      type: 'bar' as const,
      dataKey: 'value',
      nameKey: 'name',
      data: getTypeStats(),
      colors: ['primary.main', 'secondary.main', 'warning.main', 'error.main', 'success.main'],
    },
    {
      id: 'daily-trend',
      title: '近7天趋势',
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
          title: '详细数据',
          columns: [
            { id: 'type', label: '指标' },
            { id: 'count', label: '数量' },
            {
              id: 'percentage',
              label: '占比',
              render: (value: unknown) => `${Number(value).toFixed(1)}%`,
            },
          ],
          data: [
            {
              type: '系统通知',
              count: stats.notifications_by_type?.system || 0,
              percentage:
                stats.total_notifications > 0
                  ? ((stats.notifications_by_type?.system || 0) / stats.total_notifications) * 100
                  : 0,
            },
            {
              type: '审批通知',
              count: stats.notifications_by_type?.workflow || 0,
              percentage:
                stats.total_notifications > 0
                  ? ((stats.notifications_by_type?.workflow || 0) / stats.total_notifications) * 100
                  : 0,
            },
            {
              type: '提醒通知',
              count: stats.notifications_by_type?.reminder || 0,
              percentage:
                stats.total_notifications > 0
                  ? ((stats.notifications_by_type?.reminder || 0) / stats.total_notifications) * 100
                  : 0,
            },
            {
              type: '告警通知',
              count: stats.notifications_by_type?.alert || 0,
              percentage:
                stats.total_notifications > 0
                  ? ((stats.notifications_by_type?.alert || 0) / stats.total_notifications) * 100
                  : 0,
            },
            {
              type: '消息通知',
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
    { label: '今天', value: 'today' },
    { label: '本周', value: 'week' },
    { label: '本月', value: 'month' },
    { label: '本季度', value: 'quarter' },
    { label: '本年', value: 'year' },
  ];

  return (
    <PageContainer padding={false}>
      <StatsPageTemplate
        title='通知统计'
        subtitle='查看通知数据的统计分析'
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
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: ct.grey[800],
                  }}
                >
                  通知服务状态：{serviceStatus.status === 'healthy' ? '健康' : '异常'}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 24,
                  fontSize: '0.875rem',
                  color: 'grey.500',
                }}
              >
                <span>运行时长：{serviceStatus.uptime}</span>
                {serviceStatus.dependencies.map((dep, idx) => (
                  <span key={idx}>
                    {dep.name}：{dep.status === 'healthy' ? '正常' : '异常'}
                  </span>
                ))}
              </div>
            </div>
          )
        }
        chartSectionTitle='数据图表'
        tableSectionTitle='详细数据'
      />
    </PageContainer>
  );
};

export default NotificationStatsPage;
