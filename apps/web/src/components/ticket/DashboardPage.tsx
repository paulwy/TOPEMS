import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Ticket, ClipboardCheck, Loader2, AlertOctagon, ArrowRight } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { DashboardTemplate } from '@/components/templates';
import type { StatCard, ChartCard, QuickAction } from '@/components/templates';
import { useTranslation } from 'react-i18next';
import { ticketApi } from '@/api/ticket';
import { TICKET_PATHS } from '@/module-configs/ticket/config';

/**
 * 工单中心看板。
 *
 * 复用既有 `/tickets/stats` 统计接口：工单总数、待处理、处理中、SLA 违约，
 * 不新增后端聚合端点。
 */
export const DashboardPage: React.FC = () => {
  const { t } = useTranslation('ticket');
  const navigate = useNavigate();

  const statsQuery = useQuery({
    queryKey: ['ticket-dashboard', 'stats'],
    queryFn: async () => {
      const res = await ticketApi.getStats();
      return res.data ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const loading = statsQuery.isLoading;
  const stats = statsQuery.data;

  const statCards: StatCard[] = useMemo(
    () => [
      {
        id: 'total',
        title: t('ticket.dashboard_page.stat_total'),
        value: stats?.total ?? '-',
        icon: <Ticket size={24} />,
        color: 'primary',
      },
      {
        id: 'open',
        title: t('ticket.dashboard_page.stat_open'),
        value: stats?.open ?? '-',
        icon: <ClipboardCheck size={24} />,
        color: 'warning',
      },
      {
        id: 'in-progress',
        title: t('ticket.dashboard_page.stat_in_progress'),
        value: stats?.in_progress ?? '-',
        icon: <Loader2 size={24} />,
        color: 'info',
      },
      {
        id: 'sla-breached',
        title: t('ticket.dashboard_page.stat_sla_breached'),
        value: stats?.sla_breached ?? '-',
        icon: <AlertOctagon size={24} />,
        color: 'error',
      },
    ],
    [stats, t]
  );

  const charts: ChartCard[] = [];

  const quickActions: QuickAction[] = [
    {
      id: 'ticket-center',
      label: t('ticket.dashboard_page.action_center'),
      icon: <ArrowRight size={18} />,
      onClick: () => navigate(TICKET_PATHS.center),
    },
  ];

  return (
    <PageContainer
      title={t('ticket.dashboard_page.k0')}
      subtitle={t('ticket.dashboard_page.k1')}
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
        quickActionsTitle={t('ticket.dashboard_page.k2')}
        loading={loading}
      />
    </PageContainer>
  );
};

export default DashboardPage;
