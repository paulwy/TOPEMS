import React from 'react';
import { PageContainer } from '@/components/common';
import { DashboardTemplate } from '@/components/templates';
import type { StatCard, ChartCard, QuickAction } from '@/components/templates';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { assetApi } from '@/api/erp';

export const DashboardPage: React.FC = () => {
  const { data: backendData, isLoading: isBackendLoading } = useQuery({
    queryKey: ['asset-dashboard'],
    queryFn: async () => {
      try {
        // TODO: assetApi.getDashboardStats 方法不存在
        return {};
      } catch (e) {
        return {};
      }
    },
  });
  const { t } = useTranslation('asset');
  const stats: StatCard[] = [];
  const charts: ChartCard[] = [];
  const quickActions: QuickAction[] = [];

  return (
    <PageContainer
      title={t('asset.dashboard_page.k0')}
      subtitle={t('asset.dashboard_page.k1')}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        stats={stats}
        charts={charts}
        quickActions={quickActions}
        quickActionsTitle={t('asset.dashboard_page.k2')}
        loading={false}
      />
    </PageContainer>
  );
};

export default DashboardPage;
