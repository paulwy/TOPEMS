import React, { useEffect, useState } from 'react';
import { apiLogger } from '@/utils/logger';
import {
  FolderKanban,
  TrendingUp,
  Users,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';
import { apiClient } from '@/api/client';

interface ProjectSummary {
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  delayed_projects: number;
  total_budget: number;
  total_actual_cost: number;
  avg_progress: number;
  total_members: number;
}

interface ProjectTypeStats {
  project_type: string;
  count: number;
  total_budget: number;
  avg_progress: number;
}

interface TrendData {
  date: string;
  project_count: number;
  completed_count: number;
  avg_progress: number;
  total_budget: number;
  total_cost: number;
}

interface PerformanceMetrics {
  on_time_delivery_rate: number;
  budget_adherence_rate: number;
  avg_completion_time_days: number;
  resource_utilization_rate: number;
}

interface Project {
  id: string;
  name: string;
  code: string;
  project_type: string;
  status: string;
  progress: number;
  budget?: number;
  actual_cost?: number;
  start_date?: string;
  end_date?: string;
}

const ProjectDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [typeStats, setTypeStats] = useState<ProjectTypeStats[]>([]);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [summaryRes, typeRes, trendsRes, perfRes, projectsRes] = await Promise.all([
        apiClient.rs.get('/api/rs/reports/projects/summary'),
        apiClient.rs.get('/api/rs/reports/projects/types'),
        apiClient.rs.get('/api/rs/reports/projects/trends'),
        apiClient.rs.get('/api/rs/reports/projects/performance'),
        apiClient.rs.get('/api/rs/projects'),
      ]);

      if (summaryRes.success) setSummary(summaryRes.data);
      if (typeRes.success) setTypeStats(typeRes.data);
      if (trendsRes.success) setTrends(trendsRes.data);
      if (perfRes.success) setPerformance(perfRes.data);
      if (projectsRes.success) {
        setProjects(projectsRes.data || []);
      }
    } catch (error: unknown) {
      apiLogger.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const activeProjects = projects.filter((p: Project) => p.status === 'active').slice(0, 5);

  const statCards = summary
    ? [
        {
          id: 'total-projects',
          title: '总项目数',
          value: summary.total_projects,
          icon: <FolderKanban size={24} />,
          color: 'primary',
          description: `进行中 ${summary.active_projects} | 已完成 ${summary.completed_projects}`,
        },
        {
          id: 'avg-progress',
          title: '平均进度',
          value: `${summary.avg_progress.toFixed(1)}%`,
          icon: <TrendingUp size={24} />,
          color: 'success',
        },
        {
          id: 'total-budget',
          title: '总预算',
          value: formatCurrency(summary.total_budget),
          icon: <DollarSign size={24} />,
          color: 'warning',
          description: `实际支出: ${formatCurrency(summary.total_actual_cost)}`,
        },
        {
          id: 'total-members',
          title: '团队成员',
          value: summary.total_members,
          icon: <Users size={24} />,
          color: 'info',
          description: `利用率: ${performance?.resource_utilization_rate?.toFixed(1) || 0}%`,
        },
        {
          id: 'delayed-projects',
          title: '逾期项目',
          value: summary.delayed_projects,
          icon: <AlertTriangle size={24} />,
          color: 'error',
        },
        {
          id: 'on-time-delivery',
          title: '准时交付率',
          value: `${performance?.on_time_delivery_rate?.toFixed(1) || 0}%`,
          icon: <CheckCircle size={24} />,
          color: 'success',
        },
        {
          id: 'budget-adherence',
          title: '预算遵守率',
          value: `${performance?.budget_adherence_rate?.toFixed(1) || 0}%`,
          icon: <DollarSign size={24} />,
          color: 'primary',
        },
        {
          id: 'avg-completion-time',
          title: '平均完成周期',
          value: `${performance?.avg_completion_time_days || 0}天`,
          icon: <Clock size={24} />,
          color: 'warning',
        },
      ]
    : [];

  const charts = [
    {
      id: 'project-type-distribution',
      title: '项目类型分布',
      type: 'bar',
      dataKey: 'count',
      nameKey: 'project_type',
      data: typeStats.map((stat) => ({
        name: stat.project_type,
        value: stat.count,
      })),
      colors: ['primary.main', 'success.main', 'warning.main', 'error.main', 'info.main'],
    },
    {
      id: 'project-trend',
      title: '项目趋势',
      type: 'line',
      dataKey: 'project_count',
      nameKey: 'date',
      data: trends.slice(0, 5).map((trend) => ({
        name: trend.date,
        value: trend.project_count,
      })),
      colors: ['success.main'],
    },
  ];

  const tables = [
    {
      id: 'active-projects',
      title: '进行中项目',
      columns: [
        { id: 'name', label: '项目名称' },
        { id: 'project_type', label: '类型' },
        { id: 'status', label: '状态' },
        { id: 'progress', label: '进度' },
        { id: 'budget', label: '预算' },
        { id: 'end_date', label: '结束日期' },
      ],
      data: activeProjects.map((project) => ({
        name: project.name,
        project_type: project.project_type,
        status: project.status,
        progress: `${project.progress}%`,
        budget: project.budget ? formatCurrency(project.budget) : '-',
        end_date: project.end_date ? new Date(project.end_date).toLocaleDateString() : '-',
      })),
    },
  ];

  const timeRangeOptions = [
    { label: '本周', value: 'week' },
    { label: '本月', value: 'month' },
    { label: '本季度', value: 'quarter' },
    { label: '本年', value: 'year' },
  ];

  const [timeRange, setTimeRange] = useState('month');

  return (
    <StatsPageTemplate
      title='项目管理驾驶舱'
      subtitle='实时监控项目状态、进度和绩效'
      statCards={statCards}
      statColumns={4}
      charts={charts}
      tables={tables}
      loading={loading}
      timeRangeOptions={timeRangeOptions}
      timeRange={timeRange}
      onTimeRangeChange={setTimeRange}
      onRefresh={loadDashboardData}
      showTimeRange={true}
      showRefresh={true}
      showExport={true}
      showSearch={false}
      chartSectionTitle='数据图表'
      tableSectionTitle='项目列表'
      customToolbar={
        <button
          onClick={() => navigate('/rs')}
          style={{
            fontSize: '0.875rem',
            color: '#1976d2',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            marginLeft: 'auto',
            display: 'block',
          }}
        >
          查看全部 →
        </button>
      }
    />
  );
};

export default ProjectDashboardPage;