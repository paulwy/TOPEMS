import type { DashboardSchema, StatCardSchema, ChartSchema } from '@/schema';
import type { LimsDashboardStats } from '@/api/lims/dashboard';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __limsStats?: LimsDashboardStats;
  }
}

export function useLimsDashboardSchema(): DashboardSchema {
  const statCards: StatCardSchema[] = [
    {
      id: 'pending-samples',
      title: '待检样本',
      value: () => {
        const stats = window.__limsStats;
        return (stats?.pending_samples as number)?.toLocaleString() ?? '-';
      },
      icon: 'FileText',
      color: 'warning',
      trend: { value: 0, label: '上月' },
    },
    {
      id: 'in-progress-tasks',
      title: '进行中任务',
      value: () => {
        const stats = window.__limsStats;
        return (stats?.in_progress_tasks as number)?.toLocaleString() ?? '-';
      },
      icon: 'Clock',
      color: 'info',
      trend: { value: 0, label: '上月' },
    },
    {
      id: 'instrument-usage',
      title: '仪器使用率',
      value: () => {
        const stats = window.__limsStats;
        return stats ? `${stats?.instrument_usage ?? 0}%` : '-';
      },
      icon: 'BarChart3',
      color: 'primary',
      trend: { value: 0, label: '上月' },
    },
    {
      id: 'pass-rate',
      title: '合格率',
      value: () => {
        const stats = window.__limsStats;
        return stats ? `${stats?.pass_rate ?? 0}%` : '-';
      },
      icon: 'CheckCircle',
      color: 'success',
      trend: { value: 0, label: '上月' },
    },
  ];

  const charts: ChartSchema[] = [
    {
      id: 'test-item-distribution',
      title: '检测项目分布',
      type: 'bar',
      data: () => {
        const stats = window.__limsStats;
        if (!stats) return [];
        const distribution = stats.test_items as Array<{ name: string; value: number }> | undefined;
        return distribution ?? [];
      },
      height: 300,
    },
    {
      id: 'task-completion-rate',
      title: '任务完成率',
      type: 'line',
      data: () => {
        const stats = window.__limsStats;
        if (!stats) return [];
        const rate = stats.task_completion as Array<{ name: string; value: number }> | undefined;
        return rate ?? [];
      },
      height: 300,
    },
    {
      id: 'instrument-status',
      title: '仪器状态',
      type: 'pie',
      data: () => {
        const stats = window.__limsStats;
        if (!stats) return [];
        const status = stats.instrument_status as
          Array<{ name: string; value: number }> | undefined;
        return status ?? [];
      },
      height: 300,
    },
  ];

  return {
    title: 'LIMS 仪表盘',
    loader: async () => {
      const api = await import('@/api/lims/dashboard');
      const response = await api.limsDashboardApi.getOverview();
      if (response.success && response.data) {
        window.__limsStats = response.data;
      }
      return { statCards: undefined, charts: undefined, table: undefined };
    },
    statCards,
    charts,
  };
}
