import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Package, Boxes, ArrowRight } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { DashboardTemplate } from '@/components/templates';
import type { StatCard, ChartCard, QuickAction } from '@/components/templates';
import { useTranslation } from 'react-i18next';
import { assetApi, fixedAssetApi } from '@/api/asset/asset';
import { ASSET_PATHS } from '@/module-configs/asset/config';

/**
 * 资产管理看板。
 *
 * 前端聚合既有列表接口：在用资产总数取 assetApi.list().total，
 * 固定资产总数取 fixedAssetApi.list().total，不新增后端聚合端点。
 */
export const DashboardPage: React.FC = () => {
  const { t } = useTranslation('asset');
  const navigate = useNavigate();

  const assetsQuery = useQuery({
    queryKey: ['asset-dashboard', 'assets'],
    queryFn: async () => {
      const res = await assetApi.list({ page: 1, page_size: 1 });
      return res.data?.total ?? 0;
    },
    staleTime: 5 * 60 * 1000,
  });

  const fixedAssetsQuery = useQuery({
    queryKey: ['asset-dashboard', 'fixed-assets'],
    queryFn: async () => {
      const res = await fixedAssetApi.list({ page: 1, page_size: 1 });
      return res.data?.total ?? 0;
    },
    staleTime: 5 * 60 * 1000,
  });

  const loading = assetsQuery.isLoading || fixedAssetsQuery.isLoading;

  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'assets',
        title: t('asset.dashboard_page.stat_assets'),
        value: assetsQuery.data ?? '-',
        icon: <Package size={24} />,
        color: 'primary',
      },
      {
        id: 'fixed-assets',
        title: t('asset.dashboard_page.stat_fixed_assets'),
        value: fixedAssetsQuery.data ?? '-',
        icon: <Boxes size={24} />,
        color: 'success',
      },
    ],
    [assetsQuery.data, fixedAssetsQuery.data, t]
  );

  const charts: ChartCard[] = [];

  const quickActions: QuickAction[] = [
    {
      id: 'asset-list',
      label: t('asset.dashboard_page.action_list'),
      icon: <ArrowRight size={18} />,
      onClick: () => navigate(ASSET_PATHS.list),
    },
    {
      id: 'asset-categories',
      label: t('asset.dashboard_page.action_categories'),
      icon: <ArrowRight size={18} />,
      onClick: () => navigate(ASSET_PATHS.categories),
    },
    {
      id: 'asset-depreciation',
      label: t('asset.dashboard_page.action_depreciation'),
      icon: <ArrowRight size={18} />,
      onClick: () => navigate(ASSET_PATHS.depreciation),
    },
    {
      id: 'asset-transfers',
      label: t('asset.dashboard_page.action_transfers'),
      icon: <ArrowRight size={18} />,
      onClick: () => navigate(ASSET_PATHS.transfers),
    },
  ];

  return (
    <PageContainer
      title={t('asset.dashboard_page.k0')}
      subtitle={t('asset.dashboard_page.k1')}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        autoTitle={false}
        title=''
        subtitle=''
        stats={stats}
        charts={charts}
        quickActions={quickActions}
        quickActionsTitle={t('asset.dashboard_page.k2')}
        loading={loading}
      />
    </PageContainer>
  );
};

export default DashboardPage;
