import type { DashboardSchema, StatCardSchema, ChartSchema } from '@/schema';
import type { PdmDashboardStats } from '@/api/pdm/dashboard';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __pdmStats?: PdmDashboardStats;
  }
}

export function usePdmDashboardSchema(): DashboardSchema {
  const statCards: StatCardSchema[] = [
    {
      id: 'ongoing-projects',
      title: '进行中项目',
      value: () => {
        const stats = window.__pdmStats;
        return (stats?.ongoing_projects as number)?.toLocaleString() ?? '-';
      },
      icon: 'ClipboardList',
      color: 'primary',
      trend: { value: 0, label: '上月' },
    },
    {
      id: 'pending-reviews',
      title: '待审核文档',
      value: () => {
        const stats = window.__pdmStats;
        return (stats?.pending_reviews as number)?.toLocaleString() ?? '-';
      },
      icon: 'FileText',
      color: 'warning',
      trend: { value: 0, label: '上月' },
    },
    {
      id: 'bom-changes',
      title: 'BOM 变更数',
      value: () => {
        const stats = window.__pdmStats;
        return (stats?.bom_changes as number)?.toLocaleString() ?? '-';
      },
      icon: 'AlertCircle',
      color: 'error',
      trend: { value: 0, label: '上月' },
    },
    {
      id: 'completion-rate',
      title: '完成率',
      value: () => {
        const stats = window.__pdmStats;
        return stats ? `${stats?.completion_rate ?? 0}%` : '-';
      },
      icon: 'Target',
      color: 'success',
      trend: { value: 0, label: '上月' },
    },
  ];

  const charts: ChartSchema[] = [
    {
      id: 'project-distribution',
      title: '项目分布',
      type: 'bar',
      data: () => {
        const stats = window.__pdmStats;
        if (!stats) return [];
        const distribution = stats.project_distribution as
          Array<{ name: string; value: number }> | undefined;
        return distribution ?? [];
      },
      height: 300,
    },
    {
      id: 'document-types',
      title: '文档类型',
      type: 'pie',
      data: () => {
        const stats = window.__pdmStats;
        if (!stats) return [];
        const types = stats.document_types as Array<{ name: string; value: number }> | undefined;
        return types ?? [];
      },
      height: 300,
    },
    {
      id: 'change-trend',
      title: '变更趋势',
      type: 'line',
      data: () => {
        const stats = window.__pdmStats;
        if (!stats) return [];
        const trend = stats.change_trend as Array<{ name: string; value: number }> | undefined;
        return trend ?? [];
      },
      height: 300,
    },
  ];

  return {
    title: 'PDM 仪表盘',
    loader: async () => {
      const api = await import('@/api/pdm/dashboard');
      const response = await api.pdmDashboardApi.getOverview();
      if (response.success && response.data) {
        window.__pdmStats = response.data;
      }
      return { statCards: undefined, charts: undefined, table: undefined };
    },
    statCards,
    charts,
  };
}
