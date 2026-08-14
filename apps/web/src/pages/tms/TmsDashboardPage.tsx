import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Truck, Users, Package, CheckCircle, ArrowRight } from 'lucide-react';
import { PageContainer } from '@/components/common';
import {
  DashboardTemplate,
  type StatCard,
  type ChartCard,
  type QuickAction,
} from '@/components/templates';
import i18n from '@/i18n';
import { TMS_PATHS } from '@/modules/tms/config';
const TmsDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const loadingQuery = useQuery<boolean>({
    queryKey: ['tms-dashboard'],
    queryFn: async () => true,
    staleTime: Infinity,
  });
  const loading = loadingQuery.isLoading;
  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return i18n.t('tms.tms_dashboard_page.k0');
    if (hour < 18) return i18n.t('tms.tms_dashboard_page.k1');
    return i18n.t('tms.tms_dashboard_page.k2');
  };
  const lineData = useMemo(
    () => [
      { label: i18n.t('tms.tms_dashboard_page.k3'), value: 42 },
      { label: i18n.t('tms.tms_dashboard_page.k4'), value: 55 },
      { label: i18n.t('tms.tms_dashboard_page.k5'), value: 38 },
      { label: i18n.t('tms.tms_dashboard_page.k6'), value: 60 },
      { label: i18n.t('tms.tms_dashboard_page.k7'), value: 48 },
      { label: i18n.t('tms.tms_dashboard_page.k8'), value: 25 },
      { label: i18n.t('tms.tms_dashboard_page.k9'), value: 18 },
    ],
    []
  );
  const barData = useMemo(
    () => [
      { label: i18n.t('tms.tms_dashboard_page.a12345_10'), value: 85 },
      { label: i18n.t('tms.tms_dashboard_page.a67890_11'), value: 72 },
      { label: i18n.t('tms.tms_dashboard_page.b11111_12'), value: 91 },
      { label: i18n.t('tms.tms_dashboard_page.b22222_13'), value: 64 },
      { label: i18n.t('tms.tms_dashboard_page.c33333_14'), value: 78 },
      { label: i18n.t('tms.tms_dashboard_page.c44444_15'), value: 53 },
    ],
    []
  );
  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'vehicles',
        title: i18n.t('tms.tms_dashboard_page.k16'),
        value: '48',
        icon: <Truck size={24} />,
        change: 2,
        changeLabel: i18n.t('tms.tms_dashboard_page.k17'),
        color: 'primary',
      },
      {
        id: 'drivers',
        title: i18n.t('tms.tms_dashboard_page.k18'),
        value: '65',
        icon: <Users size={24} />,
        change: 5,
        changeLabel: i18n.t('tms.tms_dashboard_page.k19'),
        color: 'success',
      },
      {
        id: 'in-transit',
        title: i18n.t('tms.tms_dashboard_page.k20'),
        value: '23',
        icon: <Package size={24} />,
        change: 8,
        changeLabel: i18n.t('tms.tms_dashboard_page.k21'),
        color: 'info',
      },
      {
        id: 'monthly-completed',
        title: i18n.t('tms.tms_dashboard_page.k22'),
        value: '186',
        icon: <CheckCircle size={24} />,
        change: 12,
        changeLabel: i18n.t('tms.tms_dashboard_page.k23'),
        color: 'warning',
      },
    ],
    []
  );
  const charts: ChartCard[] = useMemo(
    () => [
      {
        id: 'shipment-trend',
        title: i18n.t('tms.tms_dashboard_page.k24'),
        type: 'line',
        data: lineData,
        height: 300,
      },
      {
        id: 'vehicle-utilization',
        title: i18n.t('tms.tms_dashboard_page.k25'),
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
        label: i18n.t('tms.tms_dashboard_page.k26'),
        icon: <ArrowRight size={16} />,
        onClick: () => navigate(TMS_PATHS.shipments),
      },
      {
        id: 'vehicles',
        label: i18n.t('tms.tms_dashboard_page.k27'),
        icon: <ArrowRight size={16} />,
        onClick: () => navigate(TMS_PATHS.vehicles),
      },
    ],
    [navigate]
  );
  return (
    <PageContainer
      title={i18n.t('tms.tms_dashboard_page.k28')}
      subtitle={`${getGreeting()}${i18n.t('pages.tms_dashboard_page.k0')}`}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: i18n.t('tms.tms_dashboard_page.k29'), href: '/dashboard' },
          { label: i18n.t('tms.tms_dashboard_page.k30') },
        ]}
        stats={stats}
        charts={charts}
        quickActions={quickActions}
        quickActionsTitle={i18n.t('tms.tms_dashboard_page.k31')}
        loading={loading}
      />
    </PageContainer>
  );
};
export default TmsDashboardPage;