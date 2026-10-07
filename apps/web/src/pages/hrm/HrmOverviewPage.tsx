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
import { PageContainer } from '@/components/common';
import { HRM_PATHS } from '@/modules/hrm/config';
import { designTokens } from '@/theme/tokens';

import { useTranslation } from 'react-i18next';
import { LazyChart } from '@/components/charts';

import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

const ct = designTokens.colors;

const departmentData = [
  { name: i18n.t('hrm.hrm_overview_page.tech_dept'), value: 85 },
  { name: i18n.t('hrm.hrm_overview_page.product'), value: 42 },
  { name: i18n.t('hrm.hrm_overview_page.marketing_dept'), value: 35 },
  { name: i18n.t('hrm.hrm_overview_page.finance_dept'), value: 22 },
  { name: i18n.t('hrm.hrm_overview_page.hr_department'), value: 18 },
  { name: i18n.t('hrm.hrm_overview_page.operations_dept'), value: 28 },
  { name: i18n.t('hrm.hrm_overview_page.sales_dept'), value: 26 },
];

const monthlyTrendData = [
  { name: i18n.t('hrm.hrm_overview_page.january'), value: 5 },
  { name: i18n.t('hrm.hrm_overview_page.february'), value: 3 },
  { name: i18n.t('hrm.hrm_overview_page.march'), value: 8 },
  { name: i18n.t('hrm.hrm_overview_page.april'), value: 6 },
  { name: i18n.t('hrm.hrm_overview_page.may'), value: 7 },
  { name: i18n.t('hrm.hrm_overview_page.june'), value: 8 },
];

const performanceData = [
  { name: i18n.t('hrm.hrm_overview_page.excellent'), value: 25 },
  { name: i18n.t('hrm.hrm_overview_page.good'), value: 40 },
  { name: i18n.t('hrm.hrm_overview_page.qualified'), value: 28 },
  { name: i18n.t('hrm.hrm_overview_page.needs_improvement'), value: 7 },
];

const HrmOverviewPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const loadingQuery = useQuery<boolean>({
    queryKey: QUERY_KEYS.AD_HOC.HRM_DASHBOARD_BASE,
    queryFn: async () => true,
    staleTime: Infinity,
  });
  const loading = loadingQuery.isLoading;

  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'total-employees',
        title: i18n.t('hrm.hrm_overview_page.total_employees'),
        value: '256',
        icon: <Users size={24} />,
        change: 12,
        changeLabel: i18n.t('hrm.hrm_overview_page.last_month'),
        color: 'primary',
      },
      {
        id: 'new-hires',
        title: i18n.t('hrm.hrm_overview_page.this_month'),
        value: '8',
        icon: <UserPlus size={24} />,
        change: 3,
        changeLabel: i18n.t('hrm.hrm_overview_page.last_month'),
        color: 'success',
      },
      {
        id: 'attendance-exception',
        title: i18n.t('hrm.hrm_overview_page.abnormal'),
        value: '15',
        icon: <Clock size={24} />,
        change: -5,
        changeLabel: i18n.t('hrm.hrm_overview_page.last_month'),
        color: 'error',
      },
      {
        id: 'pending-leave',
        title: i18n.t('hrm.hrm_overview_page.pending_leave'),
        value: '6',
        icon: <Calendar size={24} />,
        change: 2,
        changeLabel: i18n.t('hrm.hrm_overview_page.pending'),
        color: 'warning',
      },
      {
        id: 'avg-performance',
        title: i18n.t('hrm.hrm_overview_page.avg_performance'),
        value: '85.3',
        icon: <Award size={24} />,
        change: 3.2,
        changeLabel: i18n.t('hrm.hrm_overview_page.last_month'),
        color: 'info',
      },
      {
        id: 'training-complete',
        title: i18n.t('hrm.hrm_overview_page.completed'),
        value: '78%',
        icon: <GraduationCap size={24} />,
        change: 8,
        changeLabel: t('hrm.hrm_overview_page.last_month'),
        color: 'success',
      },
    ],
    [t]
  );

  const charts: ChartCard[] = useMemo(
    () => [
      {
        id: 'department-distribution',
        title: i18n.t('hrm.hrm_overview_page.dept_headcount_dist'),
        chart: (
          <LazyChart
            type='bar'
            data={departmentData}
            xKey='name'
            yKey='value'
          />
        ),
        height: 300,
      },
      {
        id: 'hire-trend',
        title: i18n.t('hrm.hrm_overview_page.monthly_onboarding_turnover'),
        chart: (
          <LazyChart
            type='line'
            data={monthlyTrendData}
            xKey='name'
            yKey='value'
          />
        ),
        height: 300,
      },
      {
        id: 'performance-distribution',
        title: i18n.t('hrm.hrm_overview_page.performance_distribution'),
        chart: (
          <LazyChart
            type='pie'
            data={performanceData}
          />
        ),
        height: 300,
      },
    ],
    []
  );

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: 'employee-manage',
        label: i18n.t('hrm.hrm_overview_page.employee_management'),
        icon: <Users size={20} />,
        onClick: () => navigate(HRM_PATHS.employees),
        color: ct.primary.dark,
      },
      {
        id: 'attendance-manage',
        label: i18n.t('hrm.hrm_overview_page.attendance_management'),
        icon: <Clock size={20} />,
        onClick: () => navigate(HRM_PATHS.attendance),
        color: ct.secondary[700],
      },
      {
        id: 'leave-manage',
        label: i18n.t('hrm.hrm_overview_page.leave_management'),
        icon: <Calendar size={20} />,
        onClick: () => navigate(HRM_PATHS.leave),
        color: ct.success[700],
      },
      {
        id: 'salary-manage',
        label: i18n.t('hrm.hrm_overview_page.payroll_management'),
        icon: <DollarSign size={20} />,
        onClick: () => navigate(HRM_PATHS.payroll),
        color: ct.warning[600],
      },
      {
        id: 'performance-review',
        label: i18n.t('hrm.hrm_overview_page.performance_review'),
        icon: <Award size={20} />,
        onClick: () => navigate(HRM_PATHS.performance),
        color: ct.success[700],
      },
      {
        id: 'recruitment',
        label: i18n.t('hrm.hrm_overview_page.recruitment_management'),
        icon: <Briefcase size={20} />,
        onClick: () => navigate(HRM_PATHS.recruitment),
        color: ct.error[700],
      },
    ],
    [navigate]
  );

  const recentItems: RecentItem[] = useMemo(
    () => [
      {
        id: 'leave1',
        title: i18n.t('hrm.hrm_overview_page.leave_app_li_si'),
        description: i18n.t('hrm.hrm_overview_page.annual_leave_sample'),
        time: '2026-06-29 09:30',
        icon: <Calendar size={18} />,
        status: 'warning',
        tags: [{ label: i18n.t('hrm.hrm_overview_page.pending_approval'), color: ct.warning[600] }],
        onClick: () => navigate(HRM_PATHS.leave),
      },
      {
        id: 'emp1',
        title: i18n.t('hrm.hrm_overview_page.new_hire_wang_wu'),
        description: i18n.t('hrm.hrm_overview_page.tech_senior_frontend'),
        time: '2026-06-29 08:00',
        icon: <UserPlus size={18} />,
        status: 'success',
        onClick: () => navigate(HRM_PATHS.employees),
      },
      {
        id: 'att1',
        title: i18n.t('hrm.hrm_overview_page.abnormal_1'),
        description: i18n.t('hrm.hrm_overview_page.late_remark_sample'),
        time: '2026-06-28 17:30',
        icon: <Clock size={18} />,
        status: 'error',
        onClick: () => navigate(HRM_PATHS.attendance),
      },
      {
        id: 'perf1',
        title: i18n.t('hrm.hrm_overview_page.completed_1'),
        description: i18n.t('hrm.hrm_overview_page.submit'),
        time: '2026-06-28 16:00',
        icon: <Award size={18} />,
        status: 'success',
        onClick: () => navigate(HRM_PATHS.performance),
      },
      {
        id: 'train1',
        title: i18n.t('hrm.hrm_overview_page.new_hire_training_s3'),
        description: i18n.t('hrm.hrm_overview_page.completed_2'),
        time: '2026-06-27 15:00',
        icon: <GraduationCap size={18} />,
        status: 'info',
        tags: [{ label: i18n.t('hrm.hrm_overview_page.in_progress'), color: ct.primary.dark }],
        onClick: () => navigate(HRM_PATHS.training),
      },
    ],
    [navigate]
  );

  return (
    <PageContainer
      title={t('hrm.hrm_overview_page.hr_management_sys')}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
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
      />
    </PageContainer>
  );
};

export default HrmOverviewPage;
