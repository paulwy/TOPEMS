import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageContainer } from '@/components/common';
import { DashboardTemplate } from '@/components/templates';
import type { StatCard, ChartCard, QuickAction } from '@/components/templates';
import { useTranslation } from 'react-i18next';
import { getMarketplaceSummary } from '@/api/plugin';

export const DashboardPage: React.FC = () => {
  const { data: backendData, isLoading: isBackendLoading } = useQuery({
    queryKey: ['plugin-dashboard'],
    queryFn: async () => {
      try {
        const res = await getMarketplaceSummary();
        if (res && (res as { success?: boolean }).success !== false) return res;
        return {};
      } catch {
        return {};
      }
    },
  });
  const { t } = useTranslation('plugin');
  const stats: StatCard[] = [];
  const charts: ChartCard[] = [];
  const quickActions: QuickAction[] = [];

  return (
    <PageContainer
      title={t('plugin.dashboard_page.k0')}
      subtitle={t('plugin.dashboard_page.k1')}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        stats={stats}
        charts={charts}
        quickActions={quickActions}
        quickActionsTitle={t('plugin.dashboard_page.k2')}
        loading={false}
      />
    </PageContainer>
  );
};

export default DashboardPage;
