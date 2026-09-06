import type { DashboardSchema, StatCardSchema, ChartSchema } from '@/schema';
import type { LimsDashboardStats } from '@/api/lims/dashboard';
import i18n from '@/i18n';

let limsStats: LimsDashboardStats | undefined;

export function useLimsDashboardSchema(): DashboardSchema {
  const statCards: StatCardSchema[] = [
    {
      id: 'pending-samples',
      title: i18n.t('lims.dashboard_schema.k0'),
      value: () => {
        const stats = limsStats;
        return (stats?.pending_samples as number)?.toLocaleString() ?? '-';
      },
      icon: 'FileText',
      color: 'warning',
      trend: { value: 0, label: i18n.t('lims.dashboard_schema.k1') },
    },
    {
      id: 'in-progress-tasks',
      title: i18n.t('lims.dashboard_schema.k2'),
      value: () => {
        const stats = limsStats;
        return (stats?.in_progress_tasks as number)?.toLocaleString() ?? '-';
      },
      icon: 'Clock',
      color: 'info',
      trend: { value: 0, label: i18n.t('lims.dashboard_schema.k3') },
    },
    {
      id: 'instrument-usage',
      title: i18n.t('lims.dashboard_schema.k4'),
      value: () => {
        const stats = limsStats;
        return stats ? `${stats?.instrument_usage ?? 0}%` : '-';
      },
      icon: 'BarChart3',
      color: 'primary',
      trend: { value: 0, label: i18n.t('lims.dashboard_schema.k5') },
    },
    {
      id: 'pass-rate',
      title: i18n.t('lims.dashboard_schema.k6'),
      value: () => {
        const stats = limsStats;
        return stats ? `${stats?.pass_rate ?? 0}%` : '-';
      },
      icon: 'CheckCircle',
      color: 'success',
      trend: { value: 0, label: i18n.t('lims.dashboard_schema.k7') },
    },
  ];

  const charts: ChartSchema[] = [
    {
      id: 'test-item-distribution',
      title: i18n.t('lims.dashboard_schema.k8'),
      type: 'bar',
      data: () => {
        const stats = limsStats;
        if (!stats) return [];
        const distribution = stats.test_items as Array<{ name: string; value: number }> | undefined;
        return distribution ?? [];
      },
      height: 300,
    },
    {
      id: 'task-completion-rate',
      title: i18n.t('lims.dashboard_schema.k9'),
      type: 'line',
      data: () => {
        const stats = limsStats;
        if (!stats) return [];
        const rate = stats.task_completion as Array<{ name: string; value: number }> | undefined;
        return rate ?? [];
      },
      height: 300,
    },
    {
      id: 'instrument-status',
      title: i18n.t('lims.dashboard_schema.k10'),
      type: 'pie',
      data: () => {
        const stats = limsStats;
        if (!stats) return [];
        const status = stats.instrument_status as
          Array<{ name: string; value: number }> | undefined;
        return status ?? [];
      },
      height: 300,
    },
  ];

  return {
    title: i18n.t('shared.dashboard_schema.lims_0'),
    loader: async () => {
      const api = await import('@/api/lims/dashboard');
      const response = await api.limsDashboardApi.getOverview();
      if (response.success && response.data) {
        limsStats = response.data;
      }
      return { statCards: undefined, charts: undefined, table: undefined };
    },
    statCards,
    charts,
  };
}
