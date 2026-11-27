/**
 * HRM 概览（人事工作台）
 *
 * 数据口径全部来自真实列表接口的分页 total 与员工明细：
 *  - /hrm/employees             员工数、部门人数分布、入职趋势、最近入职
 *  - /hrm/departments           部门数
 *  - /hrm/leaves?status=pending 待审批请假
 *  - /hrm/attendance            考勤记录数
 *  - /hrm/performance-reviews   绩效评审数
 *  - /hrm/training-records      培训记录数
 * 原先写死的 256/8/15/6/85.3/78%、部门分布（85/42/35…）、月度入职曲线、
 * 绩效分布饼图与 5 条示例动态已删除。
 */
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Clock,
  Calendar,
  Award,
  GraduationCap,
  DollarSign,
  Briefcase,
} from 'lucide-react';
import { DashboardTemplate } from '@/components/templates';
import type { StatCard, ChartCard, QuickAction, RecentItem } from '@/components/templates';
import { HRM_PATHS } from '@/module-configs/hrm/config';

import { useTranslation } from 'react-i18next';
import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';
import { useTheme } from '@mui/material';
import {
  employeeApi,
  departmentApi,
  leaveApi,
  attendanceApi,
  performanceReviewApi,
  trainingRecordApi,
} from '@/api/hrm';
import type { Employee } from '@/api/hrm';

const listTotal = async (fn: () => Promise<{ data?: unknown }>): Promise<number> => {
  const res = await fn();
  return Number((res?.data as { total?: number } | null)?.total ?? 0);
};

