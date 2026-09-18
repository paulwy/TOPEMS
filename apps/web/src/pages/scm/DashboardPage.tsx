import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  ArrowRight,
  ShoppingCart,
  RefreshCw,
  Truck,
  ClipboardCheck,
  TrendingUp,
  DollarSign,
  Package,
} from 'lucide-react';
import {
  DashboardTemplate,
  type StatCard,
  type ChartCard,
  type QuickAction,
} from '@/components/templates';
import { PageContainer } from '@/components/common';
import { scmApi, scmAnalyticsApi } from '@/api/scm';
import type {
  SupplyChainOverview,
  MrpPlan,
  IncomingInspection,
  InventoryTurnoverStat,
  PriceComparison,
} from '@/api/scm';
import { SCM_PATHS } from '@/modules/scm/config';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { LazyChart } from '@/components/charts';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation('scm');
  const navigate = useNavigate();

  const { data: trendData } = useQuery({
    queryKey: [QUERY_KEYS.SCM.OVERVIEW, 'trend'],
    queryFn: () => scmAnalyticsApi.getPurchaseTrend(),
    staleTime: 60_000,
  });

  const { data: statusData } = useQuery({
    queryKey: [QUERY_KEYS.SCM.OVERVIEW, 'status'],
    queryFn: () => scmAnalyticsApi.getPurchaseStatus(),
    staleTime: 60_000,
  });

  const { data: rankingData } = useQuery({
    queryKey: [QUERY_KEYS.SCM.OVERVIEW, 'ranking'],
    queryFn: () => scmAnalyticsApi.getSupplierRanking(),
    staleTime: 60_000,
  });

  const barData = useMemo(
    () =>
      rankingData?.data?.map((item) => ({
        name: item.supplier_name,
        value: Math.round(item.total_amount / 10000),
      })) ?? [],
    [rankingData]
  );
  const pieData = useMemo(
    () =>
      statusData?.data?.map((item) => ({
        name: item.status,
        value: Math.round(item.percentage),
      })) ?? [],
    [statusData]
  );
  const lineData = useMemo(
    () =>
      trendData?.data?.map((item) => ({
        name: item.date.slice(5),
        value: item.count,
      })) ?? [],
    [trendData]
  );

  const { data: overview, isPending: overviewLoading } = useQuery({
    queryKey: QUERY_KEYS.SCM.OVERVIEW,
    queryFn: async () => {
      const response = await scmApi.supplyChainDashboard.overview();
      if (response.success && response.data) {
        return response.data as SupplyChainOverview;
      }
      return null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { isPending: mrpLoading } = useQuery({
    queryKey: QUERY_KEYS.SCM.MRP_PLANS,
    queryFn: async () => {
      const response = await scmApi.mrpPlans.list({ page: 1, pageSize: 5 });
      if (response.success && response.data) {
        return (response.data as unknown as { suggestions?: MrpPlan[] }).suggestions ?? [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { isPending: inspectionLoading } = useQuery({
    queryKey: QUERY_KEYS.SCM.INCOMING_INSPECTIONS,
    queryFn: async () => {
      const response = await scmApi.incomingInspections.list({ page: 1, pageSize: 5 });
      if (response.success && response.data) {
        return response.data.items as IncomingInspection[];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { isPending: inventoryLoading } = useQuery({
    queryKey: QUERY_KEYS.SCM.INVENTORY_TURNOVER,
    queryFn: async () => {
      const response = await scmApi.inventoryTurnover.list({ page: 1, pageSize: 5 });
      if (response.success && response.data) {
        return response.data.items as InventoryTurnoverStat[];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { isPending: priceLoading } = useQuery({
    queryKey: QUERY_KEYS.SCM.PRICE_COMPARISONS,
    queryFn: async () => {
      const response = await scmApi.priceComparisons.list({ page: 1, pageSize: 5 });
      if (response.success && response.data) {
        return (response.data as unknown as { comparisons?: PriceComparison[] }).comparisons ?? [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const loading =
    overviewLoading || mrpLoading || inspectionLoading || inventoryLoading || priceLoading;

  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'suppliers',
        title: i18n.t('scm.dashboard_page.k10'),
        value: overview?.active_suppliers?.toString() || '128',
        icon: <Users size={24} />,
        change: overview?.total_suppliers
          ? Math.round((overview.active_suppliers / overview.total_suppliers) * 100)
          : 5,
        changeLabel: i18n.t('scm.dashboard_page.k11'),
        color: 'primary',
      },
      {
        id: 'orders',
        title: i18n.t('scm.dashboard_page.k12'),
        value: overview?.pending_orders?.toString() || '45',
        icon: <ShoppingCart size={24} />,
        change: overview?.total_purchase_orders
          ? Math.round((overview.pending_orders / overview.total_purchase_orders) * 100)
          : 8,
        changeLabel: i18n.t('scm.dashboard_page.k13'),
        color: 'success',
      },
      {
        id: 'turnover',
        title: i18n.t('scm.dashboard_page.k14'),
        value: overview?.inventory_turnover_rate?.toFixed(1) || '4.2',
        icon: <RefreshCw size={24} />,
        change: 0.3,
        changeLabel: i18n.t('scm.dashboard_page.k15'),
        color: 'info',
      },
      {
        id: 'quality',
        title: i18n.t('scm.dashboard_page.k16'),
        value: `${overview?.quality_pass_rate || 0}%`,
        icon: <ClipboardCheck size={24} />,
        change: overview?.quality_pass_rate ? Math.round(overview.quality_pass_rate) : 5,
        changeLabel: i18n.t('scm.dashboard_page.k17'),
        color: 'warning',
      },
      {
        id: 'delivery',
        title: i18n.t('scm.dashboard_page.k18'),
        value: `${overview?.on_time_delivery_rate || 0}%`,
        icon: <Truck size={24} />,
        change: overview?.on_time_delivery_rate ? Math.round(overview.on_time_delivery_rate) : 3,
        changeLabel: i18n.t('scm.dashboard_page.k19'),
        color: 'success',
      },
      {
        id: 'completion',
        title: t('scm.dashboard_page.k20'),
        value: `${overview?.order_completion_rate || 0}%`,
        icon: <TrendingUp size={24} />,
        change: overview?.order_completion_rate ? Math.round(overview.order_completion_rate) : 2,
        changeLabel: t('scm.dashboard_page.k21'),
        color: 'primary',
      },
      {
        id: 'pendingInspection',
        title: t('scm.dashboard_page.k22'),
        value: overview?.pending_inspection_count?.toString() || '0',
        icon: <Package size={24} />,
        change: 0,
        changeLabel: t('scm.dashboard_page.k23'),
        color: 'error',
      },
      {
        id: 'monthAmount',
        title: t('scm.dashboard_page.k24'),
        value: `¥${(overview?.total_amount_month || 0).toLocaleString()}`,
        icon: <DollarSign size={24} />,
        change: 12,
        changeLabel: t('scm.dashboard_page.k25'),
        color: 'info',
      },
    ],
    [overview, t]
  );

  const charts: ChartCard[] = useMemo(
    () => [
      {
        id: 'purchase-volume',
        title: i18n.t('scm.dashboard_page.k26'),
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
        id: 'weekly-trend',
        title: i18n.t('scm.dashboard_page.k27'),
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
      {
        id: 'purchase-type',
        title: i18n.t('scm.dashboard_page.k28'),
        chart: (
          <LazyChart
            type='pie'
            data={pieData}
          />
        ),
        height: 300,
        type: 'pie',
      },
    ],
    [barData, lineData, pieData]
  );

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: 'new-supplier',
        label: i18n.t('scm.dashboard_page.k29'),
        icon: <ArrowRight size={18} />,
        onClick: () => navigate(SCM_PATHS.suppliers),
      },
    ],
    [navigate]
  );

  return (
    <PageContainer
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        stats={stats}
        charts={charts}
        quickActions={quickActions}
        quickActionsTitle={t('scm.dashboard_page.k30')}
        loading={loading}
      />
    </PageContainer>
  );
};

export default DashboardPage;
