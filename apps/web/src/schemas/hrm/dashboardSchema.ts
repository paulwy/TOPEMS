import type { DashboardSchema, StatCardSchema, ChartSchema } from '@/schema';
import type { HrmDashboardStats } from '@/api/hrm/dashboard';
import i18n from '@/i18n';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __hrmStats?: HrmDashboardStats;
  }
}

export function useHrmDashboardSchema(): DashboardSchema {
  const statCards: StatCardSchema[] = [
    {
      id: 'total-employees',
      title: i18n.t('hrm.dashboard_schema.k0'),
      value: () => {
        const stats = window.__hrmStats;
        return (stats?.total_employees as number)?.toLocaleString() ?? '-';
      },
      icon: 'Users',
      color: 'primary',
      trend: { value: 0, label: i18n.t('hrm.dashboard_schema.k1') },
    },
    {
      id: 'new-hires',
      title: i18n.t('hrm.dashboard_schema.k2'),
      value: () => {
        const stats = window.__hrmStats;
        return (stats?.new_hires as number)?.toLocaleString() ?? '-';
      },
      icon: 'Users',
      color: 'success',
      trend: { value: 0, label: i18n.t('hrm.dashboard_schema.k3') },
    },
    {
      id: 'on-leave',
      title: i18n.t('hrm.dashboard_schema.k4'),
      value: () => {
        const stats = window.__hrmStats;
        return (stats?.on_leave as number)?.toLocaleString() ?? '-';
      },
      icon: 'Clock',
      color: 'warning',
      trend: { value: 0, label: i18n.t('hrm.dashboard_schema.k5') },
    },
    {
      id: 'avg-salary',
      title: i18n.t('hrm.dashboard_schema.k6'),
      value: () => {
        const stats = window.__hrmStats;
        return stats ? `¥${(stats?.avg_salary as number)?.toLocaleString() ?? 0}` : '-';
      },
      icon: 'DollarSign',
      color: 'info',
      trend: { value: 0, label: i18n.t('hrm.dashboard_schema.k7') },
    },
  ];

  const charts: ChartSchema[] = [
    {
      id: 'department-distribution',
      title: i18n.t('hrm.dashboard_schema.k8'),
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
      title: i18n.t('hrm.dashboard_schema.k9'),
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
      title: i18n.t('hrm.dashboard_schema.k10'),
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
    title: i18n.t('shared.dashboard_schema.hrm_0'),
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
