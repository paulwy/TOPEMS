import type { DashboardSchema, StatCardSchema, ChartSchema } from '@/schema';
import type { EhsDashboardStats } from '@/api/ehs/dashboard';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __ehsStats?: EhsDashboardStats;
  }
}

export function useEhsDashboardSchema(): DashboardSchema {
  const statCards: StatCardSchema[] = [
    {
      id: 'accident-total',
      title: '事故总数',
      value: () => {
        const stats = window.__ehsStats;
        return (stats?.total_accidents as number)?.toLocaleString() ?? '-';
      },
      icon: 'AlertCircle',
      color: 'error',
      trend: { value: 0, label: '上月' },
    },
    {
      id: 'pending-hazards',
      title: '待处理隐患',
      value: () => {
        const stats = window.__ehsStats;
        return (stats?.pending_hazards as number)?.toLocaleString() ?? '-';
      },
      icon: 'ClipboardList',
      color: 'warning',
      trend: { value: 0, label: '上月' },
    },
    {
      id: 'training-rate',
      title: '安全培训完成率',
      value: () => {
        const stats = window.__ehsStats;
        return stats ? `${stats?.training_rate ?? 0}%` : '-';
      },
      icon: 'CheckCircle',
      color: 'success',
      trend: { value: 0, label: '上月' },
    },
    {
      id: 'drill-count',
      title: '应急演练次数',
      value: () => {
        const stats = window.__ehsStats;
        return (stats?.drill_count as number)?.toLocaleString() ?? '-';
      },
      icon: 'Activity',
      color: 'primary',
      trend: { value: 0, label: '上月' },
    },
  ];

  const charts: ChartSchema[] = [
    {
      id: 'accident-trend',
      title: '事故趋势',
      type: 'bar',
      data: () => {
        const stats = window.__ehsStats;
        if (!stats) return [];
        const trend = stats.accident_trend as Array<{ name: string; value: number }> | undefined;
        return trend ?? [];
      },
      height: 300,
    },
    {
      id: 'hazard-type-distribution',
      title: '隐患类型分布',
      type: 'pie',
      data: () => {
        const stats = window.__ehsStats;
        if (!stats) return [];
        const distribution = stats.hazard_types as
          Array<{ name: string; value: number }> | undefined;
        return distribution ?? [];
      },
      height: 300,
    },
    {
      id: 'training-completion-rate',
      title: '培训完成率',
      type: 'line',
      data: () => {
        const stats = window.__ehsStats;
        if (!stats) return [];
        const rate = stats.training_trend as Array<{ name: string; value: number }> | undefined;
        return rate ?? [];
      },
      height: 300,
    },
  ];

  return {
    title: 'EHS 仪表盘',
    loader: async () => {
      const api = await import('@/api/ehs/dashboard');
      const response = await api.ehsDashboardApi.getOverview();
      if (response.success && response.data) {
        window.__ehsStats = response.data;
      }
      return { statCards: undefined, charts: undefined, table: undefined };
    },
    statCards,
    charts,
  };
}
