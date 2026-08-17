import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageContainer } from '@/components/common';
import { DashboardTemplate } from '@/components/templates';
import type { StatCard, ChartCard, QuickAction } from '@/components/templates';
import { useTranslation } from 'react-i18next';
import { lowcodeApi } from '@/api/lowcode';

export const DashboardPage: React.FC = () => {
  const { data: backendData, isLoading: isBackendLoading } = useQuery({
    queryKey: ['lowcode-dashboard'],
    queryFn: async () => {
      try {
        const res = await lowcodeApi.getDashboardStats();
        return res?.data ?? {};
      } catch {
        return {};
      }
    },
  });
  const { t } = useTranslation('lowcode');
  const stats: StatCard[] = [];
  const charts: ChartCard[] = [];
  const quickActions: QuickAction[] = [];

  return (
    <PageContainer
      title={t('lowcode.dashboard_page.k0')}
      subtitle={t('lowcode.dashboard_page.k1')}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        stats={stats}
        charts={charts}
        quickActions={quickActions}
        quickActionsTitle={t('lowcode.dashboard_page.k2')}
        loading={false}
      />
    </PageContainer>
  );
};

export default DashboardPage;