const HrmOverviewPage: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const employeesQuery = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.HRM_DASHBOARD_BASE, 'employees'],
    queryFn: async () => {
      const res = await employeeApi.list({ page: 1, page_size: 500 });
      const data = res?.data as { items?: Employee[]; total?: number } | undefined;
      return { items: (data?.items ?? []) as Employee[], total: Number(data?.total ?? 0) };
    },
    staleTime: 60 * 1000,
  });

  const departmentsQuery = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.HRM_DASHBOARD_BASE, 'departments'],
    queryFn: () => listTotal(() => departmentApi.list({ page: 1, page_size: 1 })),
    staleTime: 5 * 60 * 1000,
  });

  const pendingLeaveQuery = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.HRM_DASHBOARD_BASE, 'leaves-pending'],
    queryFn: () => listTotal(() => leaveApi.list({ page: 1, page_size: 1, status: 'pending' })),
    staleTime: 60 * 1000,
  });

  const attendanceQuery = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.HRM_DASHBOARD_BASE, 'attendance'],
    queryFn: () => listTotal(() => attendanceApi.list({ page: 1, page_size: 1 })),
    staleTime: 60 * 1000,
  });

  const performanceQuery = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.HRM_DASHBOARD_BASE, 'performance'],
    queryFn: () => listTotal(() => performanceReviewApi.list({ page: 1, page_size: 1 })),
    staleTime: 60 * 1000,
  });

  const trainingQuery = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.HRM_DASHBOARD_BASE, 'training'],
    queryFn: () => listTotal(() => trainingRecordApi.list({ page: 1, page_size: 1 })),
    staleTime: 60 * 1000,
  });

  const loading =
    employeesQuery.isFetching ||
    departmentsQuery.isFetching ||
    pendingLeaveQuery.isFetching ||
    attendanceQuery.isFetching ||
    performanceQuery.isFetching ||
    trainingQuery.isFetching;

  const employees = employeesQuery.data?.items ?? [];

  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'total-employees',
        title: i18n.t('hrm.hrm_overview_page.total_employees'),
        value: employeesQuery.data?.total ?? 0,
        icon: <Users size={24} />,
        color: 'primary',
      },
      {
        id: 'departments',
        title: i18n.t('hrm.hrm_overview_page.department_count'),
        value: departmentsQuery.data ?? 0,
        icon: <Briefcase size={24} />,
        color: 'info',
      },
      {
        id: 'pending-leave',
        title: i18n.t('hrm.hrm_overview_page.pending_leave'),
        value: pendingLeaveQuery.data ?? 0,
        icon: <Calendar size={24} />,
        color: 'warning',
      },
      {
        id: 'attendance-records',
        title: i18n.t('hrm.hrm_overview_page.attendance_records'),
        value: attendanceQuery.data ?? 0,
        icon: <Clock size={24} />,
        color: 'error',
      },
      {
        id: 'performance-reviews',
        title: i18n.t('hrm.hrm_overview_page.performance_review_count'),
        value: performanceQuery.data ?? 0,
        icon: <Award size={24} />,
        color: 'success',
      },
      {
        id: 'training-records',
        title: i18n.t('hrm.hrm_overview_page.training_record_count'),
        value: trainingQuery.data ?? 0,
        icon: <GraduationCap size={24} />,
        color: 'secondary',
      },
    ],
    [
      employeesQuery.data,
      departmentsQuery.data,
      pendingLeaveQuery.data,
      attendanceQuery.data,
      performanceQuery.data,
      trainingQuery.data,
    ]
  );

  // 部门人数分布：由员工明细的 department_name 归集（不依赖后端统计接口）
  const departmentData = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const emp of employees) {
      const name = emp.department_name || '未分配';
      buckets.set(name, (buckets.get(name) ?? 0) + 1);
    }
    return [...buckets.entries()].map(([label, value]) => ({ label, value }));
  }, [employees]);

  // 入职趋势：按 hire_date 归集近 12 个自然月
  const hireTrend = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const emp of employees) {
      const month = (emp.hire_date ?? '').slice(0, 7);
      if (!month) continue;
      buckets.set(month, (buckets.get(month) ?? 0) + 1);
    }
    return [...buckets.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([label, value]) => ({ label, value }));
  }, [employees]);

  const charts: ChartCard[] = useMemo(
    () => [
      {
        id: 'department-distribution',
        title: i18n.t('hrm.hrm_overview_page.dept_headcount_dist'),
        type: 'bar',
        data: departmentData,
      },
      {
        id: 'hire-trend',
        title: i18n.t('hrm.hrm_overview_page.hire_trend'),
        type: 'line',
        data: hireTrend,
      },
    ],
    [departmentData, hireTrend]
  );

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: 'employee-manage',
        label: i18n.t('hrm.hrm_overview_page.employee_management'),
        icon: <Users size={20} />,
        onClick: () => navigate(HRM_PATHS.employees),
        color: theme.palette.primary.dark,
      },
      {
        id: 'attendance-manage',
        label: i18n.t('hrm.hrm_overview_page.attendance_management'),
        icon: <Clock size={20} />,
        onClick: () => navigate(HRM_PATHS.attendance),
        color: theme.palette.secondary[700],
      },
      {
        id: 'leave-manage',
        label: i18n.t('hrm.hrm_overview_page.leave_management'),
        icon: <Calendar size={20} />,
        onClick: () => navigate(HRM_PATHS.leave),
        color: theme.palette.success[700],
      },
      {
        id: 'salary-manage',
        label: i18n.t('hrm.hrm_overview_page.payroll_management'),
        icon: <DollarSign size={20} />,
        onClick: () => navigate(HRM_PATHS.payroll),
        color: theme.palette.warning[600],
      },
      {
        id: 'performance-review',
        label: i18n.t('hrm.hrm_overview_page.performance_review'),
        icon: <Award size={20} />,
        onClick: () => navigate(HRM_PATHS.performance),
        color: theme.palette.success[700],
      },
      {
        id: 'recruitment',
        label: i18n.t('hrm.hrm_overview_page.recruitment_management'),
        icon: <Briefcase size={20} />,
        onClick: () => navigate(HRM_PATHS.recruitment),
        color: theme.palette.error[700],
      },
    ],
    [navigate, theme]
  );

  // 最近动态：最近入职的 5 名员工
  const recentItems: RecentItem[] = useMemo(
    () =>
      [...employees]
        .filter((e) => Boolean(e.hire_date))
        .sort((a, b) => String(b.hire_date).localeCompare(String(a.hire_date)))
        .slice(0, 5)
        .map((emp) => ({
          id: emp.id,
          title: emp.name,
          description: emp.position || emp.department_name || '',
          time: emp.hire_date ? String(emp.hire_date).slice(0, 10) : '',
          icon: <UserPlus size={18} />,
          status: 'success' as const,
          onClick: () => navigate(HRM_PATHS.employees),
        })),
    [employees, navigate]
  );

  return (
    <DashboardTemplate
      title={t('hrm.hrm_overview_page.hr_management_sys')}
      autoTitle={false}
      breadcrumbs={[
        { label: t('hrm.hrm_overview_page.home'), href: '/dashboard' },
        { label: t('hrm.hrm_overview_page.human_resources') },
      ]}
      stats={stats}
      charts={charts}
      recentItems={recentItems}
      recentTitle={t('hrm.hrm_overview_page.recent_activities')}
      quickActions={quickActions}
      quickActionsTitle={t('hrm.hrm_overview_page.action')}
      loading={loading}
      onRefresh={() => {
        void employeesQuery.refetch();
        void departmentsQuery.refetch();
        void pendingLeaveQuery.refetch();
        void attendanceQuery.refetch();
        void performanceQuery.refetch();
        void trainingQuery.refetch();
      }}
    />
  );
};

export default HrmOverviewPage;
