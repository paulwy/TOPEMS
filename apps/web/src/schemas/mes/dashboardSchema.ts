import type { DashboardSchema, StatCardSchema, ChartSchema } from '@/schema';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __mesStats?: Record<string, unknown>;
  }
}

export function useMesDashboardSchema(): DashboardSchema {
  const statCards: StatCardSchema[] = [
    {
      id: 'today-output',
      title: '今日产量',
      value: () => {
        const stats = window.__mesStats;
        return (stats?.today_output as number)?.toLocaleString() ?? '-';
      },
      icon: 'Activity',
      color: 'primary',
      trend: { value: 0, label: '昨日' },
    },
    {
      id: 'equipment-availability',
      title: '设备稼动率',
      value: () => {
        const stats = window.__mesStats;
        return stats ? `${stats?.equipment_availability ?? 0}%` : '-';
      },
      icon: 'BarChart3',
      color: 'info',
      trend: { value: 0, label: '昨日' },
    },
    {
      id: 'yield-rate',
      title: '良品率',
      value: () => {
        const stats = window.__mesStats;
        return stats ? `${stats?.yield_rate ?? 0}%` : '-';
      },
      icon: 'CheckCircle',
      color: 'success',
      trend: { value: 0, label: '昨日' },
    },
    {
      id: 'pending-work-orders',
      title: '待处理工单',
      value: () => {
        const stats = window.__mesStats;
        return (stats?.pending_work_orders as number)?.toLocaleString() ?? '-';
      },
      icon: 'Clock',
      color: 'warning',
      trend: { value: 0, label: '昨日' },
    },
  ];

  const charts: ChartSchema[] = [
    {
      id: 'production-trend',
      title: '产量趋势',
      type: 'bar',
      data: () => {
        const stats = window.__mesStats;
        if (!stats) return [];
        const trend = stats.production_trend as Array<{ name: string; value: number }> | undefined;
        return trend ?? [];
      },
      height: 300,
    },
    {
      id: 'equipment-status',
      title: '设备状态',
      type: 'pie',
      data: () => {
        const stats = window.__mesStats;
        if (!stats) return [];
        const status = stats.equipment_status as Array<{ name: string; value: number }> | undefined;
        return status ?? [];
      },
      height: 300,
    },
    {
      id: 'yield-trend',
      title: '良品率趋势',
      type: 'line',
      data: () => {
        const stats = window.__mesStats;
        if (!stats) return [];
        const trend = stats.yield_trend as Array<{ name: string; value: number }> | undefined;
        return trend ?? [];
      },
      height: 300,
    },
  ];

  return {
    title: 'MES 仪表盘',
    loader: async () => {
      return { statCards: undefined, charts: undefined, table: undefined };
    },
    statCards,
    charts,
  };
}
