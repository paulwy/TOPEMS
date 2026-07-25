import type { DashboardSchema, StatCardSchema, ChartSchema } from '@/schema';
import type { HrmDashboardStats } from '@/api/hrm/dashboard';

declare global {
  interface Window {
    __hrmStats?: HrmDashboardStats;
  }
}

export function useHrmDashboardSchema(): DashboardSchema {
  const statCards: StatCardSchema[] = [
    {
      id: 'total-employees',
      title: '在职员工数',
      value: () => {
        const stats = window.__hrmStats;
        return (stats?.total_employees as number)?.toLocaleString() ?? '-';
      },
      icon: 'Users',
      color: 'primary',
      trend: { value: 0, label: '上月' },
    },
    {
      id: 'new-hires',
      title: '新增入职',
      value: () => {
        const stats = window.__hrmStats;
        return (stats?.new_hires as number)?.toLocaleString() ?? '-';
      },
      icon: 'Users',
      color: 'success',
      trend: { value: 0, label: '上月' },
    },
    {
      id: 'on-leave',
      title: '请假中',
      value: () => {
        const stats = window.__hrmStats;
        return (stats?.on_leave as number)?.toLocaleString() ?? '-';
      },
      icon: 'Clock',
      color: 'warning',
      trend: { value: 0, label: '上月' },
    },
    {
      id: 'avg-salary',
      title: '平均薪资',
      value: () => {
        const stats = window.__hrmStats;
        return stats ? `¥${(stats?.avg_salary as number)?.toLocaleString() ?? 0}` : '-';
      },
      icon: 'DollarSign',
      color: 'info',
      trend: { value: 0, label: '上月' },
    },
  ];

  const charts: ChartSchema[] = [
    {
      id: 'department-distribution',
      title: '部门人员分布',
      type: 'bar',
      data: () => {
        const stats = window.__hrmStats;
        if (!stats) return [];
        const distribution = stats.department_distribution as
          Array<{ name: string; value: number }> | undefined;
        return distribution ?? [];
      },
      height: 300,
    },
    {
      id: 'hire-trend',
      title: '入职趋势',
      type: 'line',
      data: () => {
        const stats = window.__hrmStats;
        if (!stats) return [];
        const trend = stats.hire_trend as Array<{ name: string; value: number }> | undefined;
        return trend ?? [];
      },
      height: 300,
    },
    {
      id: 'education-distribution',
      title: '学历分布',
      type: 'pie',
      data: () => {
        const stats = window.__hrmStats;
        if (!stats) return [];
        const distribution = stats.education_distribution as
          Array<{ name: string; value: number }> | undefined;
        return distribution ?? [];
      },
      height: 300,
    },
  ];

  return {
    title: 'HRM 仪表盘',
    loader: async () => {
      const api = await import('@/api/hrm/dashboard');
      const response = await api.hrmDashboardApi.getOverview();
      if (response.success && response.data) {
        window.__hrmStats = response.data;
      }
      return { statCards: undefined, charts: undefined, table: undefined };
    },
    statCards,
    charts,
  };
}
