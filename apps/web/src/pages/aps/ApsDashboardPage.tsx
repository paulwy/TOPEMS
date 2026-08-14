import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, CalendarCheck, Gauge, TrendingUp, ArrowRight } from 'lucide-react';
import { PageContainer } from '@/components/common';
import {
  DashboardTemplate,
  type StatCard,
  type ChartCard,
  type QuickAction,
} from '@/components/templates';
import i18n from '@/i18n';
import { LazyChart } from '@/components/charts';
import { APS_PATHS } from '@/modules/aps/config';
import { productionPlanApi, scheduleApi } from '@/api/aps';
const ApsDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const plansQuery = useQuery({
    queryKey: ['aps-dashboard-plans'],
    queryFn: async () => {
      const res = await productionPlanApi.list({ page: 1, pageSize: 1 });
      return res.success && res.data ? res.data.total : 0;
    },
    staleTime: 60 * 1000,
  });
  const schedulesQuery = useQuery({
    queryKey: ['aps-dashboard-schedules'],
    queryFn: async () => {
      const res = await scheduleApi.list({ page: 1, pageSize: 1 });
      return res.success && res.data ? res.data.total : 0;
    },
    staleTime: 60 * 1000,
  });
  const loadingQuery = useQuery<boolean>({
    queryKey: ['aps-dashboard-loading'],
    queryFn: async () => true,
    staleTime: Infinity,
  });
  const loading = loadingQuery.isLoading || plansQuery.isLoading || schedulesQuery.isLoading;
  const lineData = useMemo(
    () => [
      { name: i18n.t('aps.aps_dashboard_page.k0'), value: 12 },
      { name: i18n.t('aps.aps_dashboard_page.k1'), value: 18 },
      { name: i18n.t('aps.aps_dashboard_page.k2'), value: 15 },
      { name: i18n.t('aps.aps_dashboard_page.k3'), value: 22 },
      { name: i18n.t('aps.aps_dashboard_page.k4'), value: 19 },
      { name: i18n.t('aps.aps_dashboard_page.k5'), value: 8 },
      { name: i18n.t('aps.aps_dashboard_page.k6'), value: 5 },
    ],
    []
  );
  const barData = useMemo(
    () => [
      { name: i18n.t('aps.aps_dashboard_page.a_7'), value: 78 },
      { name: i18n.t('aps.aps_dashboard_page.b_8'), value: 92 },
      { name: i18n.t('aps.aps_dashboard_page.c_9'), value: 65 },
      { name: i18n.t('aps.aps_dashboard_page.d_10'), value: 88 },
      { name: i18n.t('aps.aps_dashboard_page.e_11'), value: 54 },
    ],
    []
  );
  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'plans',
        title: i18n.t('aps.aps_dashboard_page.k12'),
        value: String(plansQuery.data ?? 0),
        icon: <ClipboardList size={24} />,
        change: 4,
        changeLabel: i18n.t('aps.aps_dashboard_page.k13'),
        color: 'primary',
      },
      {
        id: 'schedules',
        title: i18n.t('aps.aps_dashboard_page.k14'),
        value: String(schedulesQuery.data ?? 0),
        icon: <CalendarCheck size={24} />,
        change: 12,
        changeLabel: i18n.t('aps.aps_dashboard_page.k15'),
        color: 'info',
      },
      {
        id: 'utilization',
        title: i18n.t('aps.aps_dashboard_page.k16'),
        value: '78.5%',
        icon: <Gauge size={24} />,
        change: 3,
        changeLabel: i18n.t('aps.aps_dashboard_page.k17'),
        color: 'success',
      },
      {
        id: 'accuracy',
        title: i18n.t('aps.aps_dashboard_page.k18'),
        value: '92.3%',
        icon: <TrendingUp size={24} />,
        change: -2,
        changeLabel: i18n.t('aps.aps_dashboard_page.k19'),
        color: 'warning',
      },
    ],
    [plansQuery.data, schedulesQuery.data]
  );
  const charts: ChartCard[] = useMemo(
    () => [
      {
        id: 'schedule-trend',
        title: i18n.t('aps.aps_dashboard_page.k20'),
        chart: (
          <LazyChart
            type='line'
            data={lineData}
            xKey='name'
            yKey='value'
            height={300}
          />
        ),
        height: 300,
        type: 'line',
      },
      {
        id: 'capacity-utilization',
        title: i18n.t('aps.aps_dashboard_page.k21'),
        chart: (
          <LazyChart
            type='bar'
            data={barData}
            xKey='name'
            yKey='value'
            height={300}
          />
        ),
        height: 300,
        type: 'bar',
      },
    ],
    [lineData, barData]
  );
  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: 'production-plans',
        label: i18n.t('aps.aps_dashboard_page.k22'),
        icon: <ArrowRight size={16} />,
        onClick: () => navigate(APS_PATHS.productionPlans),
      },
      {
        id: 'schedules',
        label: i18n.t('aps.aps_dashboard_page.k23'),
        icon: <ArrowRight size={16} />,
        onClick: () => navigate(APS_PATHS.schedules),
      },
    ],
    [navigate]
  );
  return (
    <PageContainer
      title={i18n.t('aps.aps_dashboard_page.k24')}
      subtitle={i18n.t('aps.aps_dashboard_page.k25')}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: i18n.t('aps.aps_dashboard_page.k26'), href: '/dashboard' },
          { label: i18n.t('aps.aps_dashboard_page.k27') },
        ]}
        stats={stats}
        charts={charts}
        quickActions={quickActions}
        quickActionsTitle={i18n.t('aps.aps_dashboard_page.k28')}
        loading={loading}
      />
    </PageContainer>
  );
};
export default ApsDashboardPage;