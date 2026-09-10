import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageContainer } from '@/components/common';
import { Warehouse, Package, AlertCircle, ArrowRight, Truck } from 'lucide-react';
import {
  DashboardTemplate,
  type StatCard,
  type ChartCard,
  type QuickAction,
} from '@/components/templates';
import { WMS_PATHS } from '@/modules/wms/config';
import { LazyChart } from '@/components/charts';
import { wmsAnalyticsApi } from '@/api/wms/analytics';

import { QUERY_KEYS } from '@/lib/reactQuery';

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: summary, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.AD_HOC.WMS_DASHBOARD_BASE, 'summary'],
    queryFn: () => wmsAnalyticsApi.getDashboardSummary(),
    staleTime: 60_000,
  });

  const { data: distributionData } = useQuery({
    queryKey: [QUERY_KEYS.AD_HOC.WMS_DASHBOARD_BASE, 'distribution'],
    queryFn: () => wmsAnalyticsApi.getInventoryDistribution(),
    staleTime: 60_000,
  });

  const { data: typesData } = useQuery({
    queryKey: [QUERY_KEYS.AD_HOC.WMS_DASHBOARD_BASE, 'types'],
    queryFn: () => wmsAnalyticsApi.getInventoryTypes(),
    staleTime: 60_000,
  });

  const { data: trendData } = useQuery({
    queryKey: [QUERY_KEYS.AD_HOC.WMS_DASHBOARD_BASE, 'trend'],
    queryFn: () => wmsAnalyticsApi.getDailyTrend(),
    staleTime: 60_000,
  });

  const loading = isLoading;

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return t('wms.dashboard_page.greeting_morning');
    if (hour < 18) return t('wms.dashboard_page.greeting_afternoon');
    return t('wms.dashboard_page.greeting_evening');
  };

  const barData = useMemo(
    () =>
      distributionData?.data?.map((item) => ({
        name: item.warehouse_name,
        value: Math.round(item.quantity),
      })) ?? [],
    [distributionData]
  );
  const pieData = useMemo(
    () =>
      typesData?.data?.map((item) => ({
        name: item.material_type,
        value: Math.round(item.percentage),
      })) ?? [],
    [typesData]
  );
  const lineData = useMemo(
    () =>
      trendData?.data?.map((item) => ({
        name: item.date.slice(5),
        value: item.inbound + item.outbound,
      })) ?? [],
    [trendData]
  );

  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'warehouses',
        title: t('wms.dashboard_page.stat_warehouses'),
        value: summary?.data?.warehouse_count?.toLocaleString() ?? '-',
        icon: <Warehouse size={24} />,
        change: 0,
        changeLabel: t('wms.dashboard_page.vs_last_period'),
        color: 'primary',
      },
      {
        id: 'inventory',
        title: t('wms.dashboard_page.stat_inventory'),
        value: summary?.data?.inventory_total?.toLocaleString() ?? '-',
        icon: <Package size={24} />,
        change: 0,
        changeLabel: t('wms.dashboard_page.vs_last_period'),
        color: 'success',
      },
      {
        id: 'inbound',
        title: t('wms.dashboard_page.stat_inbound_today'),
        value: summary?.data?.inbound_today?.toLocaleString() ?? '-',
        icon: <Truck size={24} />,
        change: 0,
        changeLabel: t('wms.dashboard_page.vs_last_period'),
        color: 'info',
      },
      {
        id: 'alerts',
        title: t('wms.dashboard_page.stat_alerts'),
        value: summary?.data?.alert_count?.toLocaleString() ?? '-',
        icon: <AlertCircle size={24} />,
        change: summary?.data?.alert_critical ? -summary.data.alert_critical : 0,
        changeLabel: t('wms.dashboard_page.vs_last_period'),
        color: 'warning',
      },
    ],
    [t, summary]
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
