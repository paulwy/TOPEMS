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
import { hrmApi } from '@/api/hrm';

const ct = designTokens.colors;

const HrmOverviewPage: React.FC = () => {
  const { data: backendData, isLoading: isBackendLoading } = useQuery({
    queryKey: ['hrm-overview'],
    queryFn: async () => {
      try {
        // TODO: hrmApi.getOverviewSummary 不存在，等待后端接口对接
        return {};
      } catch (e) {
        return {};
      }
    },
  });
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
        title: i18n.t('hrm.hrm_overview_page.text_97e957'),
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
        title: i18n.t('hrm.hrm_overview_page.text_7c3c05'),
        value: '6',
        icon: <Calendar size={24} />,
        change: 2,
        changeLabel: i18n.t('hrm.hrm_overview_page.pending'),
        color: 'warning',
      },
      {
        id: 'avg-performance',
        title: i18n.t('hrm.hrm_overview_page.text_d8ddb8'),
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
    []
  );

  const departmentData = [
    { name: t('hrm.hrm_overview_page.text_c6a757'), value: 85 },
    { name: t('hrm.hrm_overview_page.product'), value: 42 },
    { name: t('hrm.hrm_overview_page.text_73b111'), value: 35 },
    { name: t('hrm.hrm_overview_page.text_b159e5'), value: 22 },
    { name: t('hrm.hrm_overview_page.text_f802d1'), value: 18 },
    { name: t('hrm.hrm_overview_page.text_b890b3'), value: 28 },
    { name: t('hrm.hrm_overview_page.text_afdedb'), value: 26 },
  ];

  const monthlyTrendData = [
    { name: t('hrm.hrm_overview_page.text_fccc2b'), value: 5 },
    { name: t('hrm.hrm_overview_page.text_c1d13f'), value: 3 },
    { name: t('hrm.hrm_overview_page.text_c4767b'), value: 8 },
    { name: t('hrm.hrm_overview_page.text_3eaf4b'), value: 6 },
    { name: t('hrm.hrm_overview_page.text_0545f1'), value: 7 },
    { name: t('hrm.hrm_overview_page.text_f2422a'), value: 8 },
  ];

  const performanceData = [
    { name: t('hrm.hrm_overview_page.text_c08ed9'), value: 25 },
    { name: t('hrm.hrm_overview_page.text_c5c01c'), value: 40 },
    { name: t('hrm.hrm_overview_page.qualified'), value: 28 },
    { name: t('hrm.hrm_overview_page.text_e10613'), value: 7 },
  ];

  const charts: ChartCard[] = useMemo(
    () => [
      {
        id: 'department-distribution',
        title: i18n.t('hrm.hrm_overview_page.text_a2487e'),
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
        title: i18n.t('hrm.hrm_overview_page.text_0b2824'),
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
        title: i18n.t('hrm.hrm_overview_page.text_5890cb'),
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
        label: i18n.t('hrm.hrm_overview_page.text_b33603'),
        icon: <Users size={20} />,
        onClick: () => navigate(HRM_PATHS.employees),
        color: ct.primary.dark,
      },
      {
        id: 'attendance-manage',
        label: i18n.t('hrm.hrm_overview_page.text_2a2338'),
        icon: <Clock size={20} />,
        onClick: () => navigate(HRM_PATHS.attendance),
        color: ct.secondary[700],
      },
      {
        id: 'leave-manage',
        label: i18n.t('hrm.hrm_overview_page.text_f2b75f'),
        icon: <Calendar size={20} />,
        onClick: () => navigate(HRM_PATHS.leave),
        color: ct.success[700],
      },
      {
        id: 'salary-manage',
        label: i18n.t('hrm.hrm_overview_page.text_bf8ab5'),
        icon: <DollarSign size={20} />,
        onClick: () => navigate(HRM_PATHS.payroll),
        color: ct.warning[600],
      },
      {
        id: 'performance-review',
        label: i18n.t('hrm.hrm_overview_page.text_5ad4ab'),
        icon: <Award size={20} />,
        onClick: () => navigate(HRM_PATHS.performance),
        color: ct.success[700],
      },
      {
        id: 'recruitment',
        label: i18n.t('hrm.hrm_overview_page.text_b4f20d'),
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
        title: i18n.t('hrm.hrm_overview_page.text_3f1c1f'),
        description: i18n.t('hrm.hrm_overview_page.text_16737a'),
        time: '2026-06-29 09:30',
        icon: <Calendar size={18} />,
        status: 'warning',
        tags: [{ label: i18n.t('hrm.hrm_overview_page.text_b0bf01'), color: ct.warning[600] }],
        onClick: () => navigate(HRM_PATHS.leave),
      },
      {
        id: 'emp1',
        title: i18n.t('hrm.hrm_overview_page.text_729463'),
        description: i18n.t('hrm.hrm_overview_page.text_3d1fda'),
        time: '2026-06-29 08:00',
        icon: <UserPlus size={18} />,
        status: 'success',
        onClick: () => navigate(HRM_PATHS.employees),
      },
      {
        id: 'att1',
        title: i18n.t('hrm.hrm_overview_page.abnormal_1'),
        description: i18n.t('hrm.hrm_overview_page.text_f127db'),
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
        title: i18n.t('hrm.hrm_overview_page.text_2a2606'),
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
      title={t('hrm.hrm_overview_page.text_c19ad7')}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: t('hrm.hrm_overview_page.home'), href: '/dashboard' },
          { label: t('hrm.hrm_overview_page.text_40fb54') },
        ]}
        stats={stats}
        charts={charts}
        recentItems={recentItems}
        recentTitle={t('hrm.hrm_overview_page.text_32773c')}
        quickActions={quickActions}
        quickActionsTitle={t('hrm.hrm_overview_page.action')}
        loading={loading}
      />
    </PageContainer>
  );
};

export default HrmOverviewPage;
