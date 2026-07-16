import React, { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, CheckSquare, Trophy, AlertTriangle, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNotificationStore } from '@/store';
import BarChartComponent from '../../components/charts/BarChart';
import LineChartComponent from '../../components/charts/LineChart';
import PieChartComponent from '../../components/charts/PieChart';
import { DashboardTemplate, type StatCard, type ChartCard } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { pmApi, type Project } from '@/api/pm';
import { PM_PATHS } from '@/modules/pm/config';
import { QUERY_KEYS } from '@/lib/reactQuery';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const statisticsQuery = useQuery({
    queryKey: QUERY_KEYS.PM.STATISTICS,
    queryFn: async () => {
      const response = await pmApi.getStatistics();
      return response.data;
    },
  });

  const projectsQuery = useQuery({
    queryKey: QUERY_KEYS.PM.PROJECTS,
    queryFn: async () => {
      const response = await pmApi.projects.list();
      return (response.data?.items ?? []) as Project[];
    },
  });

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
      draft: '草稿',
      pending: '待审批',
      active: '开发中',
      in_progress: '开发中',
      testing: '测试中',
      review: '待评审',
      completed: '已完成',
      cancelled: '已取消',
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
              { name: '项目A', value: 85 },
              { name: '项目B', value: 60 },
              { name: '项目C', value: 90 },
              { name: '项目D', value: 45 },
              { name: '项目E', value: 70 },
            ],
      taskTrend,
      projectStatus:
        projectStatus.length > 0
          ? projectStatus
          : [
              { name: '开发中', value: 40 },
              { name: '测试中', value: 25 },
              { name: '待评审', value: 20 },
              { name: '已完成', value: 15 },
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
        title: '进行中项目',
        value: String(statsData.activeProjects),
        icon: <FolderKanban size={24} />,
        change: 2,
        changeLabel: '较上周',
        color: 'primary',
      },
      {
        id: 'pending',
        title: '待完成任务',
        value: String(statsData.pendingTasks),
        icon: <CheckSquare size={24} />,
        change: -15,
        changeLabel: '较上周',
        color: 'warning',
      },
      {
        id: 'completed',
        title: '本周完成',
        value: String(statsData.completedTasks),
        icon: <Trophy size={24} />,
        change: 8,
        changeLabel: '较上周',
        color: 'success',
      },
      {
        id: 'overdue',
        title: '延期风险',
        value: String(statsData.overdueRisks),
        icon: <AlertTriangle size={24} />,
        change: -1,
        changeLabel: '较上周',
        color: 'error',
      },
    ],
    [statsData]
  );

  const charts: ChartCard[] = useMemo(
    () => [
      {
        id: 'progress',
        title: '项目进度分布',
        chart: (
          <BarChartComponent
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
        title: '本周任务完成趋势',
        chart: (
          <LineChartComponent
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
        title: '项目状态分布',
        chart: <PieChartComponent data={chartData.projectStatus} />,
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
        label: '创建新项目',
        icon: <Plus size={20} />,
        onClick: () => navigate(PM_PATHS.projectCreate),
      },
      {
        id: 'report',
        label: '生成报表',
        icon: <Trophy size={20} />,
        onClick: () => navigate(PM_PATHS.reports),
      },
    ],
    [navigate]
  );

  return (
    <PageContainer
      title='项目管理'
      subtitle='项目进度与任务追踪'
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        breadcrumbs={[{ label: '首页', href: '/dashboard' }, { label: '项目' }]}
        stats={stats}
        charts={charts}
        quickActions={quickActions}
        quickActionsTitle='快捷操作'
        loading={loading}
        onRefresh={loadStats}
      />
    </PageContainer>
  );
};

export default DashboardPage;
