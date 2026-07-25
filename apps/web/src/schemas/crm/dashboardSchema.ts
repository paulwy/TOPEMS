import type { DashboardSchema, StatCardSchema, ChartSchema } from '@/schema';
import type { CrmDashboardStats } from '@/api/crm/dashboard';

declare global {
  interface Window {
    __crmStats?: CrmDashboardStats;
  }
}

export function useCrmDashboardSchema(): DashboardSchema {
  const statCards: StatCardSchema[] = [
    {
      id: 'total-opportunities',
      title: '总商机数',
      value: () => {
        const stats = window.__crmStats;
        return (stats?.total_opportunities as number)?.toLocaleString() ?? '-';
      },
      icon: 'Target',
      color: 'primary',
      trend: { value: 0, label: '上月' },
    },
    {
      id: 'won-amount',
      title: '赢单金额',
      value: () => {
        const stats = window.__crmStats;
        return stats ? `¥${(stats?.won_amount as number)?.toLocaleString() ?? 0}` : '-';
      },
      icon: 'TrendingUp',
      color: 'success',
      trend: { value: 0, label: '上月' },
    },
    {
      id: 'conversion-rate',
      title: '转化率',
      value: () => {
        const stats = window.__crmStats;
        return stats ? `${stats?.conversion_rate ?? 0}%` : '-';
      },
      icon: 'Users',
      color: 'info',
      trend: { value: 0, label: '上月' },
    },
    {
      id: 'average-cycle',
      title: '平均周期',
      value: () => {
        const stats = window.__crmStats;
        return stats ? `${stats?.average_cycle ?? 0}天` : '-';
      },
      icon: 'Clock',
      color: 'warning',
      trend: { value: 0, label: '上月' },
    },
  ];

  const charts: ChartSchema[] = [
    {
      id: 'opportunity-stage-distribution',
      title: '商机阶段分布',
      type: 'bar',
      data: () => {
        const stats = window.__crmStats;
        if (!stats) return [];
        const distribution = stats.opportunity_stages as
          Array<{ name: string; value: number }> | undefined;
        return distribution ?? [];
      },
      height: 300,
    },
    {
      id: 'monthly-performance',
      title: '月度业绩趋势',
      type: 'line',
      data: () => {
        const stats = window.__crmStats;
        if (!stats) return [];
        const trend = stats.monthly_performance as
          Array<{ name: string; value: number }> | undefined;
        return trend ?? [];
      },
      height: 300,
    },
    {
      id: 'industry-distribution',
      title: '行业分布',
      type: 'pie',
      data: () => {
        const stats = window.__crmStats;
        if (!stats) return [];
        const distribution = stats.industries as Array<{ name: string; value: number }> | undefined;
        return distribution ?? [];
      },
      height: 300,
    },
  ];

  return {
    title: 'CRM 仪表盘',
    loader: async () => {
      const api = await import('@/api/crm/dashboard');
      const response = await api.crmDashboardApi.getOverview();
      if (response.success && response.data) {
        window.__crmStats = response.data;
      }
      return { statCards: undefined, charts: undefined, table: undefined };
    },
    statCards,
    charts,
  };
}
