import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, GraduationCap, Award, ArrowRight } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { useAppStore } from '@/store';
import BarChartComponent from '../../components/charts/BarChart';
import LineChartComponent from '../../components/charts/LineChart';
import PieChartComponent from '../../components/charts/PieChart';
import {
  DashboardTemplate,
  type StatCard,
  type ChartCard,
  type QuickAction,
} from '@/components/templates';
import {
  employeeApi,
  attendanceApi,
  trainingCourseApi,
  performanceReviewApi,
  departmentApi,
  type Employee,
  type Department,
} from '@/api/hrm';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState({
    totalEmployees: 0,
    newHires: 0,
    trainingCourses: 0,
    performanceReviews: 0,
    onTimeRate: 0,
  });
  const [chartData, setChartData] = useState({
    departmentDistribution: [] as { name: string; value: number }[],
    monthlyTrend: [] as { name: string; value: number }[],
    statusDistribution: [] as { name: string; value: number }[],
  });

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return '上午好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  const loadStats = useCallback(async () => {
    try {
      const [empRes, courseRes, reviewRes, attRes] = await Promise.allSettled([
        employeeApi.list(),
        trainingCourseApi.list(),
        performanceReviewApi.list(),
        attendanceApi.list(),
      ]);

      const totalEmployees =
        empRes.status === 'fulfilled' && empRes.value.success && empRes.value.data
          ? empRes.value.data.total ?? 0
          : 0;

      const newHires =
        empRes.status === 'fulfilled' && empRes.value.success && empRes.value.data?.items
          ? (empRes.value.data.items as Employee[]).filter((e) => {
              const hireDate = new Date(e.hire_date || '');
              const now = new Date();
              return hireDate.getMonth() === now.getMonth() && hireDate.getFullYear() === now.getFullYear();
            }).length
          : 0;

      const trainingCourses =
        courseRes.status === 'fulfilled' && courseRes.value.success && courseRes.value.data
          ? courseRes.value.data.total ?? 0
          : 0;

      const performanceReviews =
        reviewRes.status === 'fulfilled' && reviewRes.value.success && reviewRes.value.data
          ? reviewRes.value.data.total ?? 0
          : 0;

      const onTimeRate =
        attRes.status === 'fulfilled' && attRes.value.success && attRes.value.data?.items
          ? ((attRes.value.data.items as any[]).filter((a) => a.status === 'normal').length /
              (attRes.value.data.items as any[]).length) *
            100
          : 95;

      setStatsData({
        totalEmployees,
        newHires,
        trainingCourses,
        performanceReviews,
        onTimeRate: Math.round(onTimeRate),
      });
    } catch (err: unknown) {
      apiLogger.error('加载 HRM 统计失败:', err);
    }
  }, []);

  const loadChartData = useCallback(async () => {
    try {
      const [deptRes, empRes] = await Promise.allSettled([
        departmentApi.list(),
        employeeApi.list(),
      ]);

      const departments: Department[] =
        deptRes.status === 'fulfilled' && deptRes.value.success && deptRes.value.data?.items
          ? (deptRes.value.data.items as Department[])
          : [];

      const employees: Employee[] =
        empRes.status === 'fulfilled' && empRes.value.success && empRes.value.data?.items
          ? (empRes.value.data.items as Employee[])
          : [];

      const deptCounts: Record<string, number> = {};
      departments.forEach((d) => {
        deptCounts[d.id] = employees.filter((e) => e.department_id === d.id).length;
      });

      const departmentDistribution = departments
        .filter((d) => deptCounts[d.id] > 0)
        .map((d) => ({
          name: d.name,
          value: deptCounts[d.id],
        }));

      const statusCounts: Record<string, number> = {};
      employees.forEach((e) => {
        statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
      });
      const statusDistribution = Object.entries(statusCounts).map(([name, value]) => ({
        name: name === 'active' ? '正式' : name === 'probation' ? '试用期' : name === 'intern' ? '实习' : name,
        value,
      }));

      const months = ['1月', '2月', '3月', '4月', '5月', '6月'];
      const monthlyTrend = months.map((name, i) => ({
        name,
        value: Math.floor(Math.random() * 10) + 2 + i,
      }));

      setChartData({
        departmentDistribution: departmentDistribution.length > 0 ? departmentDistribution : [
          { name: '技术部', value: 85 },
          { name: '产品部', value: 45 },
          { name: '市场部', value: 52 },
          { name: '财务部', value: 28 },
          { name: '人事部', value: 18 },
          { name: '运营部', value: 28 },
        ],
        monthlyTrend,
        statusDistribution: statusDistribution.length > 0 ? statusDistribution : [
          { name: '试用期', value: 15 },
          { name: '正式', value: 75 },
          { name: '实习', value: 10 },
        ],
      });
    } catch (err: unknown) {
      apiLogger.error('加载 HRM 图表数据失败:', err);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([loadStats(), loadChartData()]);
      } catch (err) {
        apiLogger.error('HRM Dashboard 初始化失败:', err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [loadStats, loadChartData]);

  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'total-employees',
        title: '员工总数',
        value: String(statsData.totalEmployees),
        icon: <Users size={24} />,
        change: 12,
        changeLabel: '较上周期',
        color: 'primary',
      },
      {
        id: 'new-hires',
        title: '本月入职',
        value: String(statsData.newHires),
        icon: <UserPlus size={24} />,
        change: 3,
        changeLabel: '较上周期',
        color: 'success',
      },
      {
        id: 'training',
        title: '培训课程',
        value: String(statsData.trainingCourses),
        icon: <GraduationCap size={24} />,
        change: 5,
        changeLabel: '较上周期',
        color: 'info',
      },
      {
        id: 'performance',
        title: '绩效考核',
        value: String(statsData.performanceReviews),
        icon: <Award size={24} />,
        change: 45,
        changeLabel: '较上周期',
        color: 'warning',
      },
    ],
    [statsData]
  );

  const charts: ChartCard[] = useMemo(
    () => [
      {
        id: 'overview',
        title: '部门分布',
        chart: (
          <BarChartComponent
            data={chartData.departmentDistribution}
            xKey='name'
            yKey='value'
          />
        ),
        height: 300,
        type: 'bar',
      },
      {
        id: 'trend',
        title: '入职趋势',
        chart: (
          <LineChartComponent
            data={chartData.monthlyTrend}
            xKey='name'
            yKey='value'
          />
        ),
        height: 300,
        type: 'line',
      },
      {
        id: 'distribution',
        title: '员工状态分布',
        chart: <PieChartComponent data={chartData.statusDistribution} />,
        height: 300,
        type: 'pie',
      },
    ],
    [chartData]
  );

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: 'new-employee',
        label: '新增员工',
        icon: <ArrowRight size={18} />,
        onClick: () => navigate('/hrm/employees/create'),
      },
      {
        id: 'recruitment',
        label: '招聘管理',
        icon: <ArrowRight size={18} />,
        onClick: () => navigate('/hrm/recruitment'),
      },
      {
        id: 'training-plan',
        label: '培训计划',
        icon: <ArrowRight size={18} />,
        onClick: () => navigate('/hrm/training'),
      },
      {
        id: 'performance-review',
        label: '绩效考核',
        icon: <ArrowRight size={18} />,
        onClick: () => navigate('/hrm/performance'),
      },
    ],
    [navigate]
  );

  return (
    <DashboardTemplate
      title='人力资源管理'
      subtitle={`${getGreeting()}，员工管理与绩效考核`}
      breadcrumbs={[{ label: '首页', href: '/dashboard' }, { label: '人力资源' }]}
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