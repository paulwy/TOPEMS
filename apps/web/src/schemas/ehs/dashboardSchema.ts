import type { DashboardSchema, StatCardSchema, ChartSchema } from '@/schema';
import type { EhsDashboardStats } from '@/api/ehs/dashboard';
import i18n from '@/i18n';

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
      title: i18n.t('ehs.dashboard_schema.k0'),
      value: () => {
        const stats = window.__ehsStats;
        return (stats?.total_accidents as number)?.toLocaleString() ?? '-';
      },
      icon: 'AlertCircle',
      color: 'error',
      trend: { value: 0, label: i18n.t('ehs.dashboard_schema.k1') },
    },
    {
      id: 'pending-hazards',
      title: i18n.t('ehs.dashboard_schema.k2'),
      value: () => {
        const stats = window.__ehsStats;
        return (stats?.pending_hazards as number)?.toLocaleString() ?? '-';
      },
      icon: 'ClipboardList',
      color: 'warning',
      trend: { value: 0, label: i18n.t('ehs.dashboard_schema.k3') },
    },
    {
      id: 'training-rate',
      title: i18n.t('ehs.dashboard_schema.k4'),
      value: () => {
        const stats = window.__ehsStats;
        return stats ? `${stats?.training_rate ?? 0}%` : '-';
      },
      icon: 'CheckCircle',
      color: 'success',
      trend: { value: 0, label: i18n.t('ehs.dashboard_schema.k5') },
    },
    {
      id: 'drill-count',
      title: i18n.t('ehs.dashboard_schema.k6'),
      value: () => {
        const stats = window.__ehsStats;
        return (stats?.drill_count as number)?.toLocaleString() ?? '-';
      },
      icon: 'Activity',
      color: 'primary',
      trend: { value: 0, label: i18n.t('ehs.dashboard_schema.k7') },
    },
  ];

  const charts: ChartSchema[] = [
    {
      id: 'accident-trend',
      title: i18n.t('ehs.dashboard_schema.k8'),
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
      title: i18n.t('ehs.dashboard_schema.k9'),
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
      title: i18n.t('ehs.dashboard_schema.k10'),
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
    title: i18n.t('shared.dashboard_schema.ehs_0'),
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
