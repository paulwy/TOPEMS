import React, { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import {
  Bell,
  CheckCircle,
  Archive,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import type { NotificationStats } from '@/api/notification';
import { getMyNotificationStats, notificationServiceApi } from '@/api/notification';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';

const NotificationStatsPage: React.FC = () => {
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [serviceStatus, setServiceStatus] = useState<{
    status: string;
    uptime: string;
    dependencies: Array<{ name: string; status: string }>;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, healthRes] = await Promise.all([
        getMyNotificationStats(),
        notificationServiceApi.health(),
      ]);

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
      if (healthRes.success && healthRes.data) {
        const deps = healthRes.data.dependencies;
        const dependencies =
          typeof deps === 'object' && !Array.isArray(deps)
            ? [
                { name: 'database', status: deps.database },
                { name: 'redis', status: deps.redis },
              ]
            : deps || [];
        setServiceStatus({
          status: healthRes.data.status,
          uptime: healthRes.data.uptime,
          dependencies,
        });
      }
    } catch (err: unknown) {
      logger.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
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
      colors: ['primary.main', '#8B5CF6', 'warning.main', 'error.main', 'success.main'],
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
              render: (value: number) => `${value.toFixed(1)}%`,
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

  const [timeRange, setTimeRange] = useState('week');

  return (
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
              backgroundColor: 'white',
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
                  backgroundColor: serviceStatus.status === 'healthy' ? '#16a34a' : '#dc2626',
                }}
              />
              <span
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#1f2937',
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
                color: '#6b7280',
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
  );
};

export default NotificationStatsPage;