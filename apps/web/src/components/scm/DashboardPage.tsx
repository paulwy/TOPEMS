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
  AlertTriangle,
  Warehouse,
  Inbox,
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
  SupplyChainRealTimeStatus,
  MrpPlan,
  IncomingInspection,
  InventoryTurnoverStat,
  InventoryTurnoverDaysStat,
  PriceComparison,
} from '@/api/scm';
import { SCM_PATHS } from '@/module-configs/scm/config';
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

  const { data: realtime } = useQuery({
    queryKey: QUERY_KEYS.SCM.REAL_TIME_STATUS,
    queryFn: async () => {
      const response = await scmApi.supplyChainDashboard.realTimeStatus();
      if (response.success && response.data) {
        return response.data as SupplyChainRealTimeStatus;
      }
      return null;
    },
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
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
      // 后端 /incoming-inspections list 返回 { inspections, total, page, page_size }
      // （非共享 PaginatedResponse 的 items），此处对齐实际契约。
      if (response.success && response.data) {
        return (
          (response.data as unknown as { inspections?: IncomingInspection[] }).inspections ?? []
        );
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

  // C8 接线：GET /inventory-turnover/days 整体库存周转统计（近 90 天默认窗口）
  const { data: turnoverDaysStat, isPending: turnoverDaysLoading } = useQuery({
    queryKey: [QUERY_KEYS.SCM.INVENTORY_TURNOVER, 'days'],
    queryFn: async () => {
      const response = await scmApi.inventoryTurnover.days();
      if (response.success && response.data) {
        return response.data as InventoryTurnoverDaysStat;
      }
      return null;
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
    overviewLoading ||
    mrpLoading ||
    inspectionLoading ||
    inventoryLoading ||
    turnoverDaysLoading ||
    priceLoading;

  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'suppliers',
        title: i18n.t('scm.dashboard_page.k10'),
        value: (
          (overview as unknown as { suppliers?: { active_count?: number } })?.suppliers
            ?.active_count ??
          overview?.active_suppliers ??
          0
        ).toString(),
        icon: <Users size={24} />,
        color: 'primary',
      },
      {
        id: 'orders',
        title: i18n.t('scm.dashboard_page.k12'),
        value:
          realtime?.pending_purchase_orders?.toString() ??
          overview?.pending_orders?.toString() ??
          '0',
        icon: <ShoppingCart size={24} />,
        color: 'success',
      },
      {
        id: 'pendingInbound',
        title: i18n.t('scm.dashboard_page.k31'),
        value: realtime?.pending_inbound_orders?.toString() ?? '0',
        icon: <Inbox size={24} />,
        color: 'info',
      },
      {
        id: 'pendingOutbound',
        title: i18n.t('scm.dashboard_page.k33'),
        value: realtime?.pending_outbound_orders?.toString() ?? '0',
        icon: <Warehouse size={24} />,
        color: 'info',
      },
      {
        id: 'lowStock',
        title: i18n.t('scm.dashboard_page.k35'),
        value: realtime?.low_stock_items?.toString() ?? '0',
        icon: <AlertTriangle size={24} />,
        color: 'error',
      },
      {
        id: 'turnover',
        title: i18n.t('scm.dashboard_page.k14'),
        value: overview?.inventory_turnover_rate?.toFixed(1) ?? '0',
        icon: <RefreshCw size={24} />,
        color: 'info',
      },
      {
        id: 'turnoverDays',
        title: i18n.t('scm.dashboard_page.k37'),
        value: turnoverDaysStat
          ? `${turnoverDaysStat.overall_turnover_days.toFixed(0)} ${i18n.t(
              'scm.dashboard_page.k39'
            )}`
          : '—',
        icon: <RefreshCw size={24} />,
        color: 'info',
      },
      {
        id: 'quality',
        title: i18n.t('scm.dashboard_page.k16'),
        value: `${overview?.quality_pass_rate || 0}%`,
        icon: <ClipboardCheck size={24} />,
        color: 'warning',
      },
      {
        id: 'delivery',
        title: i18n.t('scm.dashboard_page.k18'),
        value: `${overview?.on_time_delivery_rate || 0}%`,
        icon: <Truck size={24} />,
        color: 'success',
      },
      {
        id: 'completion',
        title: t('scm.dashboard_page.k20'),
        value: `${overview?.order_completion_rate || 0}%`,
        icon: <TrendingUp size={24} />,
        color: 'primary',
      },
      {
        id: 'pendingInspection',
        title: t('scm.dashboard_page.k22'),
        value:
          realtime?.pending_inspections?.toString() ??
          overview?.pending_inspection_count?.toString() ??
          '0',
        icon: <Package size={24} />,
        color: 'error',
      },
      {
        id: 'monthAmount',
        title: t('scm.dashboard_page.k24'),
        value: `¥${(overview?.total_amount_month || 0).toLocaleString()}`,
        icon: <DollarSign size={24} />,
        color: 'info',
      },
    ],
    [overview, turnoverDaysStat, t]
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
        autoTitle={false}
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
