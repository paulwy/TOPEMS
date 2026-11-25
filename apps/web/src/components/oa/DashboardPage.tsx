import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarCheck, ClipboardList, Megaphone, ArrowRight } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { DashboardTemplate } from '@/components/templates';
import type { StatCard, ChartCard, QuickAction } from '@/components/templates';
import { useTranslation } from 'react-i18next';
import { oaApi } from '@/api/mobile/oa';
import { announcementApi } from '@/api/erp/core';
import { OA_PATHS } from '@/module-configs/oa/config';

/**
 * 办公自动化（OA）看板。
 *
 * 聚合既有端点：今日会议 / 待办任务 / 未读公告取现成 mobile oa/stats，
 * 公告总数取 erp 公告列表 total；不新增后端聚合端点。
 */
export const DashboardPage: React.FC = () => {
  const { t } = useTranslation('oa');
  const navigate = useNavigate();

  const statsQuery = useQuery({
    queryKey: ['oa-dashboard', 'stats'],
    queryFn: async () => {
      const res = await oaApi.getOaStats();
      return res.data ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const announcementsQuery = useQuery({
    queryKey: ['oa-dashboard', 'announcements'],
    queryFn: async () => {
      const res = await announcementApi.list({ page: 1, page_size: 1 });
      return res.data?.total ?? 0;
    },
    staleTime: 5 * 60 * 1000,
  });

  const loading = statsQuery.isLoading || announcementsQuery.isLoading;
  const stats = statsQuery.data;

  const statCards: StatCard[] = useMemo(
    () => [
      {
        id: 'today-meetings',
        title: t('oa.dashboard_page.stat_today_meetings'),
        value: stats?.total_meetings_today ?? '-',
        icon: <CalendarCheck size={24} />,
        color: 'primary',
      },
      {
        id: 'pending-tasks',
        title: t('oa.dashboard_page.stat_pending_tasks'),
        value: stats?.pending_tasks ?? '-',
        icon: <ClipboardList size={24} />,
        color: 'warning',
      },
      {
        id: 'unread-announcements',
        title: t('oa.dashboard_page.stat_unread_announcements'),
        value: stats?.unread_announcements ?? '-',
        icon: <Megaphone size={24} />,
        color: 'info',
      },
      {
        id: 'announcements',
        title: t('oa.dashboard_page.stat_announcements'),
        value: announcementsQuery.data ?? '-',
        icon: <Megaphone size={24} />,
        color: 'success',
      },
    ],
    [stats, announcementsQuery.data, t]
  );

  const charts: ChartCard[] = [];

  const quickActions: QuickAction[] = [
    {
      id: 'oa-meetings',
      label: t('oa.dashboard_page.action_meetings'),
      icon: <ArrowRight size={18} />,
      onClick: () => navigate(OA_PATHS.meetings),
    },
    {
      id: 'oa-announcements',
      label: t('oa.dashboard_page.action_announcements'),
      icon: <ArrowRight size={18} />,
      onClick: () => navigate(OA_PATHS.announcements),
    },
    {
      id: 'oa-documents',
      label: t('oa.dashboard_page.action_documents'),
      icon: <ArrowRight size={18} />,
      onClick: () => navigate(OA_PATHS.documents),
    },
    {
      id: 'oa-vehicles',
      label: t('oa.dashboard_page.action_vehicles'),
      icon: <ArrowRight size={18} />,
      onClick: () => navigate(OA_PATHS.vehicles),
    },
  ];

  return (
    <PageContainer
      title={t('oa.dashboard_page.k0')}
      subtitle={t('oa.dashboard_page.k1')}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        autoTitle={false}
        title=''
        subtitle=''
        stats={statCards}
        charts={charts}
        quickActions={quickActions}
        quickActionsTitle={t('oa.dashboard_page.k2')}
        loading={loading}
      />
    </PageContainer>
  );
};

export default DashboardPage;
