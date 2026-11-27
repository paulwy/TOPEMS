/**
 * 通知看板
 *
 * 全部数字来自真实接口，原先的 23/42/256/87.5%、七日折线（sent/read 写死数组）、
 * 类型与渠道分布常量、5 条示例通知已删除：
 *  - GET /notification/notifications/stats/me → total / total_unread / by_type
 *  - GET /notification/notification/channels  → 渠道数
 *  - GET /notification/notification-templates → 模板数
 *  - GET /notification/notifications          → 最近通知
 * 后端只给 by_type，没有按天序列，所以趋势图如实显示「暂无数据」。
 */
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  Inbox,
  CheckCheck,
  Layers,
  FileText,
  TrendingUp,
  PieChart,
  Eye,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import i18n from '@/i18n';

import { useNavigate } from 'react-router-dom';
import { NOTIFICATION_PATHS } from '@/module-configs/notification/config';
import {
  DashboardTemplate,
  type StatCard,
  type ChartCard,
  type QuickAction,
  type RecentItem,
} from '@/components/templates';
import { useNotificationStore } from '@/store';
import { QUERY_KEYS } from '@/lib/reactQuery';
import {
  getMyNotificationStats,
  getNotifications,
  getTemplates,
  notificationApi,
} from '@/api/notification';

interface MyStats {
  total: number;
  total_unread: number;
  by_type: Array<{ notification_type?: string; count?: number }>;
}

