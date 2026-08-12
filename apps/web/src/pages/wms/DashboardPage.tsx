import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Button } from '@mui/material';
import { QuickSearch, PageContainer } from '@/components/common';
import { Warehouse, Package, AlertCircle, ArrowRight, Truck } from 'lucide-react';
import {
  DashboardTemplate,
  type StatCard,
  type ChartCard,
  type QuickAction,
} from '@/components/templates';
import { WMS_PATHS } from '@/modules/wms/config';
import { LazyChart } from '@/components/charts';


import { QUERY_KEYS } from '@/lib/reactQuery';

const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  Warehouse,
  Package,
  AlertCircle,
  Truck,
};

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const loadingQuery = useQuery<boolean>({
    queryKey: QUERY_KEYS.AD_HOC.WMS_DASHBOARD_BASE,
    queryFn: async () => true,
    staleTime: Infinity,
  });
  const loading = loadingQuery.isLoading;

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return t('wms.dashboard_page.greeting_morning');
    if (hour < 18) return t('wms.dashboard_page.greeting_afternoon');
    return t('wms.dashboard_page.greeting_evening');
  };

  const barData = useMemo(
    () => [
      { name: t('wms.dashboard_page.area_a'), value: 1200 },
      { name: t('wms.dashboard_page.area_b'), value: 980 },
      { name: t('wms.dashboard_page.area_c'), value: 1500 },
      { name: t('wms.dashboard_page.area_d'), value: 750 },
      { name: t('wms.dashboard_page.area_e'), value: 1100 },
      { name: t('wms.dashboard_page.area_f'), value: 620 },
    ],
    [t]
  );
  const pieData = useMemo(
    () => [
      { name: t('wms.dashboard_page.type_raw_material'), value: 35 },
      { name: t('wms.dashboard_page.type_finished'), value: 45 },
      { name: t('wms.dashboard_page.type_semi_finished'), value: 20 },
    ],
    [t]
  );
  const lineData = useMemo(
    () => [
      { name: t('wms.dashboard_page.weekday_mon'), value: 85 },
      { name: t('wms.dashboard_page.weekday_tue'), value: 92 },
      { name: t('wms.dashboard_page.weekday_wed'), value: 78 },
      { name: t('wms.dashboard_page.weekday_thu'), value: 95 },
      { name: t('wms.dashboard_page.weekday_fri'), value: 88 },
      { name: t('wms.dashboard_page.weekday_sat'), value: 45 },
    ],
    [t]
  );

  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'warehouses',
        title: t('wms.dashboard_page.stat_warehouses'),
        value: '6',
        icon: <Warehouse size={24} />,
        change: 1,
        changeLabel: t('wms.dashboard_page.vs_last_period'),
        color: 'primary',
      },
      {
        id: 'inventory',
        title: t('wms.dashboard_page.stat_inventory'),
        value: '6,150',
        icon: <Package size={24} />,
        change: 320,
        changeLabel: t('wms.dashboard_page.vs_last_period'),
        color: 'success',
      },
      {
        id: 'inbound',
        title: t('wms.dashboard_page.stat_inbound_today'),
        value: '128',
        icon: <Truck size={24} />,
        change: 25,
        changeLabel: t('wms.dashboard_page.vs_last_period'),
        color: 'info',
      },
      {
        id: 'alerts',
        title: t('wms.dashboard_page.stat_alerts'),
        value: '5',
        icon: <AlertCircle size={24} />,
        change: -3,
        changeLabel: t('wms.dashboard_page.vs_last_period'),
        color: 'warning',
      },
    ],
    [t]
  );

  const charts: ChartCard[] = useMemo(
    () => [
      {
        id: 'inventory-distribution',
        title: t('wms.dashboard_page.chart_inventory_distribution'),
        chart: (
          <LazyChart
            type='bar'
            data={barData}
            xKey='name'
            yKey='value'
          />
        ),
        height: 300,
        type: 'bar',
      },
      {
        id: 'inventory-type',
        title: t('wms.dashboard_page.chart_inventory_type'),
        chart: (
          <LazyChart
            type='pie'
            data={pieData}
          />
        ),
        height: 300,
        type: 'pie',
      },
      {
        id: 'daily-trend',
        title: t('wms.dashboard_page.chart_daily_trend'),
        chart: (
          <LazyChart
            type='line'
            data={lineData}
            xKey='name'
            yKey='value'
          />
        ),
        height: 300,
        type: 'line',
      },
    ],
    [t, barData, pieData, lineData]
  );

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: 'inventory',
        label: t('wms.dashboard_page.action_inventory_query'),
        icon: <ArrowRight size={16} />,
        onClick: () => navigate(WMS_PATHS.inventory),
      },
      {
        id: 'warehouse-settings',
        label: t('wms.dashboard_page.action_warehouse_settings'),
        icon: <ArrowRight size={16} />,
        onClick: () => navigate(WMS_PATHS.warehouseManagement),
      },
    ],
    [t, navigate]
  );

  const headerContent = useMemo(
    () => (
      <QuickSearch
        placeholder={t('wms.dashboard_page.search_placeholder')}
        onSearch={(query) => {
          navigate(`${WMS_PATHS.inventory}?search=${encodeURIComponent(query)}`);
        }}
        width={320}
      />
    ),
    [t, navigate]
  );

  return (
    <PageContainer
      title={t('wms.dashboard_page.title')}
      subtitle={t('wms.dashboard_page.subtitle', { greeting: getGreeting() })}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: t('wms.dashboard_page.breadcrumb_home'), href: '/dashboard' },
          { label: t('wms.dashboard_page.breadcrumb_module') },
        ]}
        stats={stats}
        charts={charts}
        quickActions={quickActions}
        quickActionsTitle={t('wms.dashboard_page.quick_actions_title')}
        loading={loading}
      />
    </PageContainer>
  );
};

export default DashboardPage;
