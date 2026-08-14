import type { DashboardSchema, StatCardSchema, ChartSchema } from '@/schema';
import i18n from '@/i18n';

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
      title: i18n.t('mes.dashboard_schema.k0'),
      value: () => {
        const stats = window.__mesStats;
        return (stats?.today_output as number)?.toLocaleString() ?? '-';
      },
      icon: 'Activity',
      color: 'primary',
      trend: { value: 0, label: i18n.t('mes.dashboard_schema.k1') },
    },
    {
      id: 'equipment-availability',
      title: i18n.t('mes.dashboard_schema.k2'),
      value: () => {
        const stats = window.__mesStats;
        return stats ? `${stats?.equipment_availability ?? 0}%` : '-';
      },
      icon: 'BarChart3',
      color: 'info',
      trend: { value: 0, label: i18n.t('mes.dashboard_schema.k3') },
    },
    {
      id: 'yield-rate',
      title: i18n.t('mes.dashboard_schema.k4'),
      value: () => {
        const stats = window.__mesStats;
        return stats ? `${stats?.yield_rate ?? 0}%` : '-';
      },
      icon: 'CheckCircle',
      color: 'success',
      trend: { value: 0, label: i18n.t('mes.dashboard_schema.k5') },
    },
    {
      id: 'pending-work-orders',
      title: i18n.t('mes.dashboard_schema.k6'),
      value: () => {
        const stats = window.__mesStats;
        return (stats?.pending_work_orders as number)?.toLocaleString() ?? '-';
      },
      icon: 'Clock',
      color: 'warning',
      trend: { value: 0, label: i18n.t('mes.dashboard_schema.k7') },
    },
  ];

  const charts: ChartSchema[] = [
    {
      id: 'production-trend',
      title: i18n.t('mes.dashboard_schema.k8'),
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
      title: i18n.t('mes.dashboard_schema.k9'),
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
      title: i18n.t('mes.dashboard_schema.k10'),
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
    title: i18n.t('shared.dashboard_schema.mes_0'),
    loader: async () => {
      return { statCards: undefined, charts: undefined, table: undefined };
    },
    statCards,
    charts,
  };
}