export const NotificationDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const statsQuery = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.NOTIFICATION_DASHBOARD_BASE, 'stats'],
    queryFn: async () => {
      const res = await getMyNotificationStats();
      return (res?.data ?? null) as unknown as MyStats | null;
    },
    staleTime: 60 * 1000,
  });

  const channelsQuery = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.NOTIFICATION_DASHBOARD_BASE, 'channels'],
    queryFn: async () => {
      const res = await notificationApi.listChannels({ page: 1, page_size: 1 });
      return Number((res?.data as { total?: number } | undefined)?.total ?? 0);
    },
    staleTime: 5 * 60 * 1000,
  });

  const templatesQuery = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.NOTIFICATION_DASHBOARD_BASE, 'templates'],
    queryFn: async () => {
      const res = await getTemplates(1, 1);
      const d = res?.data as unknown;
      if (Array.isArray(d)) return d.length;
      return Number((d as { total?: number } | undefined)?.total ?? 0);
    },
    staleTime: 5 * 60 * 1000,
  });

  const recentQuery = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.NOTIFICATION_DASHBOARD_BASE, 'recent'],
    queryFn: async () => {
      const res = await getNotifications(1, 5);
      return (res?.data?.notifications ?? []) as Array<{
        id: string;
        title: string;
        content?: string;
        notification_type?: string;
        is_read?: boolean;
        created_at?: string;
        priority?: number;
      }>;
    },
    staleTime: 60 * 1000,
  });

  const loading =
    statsQuery.isFetching ||
    channelsQuery.isFetching ||
    templatesQuery.isFetching ||
    recentQuery.isFetching;

  const statsData = statsQuery.data;
  const total = Number(statsData?.total ?? 0);
  const unread = Number(statsData?.total_unread ?? 0);
  const readRate = total > 0 ? ((total - unread) / total) * 100 : 0;

  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'unread',
        title: i18n.t('notification.notification_dashboard_page.k0'),
        value: unread,
        icon: <Bell size={20} />,
        color: 'error',
      },
      {
        id: 'total',
        title: i18n.t('notification.notification_dashboard_page.total_count'),
        value: total,
        icon: <Inbox size={20} />,
        color: 'primary',
      },
      {
        id: 'read-rate',
        title: i18n.t('notification.notification_dashboard_page.k6'),
        value: readRate.toFixed(1),
        unit: '%',
        icon: <CheckCheck size={20} />,
        progress: Math.round(readRate),
        color: 'success',
      },
      {
        id: 'channels',
        title: i18n.t('notification.notification_dashboard_page.k8'),
        value: channelsQuery.data ?? 0,
        icon: <Layers size={20} />,
        color: 'warning',
      },
      {
        id: 'templates',
        title: i18n.t('notification.notification_dashboard_page.k10'),
        value: templatesQuery.data ?? 0,
        icon: <FileText size={20} />,
        color: 'secondary',
      },
    ],
    [unread, total, readRate, channelsQuery.data, templatesQuery.data]
  );

  const typeDistribution = useMemo(
    () =>
      (statsData?.by_type ?? [])
        .filter((t) => Number(t.count ?? 0) > 0)
        .map((t) => ({ name: t.notification_type ?? '-', value: Number(t.count ?? 0) })),
    [statsData]
  );

  const charts: ChartCard[] = useMemo(
    () => [
      {
        id: 'trend',
        title: i18n.t('notification.notification_dashboard_page.k12'),
        subtitle: i18n.t('notification.notification_dashboard_page.7_13'),
        type: 'line',
        // stats/me 只返回累计与 by_type，没有按天序列；空数据如实渲染「暂无数据」
        data: [],
      },
      {
        id: 'type-distribution',
        title: i18n.t('notification.notification_dashboard_page.k14'),
        subtitle: i18n.t('notification.notification_dashboard_page.k15'),
        type: 'pie',
        data: typeDistribution.map((t) => ({ label: t.name, value: t.value })),
      },
    ],
    [typeDistribution]
  );

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: 'view-unread',
        label: i18n.t('notification.notification_dashboard_page.k18'),
        icon: <Eye size={20} />,
        color: 'primary.light',
        onClick: () => {
          navigate(`${NOTIFICATION_PATHS.list}?filter=unread`);
          addNotification({
            message: i18n.t('notification.notification_dashboard_page.k19'),
            type: 'info',
            duration: 2000,
          });
        },
      },
      {
        id: 'mark-all-read',
        label: i18n.t('notification.notification_dashboard_page.k20'),
        icon: <CheckCheck size={20} />,
        color: 'success.light',
        onClick: () => {
          addNotification({
            message: i18n.t('notification.notification_dashboard_page.k21'),
            type: 'success',
            duration: 2000,
          });
        },
      },
      // 「通知偏好设置」「模板管理」两个快捷入口已摘掉：对应页面的后端接口未实现，
      // 保留会跳到空表/错误页。恢复条件见 docs/frontend/notification-contract-gap-20261126.md
    ],
    [navigate, addNotification]
  );

  const recentItems: RecentItem[] = useMemo(
    () =>
      (recentQuery.data ?? []).map((n) => ({
        id: n.id,
        title: n.title,
        description: n.content ?? '',
        time: n.created_at
          ? new Date(n.created_at).toLocaleString('zh-CN', { hour12: false })
          : '',
        icon: n.is_read ? <CheckCircle size={18} /> : <AlertCircle size={18} />,
        status: (n.is_read ? 'success' : 'warning') as 'success' | 'warning',
        onClick: () => navigate(NOTIFICATION_PATHS.detail.replace(':id', n.id)),
      })),
    [recentQuery.data, navigate]
  );

  const handleRefresh = () => {
    void statsQuery.refetch();
    void channelsQuery.refetch();
    void templatesQuery.refetch();
    void recentQuery.refetch();
    addNotification({
      message: i18n.t('notification.notification_dashboard_page.k32'),
      type: 'success',
      duration: 2000,
    });
  };

  return (
    <DashboardTemplate
      title=''
      autoTitle
      loading={loading}
      stats={stats}
      charts={charts}
      quickActions={quickActions}
      recentItems={recentItems}
      recentTitle={i18n.t('notification.notification_dashboard_page.k33')}
      onRefresh={handleRefresh}
    />
  );
};

export default NotificationDashboardPage;
