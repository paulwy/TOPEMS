import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Truck, Users, Package, CheckCircle, ArrowRight } from 'lucide-react';
import { PageContainer } from '@/components/common';
import {
  DashboardTemplate,
  type StatCard,
  type ChartCard,
  type QuickAction,
} from '@/components/templates';
import { TMS_PATHS } from '@/modules/tms/config';

const TmsDashboardPage: React.FC = () => {
  const { t: _t } = useTranslation();
  const navigate = useNavigate();

  const loadingQuery = useQuery<boolean>({
    queryKey: ['tms-dashboard'],
    queryFn: async () => true,
    staleTime: Infinity,
  });
  const loading = loadingQuery.isLoading;

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return '上午好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  const lineData = useMemo(
    () => [
      { label: '周一', value: 42 },
      { label: '周二', value: 55 },
      { label: '周三', value: 38 },
      { label: '周四', value: 60 },
      { label: '周五', value: 48 },
      { label: '周六', value: 25 },
      { label: '周日', value: 18 },
    ],
    []
  );

  const barData = useMemo(
    () => [
      { label: '京A-12345', value: 85 },
      { label: '京A-67890', value: 72 },
      { label: '京B-11111', value: 91 },
      { label: '京B-22222', value: 64 },
      { label: '京C-33333', value: 78 },
      { label: '京C-44444', value: 53 },
    ],
    []
  );

  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'vehicles',
        title: '车辆数',
        value: '48',
        icon: <Truck size={24} />,
        change: 2,
        changeLabel: '较上期',
        color: 'primary',
      },
      {
        id: 'drivers',
        title: '司机数',
        value: '65',
        icon: <Users size={24} />,
        change: 5,
        changeLabel: '较上期',
        color: 'success',
      },
      {
        id: 'in-transit',
        title: '在途运单',
        value: '23',
        icon: <Package size={24} />,
        change: 8,
        changeLabel: '较上期',
        color: 'info',
      },
      {
        id: 'monthly-completed',
        title: '本月完成',
        value: '186',
        icon: <CheckCircle size={24} />,
        change: 12,
        changeLabel: '较上期',
        color: 'warning',
      },
    ],
    []
  );

  const charts: ChartCard[] = useMemo(
    () => [
      {
        id: 'shipment-trend',
        title: '运单趋势',
        type: 'line',
        data: lineData,
        height: 300,
      },
      {
        id: 'vehicle-utilization',
        title: '车辆利用率',
        type: 'bar',
        data: barData,
        height: 300,
      },
    ],
    [lineData, barData]
  );

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: 'shipments',
        label: '运单管理',
        icon: <ArrowRight size={16} />,
        onClick: () => navigate(TMS_PATHS.shipments),
      },
      {
        id: 'vehicles',
        label: '车辆档案',
        icon: <ArrowRight size={16} />,
        onClick: () => navigate(TMS_PATHS.vehicles),
      },
    ],
    [navigate]
  );

  return (
    <PageContainer
      title='运输管理概览'
      subtitle={`${getGreeting()}，欢迎使用运输管理系统`}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: '运输管理' },
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

export default TmsDashboardPage;
