import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ClipboardList, CalendarCheck, Gauge, TrendingUp, ArrowRight } from 'lucide-react';
import { PageContainer } from '@/components/common';
import {
  DashboardTemplate,
  type StatCard,
  type ChartCard,
  type QuickAction,
} from '@/components/templates';
import { LazyChart } from '@/components/charts';
import { APS_PATHS } from '@/modules/aps/config';
import { productionPlanApi, scheduleApi } from '@/api/aps';

const ApsDashboardPage: React.FC = () => {
  const { t } = useTranslation();
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
      { name: '周一', value: 12 },
      { name: '周二', value: 18 },
      { name: '周三', value: 15 },
      { name: '周四', value: 22 },
      { name: '周五', value: 19 },
      { name: '周六', value: 8 },
      { name: '周日', value: 5 },
    ],
    []
  );

  const barData = useMemo(
    () => [
      { name: '工作中心A', value: 78 },
      { name: '工作中心B', value: 92 },
      { name: '工作中心C', value: 65 },
      { name: '工作中心D', value: 88 },
      { name: '工作中心E', value: 54 },
    ],
    []
  );

  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'plans',
        title: '生产计划数',
        value: String(plansQuery.data ?? 0),
        icon: <ClipboardList size={24} />,
        change: 4,
        changeLabel: '较上周期',
        color: 'primary',
      },
      {
        id: 'schedules',
        title: '排程数',
        value: String(schedulesQuery.data ?? 0),
        icon: <CalendarCheck size={24} />,
        change: 12,
        changeLabel: '较上周期',
        color: 'info',
      },
      {
        id: 'utilization',
        title: '产能利用率',
        value: '78.5%',
        icon: <Gauge size={24} />,
        change: 3,
        changeLabel: '较上周期',
        color: 'success',
      },
      {
        id: 'accuracy',
        title: '预测准确率',
        value: '92.3%',
        icon: <TrendingUp size={24} />,
        change: -2,
        changeLabel: '较上周期',
        color: 'warning',
      },
    ],
    [plansQuery.data, schedulesQuery.data]
  );

  const charts: ChartCard[] = useMemo(
    () => [
      {
        id: 'schedule-trend',
        title: '排程趋势',
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
        title: '产能利用率',
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
        label: '查看生产计划',
        icon: <ArrowRight size={16} />,
        onClick: () => navigate(APS_PATHS.productionPlans),
      },
      {
        id: 'schedules',
        label: '查看排程',
        icon: <ArrowRight size={16} />,
        onClick: () => navigate(APS_PATHS.schedules),
      },
    ],
    [navigate]
  );

  return (
    <PageContainer
      title='高级计划排程概览'
      subtitle='生产计划、排程、产能、物料计划、需求预测综合视图'
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: '高级计划排程' },
        ]}
        stats={stats}
        charts={charts}
        quickActions={quickActions}
        quickActionsTitle='快捷操作'
        loading={loading}
      />
    </PageContainer>
  );
};

export default ApsDashboardPage;
