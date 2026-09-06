import type { DashboardSchema, StatCardSchema, ChartSchema } from '@/schema';
import type { PdmDashboardStats } from '@/api/pdm/dashboard';
import i18n from '@/i18n';

let pdmStats: PdmDashboardStats | undefined;

export function usePdmDashboardSchema(): DashboardSchema {
  const statCards: StatCardSchema[] = [
    {
      id: 'ongoing-projects',
      title: i18n.t('pdm.dashboard_schema.k0'),
      value: () => {
        const stats = pdmStats;
        return (stats?.ongoing_projects as number)?.toLocaleString() ?? '-';
      },
      icon: 'ClipboardList',
      color: 'primary',
      trend: { value: 0, label: i18n.t('pdm.dashboard_schema.k1') },
    },
    {
      id: 'pending-reviews',
      title: i18n.t('pdm.dashboard_schema.k2'),
      value: () => {
        const stats = pdmStats;
        return (stats?.pending_reviews as number)?.toLocaleString() ?? '-';
      },
      icon: 'FileText',
      color: 'warning',
      trend: { value: 0, label: i18n.t('pdm.dashboard_schema.k3') },
    },
    {
      id: 'bom-changes',
      title: i18n.t('shared.dashboard_schema.bom_0'),
      value: () => {
        const stats = pdmStats;
        return (stats?.bom_changes as number)?.toLocaleString() ?? '-';
      },
      icon: 'AlertCircle',
      color: 'error',
      trend: { value: 0, label: i18n.t('pdm.dashboard_schema.k4') },
    },
    {
      id: 'completion-rate',
      title: i18n.t('pdm.dashboard_schema.k5'),
      value: () => {
        const stats = pdmStats;
        return stats ? `${stats?.completion_rate ?? 0}%` : '-';
      },
      icon: 'Target',
      color: 'success',
      trend: { value: 0, label: i18n.t('pdm.dashboard_schema.k6') },
    },
  ];

  const charts: ChartSchema[] = [
    {
      id: 'project-distribution',
      title: i18n.t('pdm.dashboard_schema.k7'),
      type: 'bar',
      data: () => {
        const stats = pdmStats;
        if (!stats) return [];
        const distribution = stats.project_distribution as
          Array<{ name: string; value: number }> | undefined;
        return distribution ?? [];
      },
      height: 300,
    },
    {
      id: 'document-types',
      title: i18n.t('pdm.dashboard_schema.k8'),
      type: 'pie',
      data: () => {
        const stats = pdmStats;
        if (!stats) return [];
        const types = stats.document_types as Array<{ name: string; value: number }> | undefined;
        return types ?? [];
      },
      height: 300,
    },
    {
      id: 'change-trend',
      title: i18n.t('pdm.dashboard_schema.k9'),
      type: 'line',
      data: () => {
        const stats = pdmStats;
        if (!stats) return [];
        const trend = stats.change_trend as Array<{ name: string; value: number }> | undefined;
        return trend ?? [];
      },
      height: 300,
    },
  ];

  return {
    title: i18n.t('shared.dashboard_schema.pdm_1'),
    loader: async () => {
      const api = await import('@/api/pdm/dashboard');
      const response = await api.pdmDashboardApi.getOverview();
      if (response.success && response.data) {
        pdmStats = response.data;
      }
      return { statCards: undefined, charts: undefined, table: undefined };
    },
    statCards,
    charts,
  };
}
