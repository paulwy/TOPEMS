import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageContainer } from '@/components/common';
import { DashboardTemplate } from '@/components/templates';
import type { StatCard, ChartCard, QuickAction } from '@/components/templates';
import { useTranslation } from 'react-i18next';
import { ticketApi } from '@/api/ticket';

export const DashboardPage: React.FC = () => {
  useQuery({
    queryKey: ['ticket-dashboard'],
    queryFn: async () => {
      try {
        const result = await ticketApi.getStats();
        return result;
      } catch {
        return {};
      }
    },
  });
  const { t } = useTranslation('ticket');
  const stats: StatCard[] = [];
  const charts: ChartCard[] = [];
  const quickActions: QuickAction[] = [];

  return (
    <PageContainer
      title={t('ticket.dashboard_page.k0')}
      subtitle={t('ticket.dashboard_page.k1')}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        stats={stats}
        charts={charts}
        quickActions={quickActions}
        quickActionsTitle={t('ticket.dashboard_page.k2')}
        loading={false}
      />
    </PageContainer>
  );
};

export default DashboardPage;
