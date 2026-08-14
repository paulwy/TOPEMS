import { dashboardApi } from '@/api/pm/dashboard';
import type { PmStatistics } from '@/api/pm/types';
import type { DashboardSchema, StatCardSchema, ChartSchema } from '@/schema';
import i18n from '@/i18n';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __pmStats?: PmStatistics;
  }
}

export function usePmDashboardSchema(): DashboardSchema {
  const statCards: StatCardSchema[] = [
    {
      id: 'total-projects',
      title: i18n.t('shared.dashboard_schema.k0'),
      value: () => {
        const stats = window.__pmStats;
        return stats?.total_projects.toLocaleString() ?? '-';
      },
      icon: 'ClipboardList',
      color: 'primary',
      trend: { value: 0, label: i18n.t('shared.dashboard_schema.k1') },
    },
    {
      id: 'active-projects',
      title: i18n.t('shared.dashboard_schema.k2'),
      value: () => {
        const stats = window.__pmStats;
        return stats?.active_projects.toLocaleString() ?? '-';
      },
      icon: 'Activity',
      color: 'info',
      trend: { value: 0, label: i18n.t('shared.dashboard_schema.k3') },
    },
    {
      id: 'completed-projects',
      title: i18n.t('shared.dashboard_schema.k4'),
      value: () => {
        const stats = window.__pmStats;
        return stats?.completed_projects.toLocaleString() ?? '-';
      },
      icon: 'CheckCircle',
      color: 'success',
      trend: { value: 0, label: i18n.t('shared.dashboard_schema.k5') },
    },
    {
      id: 'delayed-projects',
      title: i18n.t('shared.dashboard_schema.k6'),
      value: () => {
        const stats = window.__pmStats;
        return stats?.delayed_projects?.toLocaleString() ?? '-';
      },
      icon: 'AlertCircle',
      color: 'error',
      trend: { value: 0, label: i18n.t('shared.dashboard_schema.k7') },
    },
  ];

  const charts: ChartSchema[] = [
    {
      id: 'project-status-distribution',
      title: i18n.t('shared.dashboard_schema.k8'),
      type: 'bar',
      data: () => {
        const stats = window.__pmStats;
        if (!stats) return [];
        return [
          { name: i18n.t('shared.dashboard_schema.k9'), value: stats.draft_projects },
          { name: i18n.t('shared.dashboard_schema.k10'), value: stats.pending_projects },
          { name: i18n.t('shared.dashboard_schema.k11'), value: stats.active_projects },
          { name: i18n.t('shared.dashboard_schema.k12'), value: stats.completed_projects },
          { name: i18n.t('shared.dashboard_schema.k13'), value: stats.cancelled_projects },
        ];
      },
      height: 300,
    },
    {
      id: 'monthly-completion-rate',
      title: i18n.t('shared.dashboard_schema.k14'),
      type: 'line',
      data: () => {
        const stats = window.__pmStats;
        if (!stats) return [];
        return [
          { name: i18n.t('shared.dashboard_schema.k15'), value: stats.average_progress },
          { name: i18n.t('shared.dashboard_schema.k16'), value: stats.budget_usage_rate },
        ];
      },
      height: 300,
    },
  ];

  return {
    title: i18n.t('shared.dashboard_schema.pm_0'),
    loader: async () => {
      const response = await dashboardApi.getStatistics();
      if (response.success && response.data) {
        window.__pmStats = response.data;
      }
      return { statCards: undefined, charts: undefined, table: undefined };
    },
    statCards,
    charts,
  };
}
