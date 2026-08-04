import { dashboardApi } from '@/api/pm/dashboard';
import type { PmStatistics } from '@/api/pm/types';
import type { DashboardSchema, StatCardSchema, ChartSchema } from '@/schema';

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
      title: '项目总数',
      value: () => {
        const stats = window.__pmStats;
        return stats?.total_projects.toLocaleString() ?? '-';
      },
      icon: 'ClipboardList',
      color: 'primary',
      trend: { value: 0, label: '上月' },
    },
    {
      id: 'active-projects',
      title: '进行中',
      value: () => {
        const stats = window.__pmStats;
        return stats?.active_projects.toLocaleString() ?? '-';
      },
      icon: 'Activity',
      color: 'info',
      trend: { value: 0, label: '上月' },
    },
    {
      id: 'completed-projects',
      title: '已完成',
      value: () => {
        const stats = window.__pmStats;
        return stats?.completed_projects.toLocaleString() ?? '-';
      },
      icon: 'CheckCircle',
      color: 'success',
      trend: { value: 0, label: '上月' },
    },
    {
      id: 'delayed-projects',
      title: '逾期',
      value: () => {
        const stats = window.__pmStats;
        return stats?.delayed_projects.toLocaleString() ?? '-';
      },
      icon: 'AlertCircle',
      color: 'error',
      trend: { value: 0, label: '上月' },
    },
  ];

  const charts: ChartSchema[] = [
    {
      id: 'project-status-distribution',
      title: '项目状态分布',
      type: 'bar',
      data: () => {
        const stats = window.__pmStats;
        if (!stats) return [];
        return [
          { name: '草稿', value: stats.draft_projects },
          { name: '待审批', value: stats.pending_projects },
          { name: '进行中', value: stats.active_projects },
          { name: '已完成', value: stats.completed_projects },
          { name: '已取消', value: stats.cancelled_projects },
        ];
      },
      height: 300,
    },
    {
      id: 'monthly-completion-rate',
      title: '月度完成率',
      type: 'line',
      data: () => {
        const stats = window.__pmStats;
        if (!stats) return [];
        return [
          { name: '平均进度', value: stats.average_progress },
          { name: '预算使用率', value: stats.budget_usage_rate },
        ];
      },
      height: 300,
    },
  ];

  return {
    title: 'PM 仪表盘',
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
