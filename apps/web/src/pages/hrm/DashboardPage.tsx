import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, GraduationCap, Award, ArrowRight } from 'lucide-react';
import {
  DashboardTemplate,
  type StatCard,
  type ChartCard,
  type QuickAction,
} from '@/components/templates';
import { PageContainer } from '@/components/common';
import {
  employeeApi,
  attendanceApi,
  trainingCourseApi,
  performanceReviewApi,
  departmentApi,
  type Employee,
  type Department,
  type AttendanceRecord,
} from '@/api/hrm';
import { HRM_PATHS } from '@/modules/hrm/config';

import { useTranslation } from 'react-i18next';
import { LazyChart } from '@/components/charts';
import i18n from '@/i18n';

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
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

    staleTime: CACHE_DURATIONS.MEDIUM,
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

    staleTime: CACHE_DURATIONS.MEDIUM,
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

    staleTime: CACHE_DURATIONS.MEDIUM,
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

    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const attendanceQuery = useQuery({
    queryKey: QUERY_KEYS.HRM.ATTENDANCE,
    queryFn: async () => {
      const res = await attendanceApi.list();
      if (res.success && res.data) {
        return (res.data.items as AttendanceRecord[]) || [];
      }
      return [] as AttendanceRecord[];
    },

    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return t('hrm.dashboard_page.text_cad057');
    if (hour < 18) return t('hrm.dashboard_page.text_8c9bdf');
    return t('hrm.dashboard_page.text_6ab1f1');
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
          ? t('hrm.dashboard_page.text_3c07bb')
          : name === 'probation'
            ? t('hrm.dashboard_page.text_9a3256')
            : name === 'intern'
              ? t('hrm.dashboard_page.text_727190')
              : name,
      value,
    }));

    const months = [
      t('hrm.dashboard_page.text_fccc2b'),
      t('hrm.dashboard_page.text_c1d13f'),
      t('hrm.dashboard_page.text_c4767b'),
      t('hrm.dashboard_page.text_3eaf4b'),
      t('hrm.dashboard_page.text_0545f1'),
      t('hrm.dashboard_page.text_f2422a'),
    ];
    const monthlyTrend = months.map((name, i) => ({
      name,
      value: Math.floor(Math.random() * 10) + 2 + i,
    }));

    return {
      departmentDistribution:
        departmentDistribution.length > 0
          ? departmentDistribution
          : [
              { name: t('hrm.dashboard_page.text_c6a757'), value: 85 },
              { name: t('hrm.dashboard_page.product'), value: 45 },
              { name: t('hrm.dashboard_page.text_73b111'), value: 52 },
              { name: t('hrm.dashboard_page.text_b159e5'), value: 28 },
              { name: t('hrm.dashboard_page.text_f802d1'), value: 18 },
              { name: t('hrm.dashboard_page.text_b890b3'), value: 28 },
            ],
      monthlyTrend,
      statusDistribution:
        statusDistribution.length > 0
          ? statusDistribution
          : [
              { name: t('hrm.dashboard_page.text_9a3256'), value: 15 },
              { name: t('hrm.dashboard_page.text_3c07bb'), value: 75 },
              { name: t('hrm.dashboard_page.text_727190'), value: 10 },
            ],
    };
  }, [departmentsQuery.data, employeesQuery.data]);

  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'total-employees',
        title: i18n.t('hrm.dashboard_page.text_97e957'),
        value: String(statsData.totalEmployees),
        icon: <Users size={24} />,
        change: 12,
        changeLabel: i18n.t('hrm.dashboard_page.last_week'),
        color: 'primary',
      },
      {
        id: 'new-hires',
        title: i18n.t('hrm.dashboard_page.this_month'),
        value: String(statsData.newHires),
        icon: <UserPlus size={24} />,
        change: 3,
        changeLabel: i18n.t('hrm.dashboard_page.last_week'),
        color: 'success',
      },
      {
        id: 'training',
        title: i18n.t('hrm.dashboard_page.text_07cb67'),
        value: String(statsData.trainingCourses),
        icon: <GraduationCap size={24} />,
        change: 5,
        changeLabel: i18n.t('hrm.dashboard_page.last_week'),
        color: 'info',
      },
      {
        id: 'performance',
        title: i18n.t('hrm.dashboard_page.text_5ad4ab'),
        value: String(statsData.performanceReviews),
        icon: <Award size={24} />,
        change: 45,
        changeLabel: i18n.t('hrm.dashboard_page.last_week'),
        color: 'warning',
      },
    ],
    [statsData]
  );

  const charts: ChartCard[] = useMemo(
    () => [
      {
        id: 'overview',
        title: i18n.t('hrm.dashboard_page.text_699d70'),
        chart: (
          <LazyChart
            type='bar'
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
        title: i18n.t('hrm.dashboard_page.text_b3b5dc'),
        chart: (
          <LazyChart
            type='line'
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
        title: i18n.t('hrm.dashboard_page.status'),
        chart: (
          <LazyChart
            type='pie'
            data={chartData.statusDistribution}
          />
        ),
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
        label: i18n.t('hrm.dashboard_page.add'),
        icon: <ArrowRight size={18} />,
        onClick: () => navigate(HRM_PATHS.employeeCreate),
      },
      {
        id: 'recruitment',
        label: i18n.t('hrm.dashboard_page.text_b4f20d'),
        icon: <ArrowRight size={18} />,
        onClick: () => navigate(HRM_PATHS.recruitment),
      },
      {
        id: 'training-plan',
        label: i18n.t('hrm.dashboard_page.plan'),
        icon: <ArrowRight size={18} />,
        onClick: () => navigate(HRM_PATHS.training),
      },
      {
        id: 'performance-review',
        label: i18n.t('hrm.dashboard_page.text_5ad4ab'),
        icon: <ArrowRight size={18} />,
        onClick: () => navigate(HRM_PATHS.performance),
      },
    ],
    [navigate]
  );

  return (
    <PageContainer
      title={t('hrm.dashboard_page.text_695be5')}
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
        quickActionsTitle={t('hrm.dashboard_page.action')}
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
