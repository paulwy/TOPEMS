import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, FileText, ArrowRight, ShoppingCart, RefreshCw, Truck, ClipboardCheck, TrendingUp, DollarSign, Package } from 'lucide-react';
import BarChartComponent from '../../components/charts/BarChart';
import LineChartComponent from '../../components/charts/LineChart';
import PieChartComponent from '../../components/charts/PieChart';
import {
  DashboardTemplate,
  type StatCard,
  type ChartCard,
  type QuickAction,
} from '@/components/templates';
import { scmApi } from '@/api/scm';
import type { SupplyChainOverview, SupplyChainFullLinkStat, MrpPlan, IncomingInspection, InventoryTurnoverStat, PriceComparison } from '@/api/scm';
import { useAppStore } from '@/store';
import { apiLogger } from '@/utils/logger';

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
  const { addNotification } = useAppStore();
  
  const [loading, setLoading] = useState(true);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [mrpLoading, setMrpLoading] = useState(true);
  const [inspectionLoading, setInspectionLoading] = useState(true);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [priceLoading, setPriceLoading] = useState(true);

  const [overview, setOverview] = useState<SupplyChainOverview | null>(null);
  const [fullLinkStats, setFullLinkStats] = useState<SupplyChainFullLinkStat | null>(null);
  const [mrpPlans, setMrpPlans] = useState<MrpPlan[]>([]);
  const [incomingInspections, setIncomingInspections] = useState<IncomingInspection[]>([]);
  const [inventoryTurnover, setInventoryTurnover] = useState<InventoryTurnoverStat[]>([]);
  const [priceComparisons, setPriceComparisons] = useState<PriceComparison[]>([]);

  const loadOverview = useCallback(async () => {
    try {
      setOverviewLoading(true);
      const [overviewRes, fullLinkRes] = await Promise.all([
        scmApi.supplyChainDashboard.overview(),
        scmApi.supplyChainDashboard.fullLinkStats(),
      ]);
      if (overviewRes.success && overviewRes.data) {
        setOverview(overviewRes.data);
      }
      if (fullLinkRes.success && fullLinkRes.data) {
        setFullLinkStats(fullLinkRes.data);
      }
    } catch (error: unknown) {
      apiLogger.error('加载供应链看板失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载供应链看板数据',
      });
    } finally {
      setOverviewLoading(false);
    }
  }, [addNotification]);

  const loadMrpPlans = useCallback(async () => {
    try {
      setMrpLoading(true);
      const response = await scmApi.mrpPlans.list({ page: 1, pageSize: 5 });
      if (response.success && response.data) {
        setMrpPlans(response.data.items || []);
      }
    } catch (error: unknown) {
      apiLogger.error('加载MRP计划失败:', error);
    } finally {
      setMrpLoading(false);
    }
  }, []);

  const loadIncomingInspections = useCallback(async () => {
    try {
      setInspectionLoading(true);
      const response = await scmApi.incomingInspections.list({ page: 1, pageSize: 5 });
      if (response.success && response.data) {
        setIncomingInspections(response.data.items || []);
      }
    } catch (error: unknown) {
      apiLogger.error('加载到货检验失败:', error);
    } finally {
      setInspectionLoading(false);
    }
  }, []);

  const loadInventoryTurnover = useCallback(async () => {
    try {
      setInventoryLoading(true);
      const response = await scmApi.inventoryTurnover.list({ page: 1, pageSize: 5 });
      if (response.success && response.data) {
        setInventoryTurnover(response.data.items || []);
      }
    } catch (error: unknown) {
      apiLogger.error('加载库存周转失败:', error);
    } finally {
      setInventoryLoading(false);
    }
  }, []);

  const loadPriceComparisons = useCallback(async () => {
    try {
      setPriceLoading(true);
      const response = await scmApi.priceComparisons.list({ page: 1, pageSize: 5 });
      if (response.success && response.data) {
        setPriceComparisons(response.data.items || []);
      }
    } catch (error: unknown) {
      apiLogger.error('加载价格比价失败:', error);
    } finally {
      setPriceLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadAllData = async () => {
      await Promise.all([
        loadOverview(),
        loadMrpPlans(),
        loadIncomingInspections(),
        loadInventoryTurnover(),
        loadPriceComparisons(),
      ]);
      setLoading(false);
    };
    loadAllData();
  }, [loadOverview, loadMrpPlans, loadIncomingInspections, loadInventoryTurnover, loadPriceComparisons]);

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
        change: overview?.total_suppliers ? Math.round((overview.active_suppliers / overview.total_suppliers) * 100) : 5,
        changeLabel: '活跃占比',
        color: 'primary',
      },
      {
        id: 'orders',
        title: '采购订单',
        value: overview?.pending_orders?.toString() || '45',
        icon: <ShoppingCart size={24} />,
        change: overview?.total_purchase_orders ? Math.round((overview.pending_orders / overview.total_purchase_orders) * 100) : 8,
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
        onClick: () => navigate('/scm/suppliers/create'),
      },
      {
        id: 'create-order',
        label: '创建采购单',
        icon: <ArrowRight size={18} />,
        onClick: () => navigate('/scm/purchasing/create'),
      },
      {
        id: 'mrp-plan',
        label: 'MRP计划',
        icon: <ArrowRight size={18} />,
        onClick: () => navigate('/scm/mrp-plans'),
      },
      {
        id: 'incoming-inspection',
        label: '到货检验',
        icon: <ArrowRight size={18} />,
        onClick: () => navigate('/scm/incoming-inspections'),
      },
      {
        id: 'inventory-turnover',
        label: '库存周转',
        icon: <ArrowRight size={18} />,
        onClick: () => navigate('/scm/inventory-turnover'),
      },
      {
        id: 'price-comparison',
        label: '价格比价',
        icon: <ArrowRight size={18} />,
        onClick: () => navigate('/scm/price-comparisons'),
      },
    ],
    [navigate]
  );

  return (
    <DashboardTemplate
      title='供应链管理'
      subtitle={`${getGreeting()}，供应商与物流追踪`}
      breadcrumbs={[{ label: '首页', href: '/dashboard' }, { label: '供应链' }]}
      stats={stats}
      charts={charts}
      quickActions={quickActions}
      quickActionsTitle='快捷操作'
      loading={loading}
    />
  );
};

export default DashboardPage;
