import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Puzzle, Tags, ArrowRight } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { DashboardTemplate } from '@/components/templates';
import type { StatCard, ChartCard, QuickAction } from '@/components/templates';
import { useTranslation } from 'react-i18next';
import { marketplaceApi } from '@/api/plugin/marketplace';
import { PLUGIN_PATHS } from '@/module-configs/plugin/config';

/**
 * 插件市场看板。
 *
 * 复用既有 marketplace 汇总接口：插件总数取 total_plugins，
 * 分类数取 categories 长度；不新增后端聚合端点。
 */
export const DashboardPage: React.FC = () => {
  const { t } = useTranslation('plugin');
  const navigate = useNavigate();

  const summaryQuery = useQuery({
    queryKey: ['plugin-dashboard', 'summary'],
    queryFn: async () => {
      const res = await marketplaceApi.getSummary();
      return res.data ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const loading = summaryQuery.isLoading;
  const summary = summaryQuery.data;

  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'total-plugins',
        title: t('plugin.dashboard_page.stat_total_plugins'),
        value: summary?.total_plugins ?? '-',
        icon: <Puzzle size={24} />,
        color: 'primary',
      },
      {
        id: 'categories',
        title: t('plugin.dashboard_page.stat_categories'),
        value: summary?.categories?.length ?? '-',
        icon: <Tags size={24} />,
        color: 'success',
      },
    ],
    [summary, t]
  );

  const charts: ChartCard[] = [];

  const quickActions: QuickAction[] = [
    {
      id: 'plugin-marketplace',
      label: t('plugin.dashboard_page.action_marketplace'),
      icon: <ArrowRight size={18} />,
      onClick: () => navigate(PLUGIN_PATHS.marketplace),
    },
    {
      id: 'plugin-upload',
      label: t('plugin.dashboard_page.action_upload'),
      icon: <ArrowRight size={18} />,
      onClick: () => navigate(PLUGIN_PATHS.upload),
    },
  ];

  return (
    <PageContainer
      title={t('plugin.dashboard_page.k0')}
      subtitle={t('plugin.dashboard_page.k1')}
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
        quickActionsTitle={t('plugin.dashboard_page.k2')}
        loading={loading}
      />
    </PageContainer>
  );
};

export default DashboardPage;
