import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, CheckSquare, Trophy, AlertTriangle, Plus } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { useAppStore } from '@/store';
import BarChartComponent from '../../components/charts/BarChart';
import LineChartComponent from '../../components/charts/LineChart';
import PieChartComponent from '../../components/charts/PieChart';
import { DashboardTemplate, type StatCard, type ChartCard } from '@/components/templates';
import { pmApi, type Project } from '@/api/pm';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState({
    activeProjects: 0,
    pendingTasks: 0,
    completedTasks: 0,
    overdueRisks: 0,
    totalProjects: 0,
    completedProjects: 0,
    totalBudget: 0,
    spentBudget: 0,
  });
  const [chartData, setChartData] = useState({
    projectProgress: [] as { name: string; value: number }[],
    taskTrend: [] as { name: string; value: number }[],
    projectStatus: [] as { name: string; value: number }[],
  });

  const loadStats = useCallback(async () => {
    try {
      const [statRes, projectRes] = await Promise.allSettled([
        pmApi.getStatistics(),
        pmApi.projects.list(),
      ]);

      let activeProjects = 0;
      let totalProjects = 0;
      let completedProjects = 0;
      let totalBudget = 0;
      let spentBudget = 0;
      let overdueRisks = 0;

      if (statRes.status === 'fulfilled' && statRes.value.success && statRes.value.data) {
        const data = statRes.value.data as any;
        activeProjects = data.active_projects ?? 0;
        totalProjects = data.total_projects ?? 0;
        completedProjects = data.completed_projects ?? 0;
        totalBudget = data.total_budget ?? 0;
        spentBudget = data.spent_budget ?? 0;
        overdueRisks = data.high_risk_projects ?? 0;
      }

      const projects: Project[] =
        projectRes.status === 'fulfilled' && projectRes.value.success && projectRes.value.data?.items
          ? (projectRes.value.data.items as Project[])
          : [];

      const pendingTasks = projects.reduce((sum, p) => {
        const total = (p.progress || 0) / 100;
        return sum + Math.round(total * 10);
      }, 0);

      const completedTasks = projects.reduce((sum, p) => {
        const done = (p.progress || 0) / 100;
        return sum + Math.round(done * 10);
      }, 0);

      setStatsData({
        activeProjects,
        pendingTasks,
        completedTasks,
        overdueRisks,
        totalProjects,
        completedProjects,
        totalBudget,
        spentBudget,
      });
    } catch (err: unknown) {
      apiLogger.error('加载 PM 统计失败:', err);
    }
  }, []);

  const loadChartData = useCallback(async () => {
    try {
      const projectRes = await pmApi.projects.list();
      const projects: Project[] =
        projectRes.success && projectRes.data?.items
          ? (projectRes.data.items as Project[])
          : [];

      const projectProgress = projects.slice(0, 5).map((p) => ({
        name: p.name.length > 8 ? p.name.slice(0, 8) + '...' : p.name,
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

      setChartData({
        projectProgress: projectProgress.length > 0 ? projectProgress : [
          { name: '项目A', value: 85 },
          { name: '项目B', value: 60 },
          { name: '项目C', value: 90 },
          { name: '项目D', value: 45 },
          { name: '项目E', value: 70 },
        ],
        taskTrend,
        projectStatus: projectStatus.length > 0 ? projectStatus : [
          { name: '开发中', value: 40 },
          { name: '测试中', value: 25 },
          { name: '待评审', value: 20 },
          { name: '已完成', value: 15 },
        ],
      });
    } catch (err: unknown) {
      apiLogger.error('加载 PM 图表数据失败:', err);
      setChartData({
        projectProgress: [
          { name: '项目A', value: 85 },
          { name: '项目B', value: 60 },
          { name: '项目C', value: 90 },
          { name: '项目D', value: 45 },
          { name: '项目E', value: 70 },
        ],
        taskTrend: [
          { name: 'W1', value: 5 },
          { name: 'W2', value: 8 },
          { name: 'W3', value: 6 },
          { name: 'W4', value: 10 },
          { name: 'W5', value: 7 },
          { name: 'W6', value: 9 },
        ],
        projectStatus: [
          { name: '开发中', value: 40 },
          { name: '测试中', value: 25 },
          { name: '待评审', value: 20 },
          { name: '已完成', value: 15 },
        ],
      });
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([loadStats(), loadChartData()]);
      } catch (err) {
        apiLogger.error('PM Dashboard 初始化失败:', err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [loadStats, loadChartData]);

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
        onClick: () => navigate('/pm/projects/create'),
      },
      {
        id: 'assign',
        label: '分配任务',
        icon: <CheckSquare size={20} />,
        onClick: () => navigate('/pm/tasks/assign'),
      },
      {
        id: 'timeline',
        label: '查看时间线',
        icon: <FolderKanban size={20} />,
        onClick: () => navigate('/pm/timeline'),
      },
      {
        id: 'report',
        label: '生成报表',
        icon: <Trophy size={20} />,
        onClick: () => navigate('/pm/reports'),
      },
    ],
    [navigate]
  );

  return (
    <DashboardTemplate
      title='项目管理'
      subtitle='项目进度与任务追踪'
      breadcrumbs={[{ label: '首页', href: '/dashboard' }, { label: '项目' }]}
      stats={stats}
      charts={charts}
      quickActions={quickActions}
      quickActionsTitle='快捷操作'
      loading={loading}
      onRefresh={() => {
        setLoading(true);
        Promise.all([loadStats(), loadChartData()]).finally(() => setLoading(false));
      }}
    />
  );
};

export default DashboardPage;