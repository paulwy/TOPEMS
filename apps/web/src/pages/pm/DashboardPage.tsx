import React, { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, CheckSquare, Trophy, AlertTriangle, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { DashboardTemplate, type StatCard, type ChartCard } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { pmApi, type Project } from '@/api/pm';
import { PM_PATHS } from '@/modules/pm/config';
import {QUERY_KEYS, CACHE_DURATIONS} from '@/lib/reactQuery';
import { LazyChart } from '@/components/charts';
import i18n from '@/i18n';
export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const statisticsQuery = useQuery({
    queryKey: QUERY_KEYS.PM.STATISTICS,
    queryFn: async () => {
      const response = await pmApi.getStatistics();
      return response.data;
    },
  
      staleTime: CACHE_DURATIONS.MEDIUM,});
  const projectsQuery = useQuery({
    queryKey: QUERY_KEYS.PM.PROJECTS,
    queryFn: async () => {
      const response = await pmApi.projects.list();
      return (response.data?.items ?? []) as Project[];
    },
  
      staleTime: CACHE_DURATIONS.MEDIUM,});
  const loading = statisticsQuery.isLoading || projectsQuery.isLoading;
  const statsData = useMemo(() => {
    const data = statisticsQuery.data as unknown as Record<string, unknown>;
    const projects = projectsQuery.data ?? [];
    const activeProjects = data?.active_projects ?? 0;
    const totalProjects = data?.total_projects ?? 0;
    const completedProjects = data?.completed_projects ?? 0;
    const totalBudget = data?.total_budget ?? 0;
    const spentBudget = data?.spent_budget ?? 0;
    const overdueRisks = data?.high_risk_projects ?? 0;
    const pendingTasks = projects.reduce((sum, p) => {
      const total = (p.progress || 0) / 100;
      return sum + Math.round(total * 10);
    }, 0);
    const completedTasks = projects.reduce((sum, p) => {
      const done = (p.progress || 0) / 100;
      return sum + Math.round(done * 10);
    }, 0);
    return {
      activeProjects,
      pendingTasks,
      completedTasks,
      overdueRisks,
      totalProjects,
      completedProjects,
      totalBudget,
      spentBudget,
    };
  }, [statisticsQuery.data, projectsQuery.data]);
  const chartData = useMemo(() => {
    const projects = projectsQuery.data ?? [];
    const projectProgress = projects.slice(0, 5).map((p) => ({
      name: p.name.length > 8 ? `${p.name.slice(0, 8)}...` : p.name,
      value: p.progress || 0,
    }));
    const statusCounts: Record<string, number> = {};
    projects.forEach((p) => {
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
    });
    const statusMap: Record<string, string> = {
      draft: i18n.t('pm.dashboard_page.k0'),
      pending: i18n.t('pm.dashboard_page.k1'),
      active: i18n.t('pm.dashboard_page.k2'),
      in_progress: i18n.t('pm.dashboard_page.k3'),
      testing: i18n.t('pm.dashboard_page.k4'),
      review: i18n.t('pm.dashboard_page.k5'),
      completed: i18n.t('pm.dashboard_page.k6'),
      cancelled: i18n.t('pm.dashboard_page.k7'),
    };
    const projectStatus = Object.entries(statusCounts).map(([status, count]) => ({
      name: statusMap[status] || status,
      value: count,
    }));
    const weeks = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'];
    const taskTrend = weeks.map((name, i) => ({
      name,
      value: Math.floor(Math.random() * 6) + 4 + i,
    }));
    return {
      projectProgress:
        projectProgress.length > 0
          ? projectProgress
          : [
              { name: i18n.t('pm.dashboard_page.a_8'), value: 85 },
              { name: i18n.t('pm.dashboard_page.b_9'), value: 60 },
              { name: i18n.t('pm.dashboard_page.c_10'), value: 90 },
              { name: i18n.t('pm.dashboard_page.d_11'), value: 45 },
              { name: i18n.t('pm.dashboard_page.e_12'), value: 70 },
            ],
      taskTrend,
      projectStatus:
        projectStatus.length > 0
          ? projectStatus
          : [
              { name: i18n.t('pm.dashboard_page.k13'), value: 40 },
              { name: i18n.t('pm.dashboard_page.k14'), value: 25 },
              { name: i18n.t('pm.dashboard_page.k15'), value: 20 },
              { name: i18n.t('pm.dashboard_page.k16'), value: 15 },
            ],
    };
  }, [projectsQuery.data]);
  const loadStats = useCallback(() => {
    statisticsQuery.refetch();
    projectsQuery.refetch();
  }, [statisticsQuery, projectsQuery]);
  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'active',
        title: i18n.t('pm.dashboard_page.k17'),
        value: String(statsData.activeProjects),
        icon: <FolderKanban size={24} />,
        change: 2,
        changeLabel: i18n.t('pm.dashboard_page.k18'),
        color: 'primary',
      },
      {
        id: 'pending',
        title: i18n.t('pm.dashboard_page.k19'),
        value: String(statsData.pendingTasks),
        icon: <CheckSquare size={24} />,
        change: -15,
        changeLabel: i18n.t('pm.dashboard_page.k20'),
        color: 'warning',
      },
      {
        id: 'completed',
        title: i18n.t('pm.dashboard_page.k21'),
        value: String(statsData.completedTasks),
        icon: <Trophy size={24} />,
        change: 8,
        changeLabel: i18n.t('pm.dashboard_page.k22'),
        color: 'success',
      },
      {
        id: 'overdue',
        title: i18n.t('pm.dashboard_page.k23'),
        value: String(statsData.overdueRisks),
        icon: <AlertTriangle size={24} />,
        change: -1,
        changeLabel: i18n.t('pm.dashboard_page.k24'),
        color: 'error',
      },
    ],
    [statsData]
  );
  const charts: ChartCard[] = useMemo(
    () => [
      {
        id: 'progress',
        title: i18n.t('pm.dashboard_page.k25'),
        chart: (
          <LazyChart type='bar'
            data={chartData.projectProgress}
            xKey='name'
            yKey='value'
          />
        ),
        height: 300,
        type: 'bar',
      },
      {
        id: 'trend',
        title: i18n.t('pm.dashboard_page.k26'),
        chart: (
          <LazyChart type='line'
            data={chartData.taskTrend}
            xKey='name'
            yKey='value'
          />
        ),
        height: 300,
        type: 'line',
      },
      {
        id: 'status',
        title: i18n.t('pm.dashboard_page.k27'),
        chart: <LazyChart type='pie' data={chartData.projectStatus} />,
        height: 300,
        type: 'pie',
      },
    ],
    [chartData]
  );
  const quickActions = useMemo(
    () => [
      {
        id: 'create',
        label: i18n.t('pm.dashboard_page.k28'),
        icon: <Plus size={20} />,
        onClick: () => navigate(PM_PATHS.projectCreate),
      },
      {
        id: 'report',
        label: i18n.t('pm.dashboard_page.k29'),
        icon: <Trophy size={20} />,
        onClick: () => navigate(PM_PATHS.reports),
      },
    ],
    [navigate]
  );
  return (
    <PageContainer
      title={i18n.t('pm.dashboard_page.k30')}
      subtitle={i18n.t('pm.dashboard_page.k31')}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        breadcrumbs={[{ label: i18n.t('pm.dashboard_page.k33'), href: '/dashboard' }, { label: i18n.t('pm.dashboard_page.k32') }]}
        stats={stats}
        charts={charts}
        quickActions={quickActions}
        quickActionsTitle={i18n.t('pm.dashboard_page.k34')}
        loading={loading}
        onRefresh={loadStats}
      />
    </PageContainer>
  );
};
export default DashboardPage;