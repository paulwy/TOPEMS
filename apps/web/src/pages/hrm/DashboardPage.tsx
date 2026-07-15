import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, GraduationCap, Award, ArrowRight } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import BarChartComponent from '../../components/charts/BarChart';
import LineChartComponent from '../../components/charts/LineChart';
import PieChartComponent from '../../components/charts/PieChart';
import {
  DashboardTemplate,
  type StatCard,
  type ChartCard,
  type QuickAction,
} from '@/components/templates';
import { PageContainer } from '@/components/common/PageContainerV2';
import {
  employeeApi,
  attendanceApi,
  trainingCourseApi,
  performanceReviewApi,
  departmentApi,
  type Employee,
  type Department,
} from '@/api/hrm';
import { HRM_PATHS } from '@/modules/hrm/config';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading] = useState(false);

  const employeesQuery = useQuery({
    queryKey: QUERY_KEYS.HRM.EMPLOYEES,
    queryFn: async () => {
      const res = await employeeApi.list();
      if (res.success && res.data) {
        return {
          total: res.data.total ?? 0,
          items: (res.data.items as Employee[]) || [],
        };
      }
      return { total: 0, items: [] as Employee[] };
    },
  });

  const departmentsQuery = useQuery({
    queryKey: QUERY_KEYS.HRM.DEPARTMENTS,
    queryFn: async () => {
      const res = await departmentApi.list();
      if (res.success && res.data) {
        return (res.data.items as Department[]) || [];
      }
      return [] as Department[];
    },
  });

  const coursesQuery = useQuery({
    queryKey: [...QUERY_KEYS.HRM.TRAINING, 'courses'],
    queryFn: async () => {
      const res = await trainingCourseApi.list();
      if (res.success && res.data) {
        return res.data.total ?? 0;
      }
      return 0;
    },
  });

  const reviewsQuery = useQuery({
    queryKey: QUERY_KEYS.HRM.PERFORMANCE,
    queryFn: async () => {
      const res = await performanceReviewApi.list();
      if (res.success && res.data) {
        return res.data.total ?? 0;
      }
      return 0;
    },
  });

  const attendanceQuery = useQuery({
    queryKey: QUERY_KEYS.HRM.ATTENDANCE,
    queryFn: async () => {
      const res = await attendanceApi.list();
      if (res.success && res.data) {
        return (res.data.items as any[]) || [];
      }
      return [] as any[];
    },
  });

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return '上午好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  const statsData = useMemo(() => {
    const empData = employeesQuery.data;
    const totalEmployees = empData?.total ?? 0;
    const newHires = empData?.items
      ? empData.items.filter((e) => {
          const hireDate = new Date(e.hire_date || '');
          const now = new Date();
          return (
            hireDate.getMonth() === now.getMonth() && hireDate.getFullYear() === now.getFullYear()
          );
        }).length
      : 0;
    const trainingCourses = coursesQuery.data ?? 0;
    const performanceReviews = reviewsQuery.data ?? 0;
    const attItems = attendanceQuery.data ?? [];
    const onTimeRate =
      attItems.length > 0
        ? (attItems.filter((a) => a.status === 'normal').length / attItems.length) * 100
        : 95;

    return {
      totalEmployees,
      newHires,
      trainingCourses,
      performanceReviews,
      onTimeRate: Math.round(onTimeRate),
    };
  }, [employeesQuery.data, coursesQuery.data, reviewsQuery.data, attendanceQuery.data]);

  const chartData = useMemo(() => {
    const departments = departmentsQuery.data ?? [];
    const employees = employeesQuery.data?.items ?? [];

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
      name:
        name === 'active'
          ? '正式'
          : name === 'probation'
            ? '试用期'
            : name === 'intern'
              ? '实习'
              : name,
      value,
    }));

    const months = ['1月', '2月', '3月', '4月', '5月', '6月'];
    const monthlyTrend = months.map((name, i) => ({
      name,
      value: Math.floor(Math.random() * 10) + 2 + i,
    }));

    return {
      departmentDistribution:
        departmentDistribution.length > 0
          ? departmentDistribution
          : [
              { name: '技术部', value: 85 },
              { name: '产品部', value: 45 },
              { name: '市场部', value: 52 },
              { name: '财务部', value: 28 },
              { name: '人事部', value: 18 },
              { name: '运营部', value: 28 },
            ],
      monthlyTrend,
      statusDistribution:
        statusDistribution.length > 0
          ? statusDistribution
          : [
              { name: '试用期', value: 15 },
              { name: '正式', value: 75 },
              { name: '实习', value: 10 },
            ],
    };
  }, [departmentsQuery.data, employeesQuery.data]);

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
        onClick: () => navigate(HRM_PATHS.employeeCreate),
      },
      {
        id: 'recruitment',
        label: '招聘管理',
        icon: <ArrowRight size={18} />,
        onClick: () => navigate(HRM_PATHS.recruitment),
      },
      {
        id: 'training-plan',
        label: '培训计划',
        icon: <ArrowRight size={18} />,
        onClick: () => navigate(HRM_PATHS.training),
      },
      {
        id: 'performance-review',
        label: '绩效考核',
        icon: <ArrowRight size={18} />,
        onClick: () => navigate(HRM_PATHS.performance),
      },
    ],
    [navigate]
  );

  return (
    <PageContainer
      title='人力资源仪表盘'
      subtitle={`${getGreeting()}，员工管理与绩效考核`}
      padding={false}
      maxWidth={false}
      autoTitle
      autoBreadcrumbs
    >
      <DashboardTemplate
        title=''
        stats={stats}
        charts={charts}
        quickActions={quickActions}
        quickActionsTitle='快捷操作'
        loading={loading}
        onRefresh={() => {
          employeesQuery.refetch();
          departmentsQuery.refetch();
          coursesQuery.refetch();
          reviewsQuery.refetch();
          attendanceQuery.refetch();
        }}
      />
    </PageContainer>
  );
};

export default DashboardPage;
