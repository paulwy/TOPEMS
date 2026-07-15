import React, { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  FileText,
  ArrowRight,
  ShoppingCart,
  RefreshCw,
  Truck,
  ClipboardCheck,
  TrendingUp,
  DollarSign,
  Package,
} from 'lucide-react';
import BarChartComponent from '../../components/charts/BarChart';
import LineChartComponent from '../../components/charts/LineChart';
import PieChartComponent from '../../components/charts/PieChart';
import {
  DashboardTemplate,
  type StatCard,
  type ChartCard,
  type QuickAction,
} from '@/components/templates';
import { PageContainer } from '@/components/common';
import { scmApi } from '@/api/scm';
import type {
  SupplyChainOverview,
  SupplyChainFullLinkStat,
  MrpPlan,
  IncomingInspection,
  InventoryTurnoverStat,
  PriceComparison,
} from '@/api/scm';
import { SCM_PATHS } from '@/modules/scm/config';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';

const barData = [
  { name: '供应商A', value: 35 },
  { name: '供应商B', value: 28 },
  { name: '供应商C', value: 22 },
  { name: '供应商D', value: 15 },
];
const pieData = [
  { name: '原材料', value: 50 },
  { name: '配件', value: 30 },
  { name: '设备', value: 20 },
];
const lineData = [
  { name: '1周', value: 8 },
  { name: '2周', value: 12 },
  { name: '3周', value: 10 },
  { name: '4周', value: 15 },
  { name: '5周', value: 11 },
  { name: '6周', value: 14 },
];

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const { data: overview, isLoading: overviewLoading } = useQuery({
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

  const { data: fullLinkStats } = useQuery({
    queryKey: QUERY_KEYS.SCM.FULL_LINK_STATS,
    queryFn: async () => {
      const response = await scmApi.supplyChainDashboard.fullLinkStats();
      if (response.success && response.data) {
        return response.data as SupplyChainFullLinkStat;
      }
      return null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: mrpPlans, isLoading: mrpLoading } = useQuery({
    queryKey: QUERY_KEYS.SCM.MRP_PLANS,
    queryFn: async () => {
      const response = await scmApi.mrpPlans.list({ page: 1, pageSize: 5 });
      if (response.success && response.data) {
        return response.data.items as MrpPlan[];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: incomingInspections, isLoading: inspectionLoading } = useQuery({
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

  const { data: inventoryTurnover, isLoading: inventoryLoading } = useQuery({
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

  const { data: priceComparisons, isLoading: priceLoading } = useQuery({
    queryKey: QUERY_KEYS.SCM.PRICE_COMPARISONS,
    queryFn: async () => {
      const response = await scmApi.priceComparisons.list({ page: 1, pageSize: 5 });
      if (response.success && response.data) {
        return response.data.items as PriceComparison[];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const loading =
    overviewLoading || mrpLoading || inspectionLoading || inventoryLoading || priceLoading;

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return '上午好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'suppliers',
        title: '供应商',
        value: overview?.active_suppliers?.toString() || '128',
        icon: <Users size={24} />,
        change: overview?.total_suppliers
          ? Math.round((overview.active_suppliers / overview.total_suppliers) * 100)
          : 5,
        changeLabel: '活跃占比',
        color: 'primary',
      },
      {
        id: 'orders',
        title: '采购订单',
        value: overview?.pending_orders?.toString() || '45',
        icon: <ShoppingCart size={24} />,
        change: overview?.total_purchase_orders
          ? Math.round((overview.pending_orders / overview.total_purchase_orders) * 100)
          : 8,
        changeLabel: '待处理',
        color: 'success',
      },
      {
        id: 'turnover',
        title: '库存周转率',
        value: overview?.inventory_turnover_rate?.toFixed(1) || '4.2',
        icon: <RefreshCw size={24} />,
        change: 0.3,
        changeLabel: '较上周期',
        color: 'info',
      },
      {
        id: 'quality',
        title: '质检合格率',
        value: `${overview?.quality_pass_rate || 0}%`,
        icon: <ClipboardCheck size={24} />,
        change: overview?.quality_pass_rate ? Math.round(overview.quality_pass_rate) : 5,
        changeLabel: '本月',
        color: 'warning',
      },
      {
        id: 'delivery',
        title: '准时交付率',
        value: `${overview?.on_time_delivery_rate || 0}%`,
        icon: <Truck size={24} />,
        change: overview?.on_time_delivery_rate ? Math.round(overview.on_time_delivery_rate) : 3,
        changeLabel: '本月',
        color: 'success',
      },
      {
        id: 'completion',
        title: '订单完成率',
        value: `${overview?.order_completion_rate || 0}%`,
        icon: <TrendingUp size={24} />,
        change: overview?.order_completion_rate ? Math.round(overview.order_completion_rate) : 2,
        changeLabel: '本月',
        color: 'primary',
      },
      {
        id: 'pendingInspection',
        title: '待检验',
        value: overview?.pending_inspection_count?.toString() || '0',
        icon: <Package size={24} />,
        change: 0,
        changeLabel: '今日',
        color: 'error',
      },
      {
        id: 'monthAmount',
        title: '本月采购额',
        value: `¥${(overview?.total_amount_month || 0).toLocaleString()}`,
        icon: <DollarSign size={24} />,
        change: 12,
        changeLabel: '较上月',
        color: 'info',
      },
    ],
    [overview]
  );

  const charts: ChartCard[] = useMemo(
    () => [
      {
        id: 'purchase-volume',
        title: '供应商采购量',
        chart: (
          <BarChartComponent
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
        title: '每周采购趋势',
        chart: (
          <LineChartComponent
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
        title: '采购类型分布',
        chart: <PieChartComponent data={pieData} />,
        height: 300,
        type: 'pie',
      },
    ],
    []
  );

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: 'new-supplier',
        label: '新增供应商',
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
        quickActionsTitle='快捷操作'
        loading={loading}
      />
    </PageContainer>
  );
};

export default DashboardPage;
