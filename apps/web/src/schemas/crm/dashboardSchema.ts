import type { DashboardSchema, StatCardSchema, ChartSchema } from '@/schema';
import type { CrmDashboardStats } from '@/api/crm/dashboard';
import i18n from '@/i18n';

let crmStats: CrmDashboardStats | undefined;

export function useCrmDashboardSchema(): DashboardSchema {
  const statCards: StatCardSchema[] = [
    {
      id: 'total-opportunities',
      title: i18n.t('shared.dashboard_schema.k0'),
      value: () => {
        const stats = crmStats;
        return (stats?.total_opportunities as number)?.toLocaleString() ?? '-';
      },
      icon: 'Target',
      color: 'primary',
      trend: { value: 0, label: i18n.t('shared.dashboard_schema.k1') },
    },
    {
      id: 'won-amount',
      title: i18n.t('shared.dashboard_schema.k2'),
      value: () => {
        const stats = crmStats;
        return stats ? `¥${(stats?.won_amount as number)?.toLocaleString() ?? 0}` : '-';
      },
      icon: 'TrendingUp',
      color: 'success',
      trend: { value: 0, label: i18n.t('shared.dashboard_schema.k3') },
    },
    {
      id: 'conversion-rate',
      title: i18n.t('shared.dashboard_schema.k4'),
      value: () => {
        const stats = crmStats;
        return stats ? `${stats?.conversion_rate ?? 0}%` : '-';
      },
      icon: 'Users',
      color: 'info',
      trend: { value: 0, label: i18n.t('shared.dashboard_schema.k5') },
    },
    {
      id: 'average-cycle',
      title: i18n.t('shared.dashboard_schema.k6'),
      value: () => {
        const stats = crmStats;
        return stats ? `${stats?.average_cycle ?? 0}${i18n.t('shared.dashboard_schema.k0')}` : '-';
      },
      icon: 'Clock',
      color: 'warning',
      trend: { value: 0, label: i18n.t('shared.dashboard_schema.k7') },
    },
  ];

  const charts: ChartSchema[] = [
    {
      id: 'opportunity-stage-distribution',
      title: i18n.t('shared.dashboard_schema.k8'),
      type: 'bar',
      data: () => {
        const stats = crmStats;
        if (!stats) return [];
        const distribution = stats.opportunity_stages as
          Array<{ name: string; value: number }> | undefined;
        return distribution ?? [];
      },
      height: 300,
    },
    {
      id: 'monthly-performance',
      title: i18n.t('shared.dashboard_schema.k9'),
      type: 'line',
      data: () => {
        const stats = crmStats;
        if (!stats) return [];
        const trend = stats.monthly_performance as
          Array<{ name: string; value: number }> | undefined;
        return trend ?? [];
      },
      height: 300,
    },
    {
      id: 'industry-distribution',
      title: i18n.t('shared.dashboard_schema.k10'),
      type: 'pie',
      data: () => {
        const stats = crmStats;
        if (!stats) return [];
        const distribution = stats.industries as Array<{ name: string; value: number }> | undefined;
        return distribution ?? [];
      },
      height: 300,
    },
  ];

  return {
    title: i18n.t('shared.dashboard_schema.crm_1'),
    loader: async () => {
      const api = await import('@/api/crm/dashboard');
      const response = await api.crmDashboardApi.getOverview();
      if (response.success && response.data) {
        crmStats = response.data;
      }
      return { statCards: undefined, charts: undefined, table: undefined };
    },
    statCards,
    charts,
  };
}
