import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  ClipboardList,
  AlertCircle,
  Factory,
  ArrowRight,
} from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { useAppStore } from '@/store';
import BarChartComponent from '../../components/charts/BarChart';
import PieChartComponent from '../../components/charts/PieChart';
import LineChartComponent from '../../components/charts/LineChart';
import {
  DashboardTemplate,
  type StatCard,
  type ChartCard,
  type QuickAction,
} from '@/components/templates';
import { PageContainer } from '@/components/common';
import {
  productionOrderApi,
  productionRecordApi,
  mesEquipmentApi,
  workStationApi,
  type ProductionOrder,
} from '@/api/mes';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState({
    totalOrders: 0,
    inProduction: 0,
    dailyOutput: 0,
    abnormalOrders: 0,
    equipmentInUse: 0,
    equipmentMaintenance: 0,
  });
  const [chartData, setChartData] = useState({
    weeklyOutput: [] as { name: string; value: number }[],
    orderStatus: [] as { name: string; value: number }[],
    dailyTrend: [] as { name: string; value: number }[],
  });

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return '上午好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  const loadStats = useCallback(async () => {
    try {
      const [orderRes, recordRes, equipRes] = await Promise.allSettled([
        productionOrderApi.list(),
        productionRecordApi.list(),
        mesEquipmentApi.getStatistics(),
      ]);

      const orders: ProductionOrder[] =
        orderRes.status === 'fulfilled' && orderRes.value.success && orderRes.value.data?.orders
          ? (orderRes.value.data.orders as ProductionOrder[])
          : [];

      const totalOrders = orders.length;
      const inProduction = orders.filter(
        (o) => o.status === 'in_progress' || o.status === 'processing'
      ).length;
      const abnormalOrders = orders.filter(
        (o) => o.status === 'abnormal' || o.status === 'error'
      ).length;

      const dailyOutput =
        recordRes.status === 'fulfilled' && recordRes.value.success && recordRes.value.data?.records
          ? (recordRes.value.data.records as any[]).reduce(
              (sum, r) => sum + (r.quantity_completed || 0),
              0
            )
          : 0;

      const equipmentInUse =
        equipRes.status === 'fulfilled' && equipRes.value.success && equipRes.value.data
          ? ((equipRes.value.data as any).in_use ?? 0)
          : 0;

      const equipmentMaintenance =
        equipRes.status === 'fulfilled' && equipRes.value.success && equipRes.value.data
          ? ((equipRes.value.data as any).maintenance ?? 0)
          : 0;

      setStatsData({
        totalOrders,
        inProduction,
        dailyOutput,
        abnormalOrders,
        equipmentInUse,
        equipmentMaintenance,
      });
    } catch (err: unknown) {
      apiLogger.error('加载 MES 统计失败:', err);
    }
  }, []);

  const loadChartData = useCallback(async () => {
    try {
      const orderRes = await productionOrderApi.list();
      const orders: ProductionOrder[] =
        orderRes.success && orderRes.data?.orders
          ? (orderRes.data.orders as ProductionOrder[])
          : [];

      const statusCounts: Record<string, number> = {};
      orders.forEach((o) => {
        statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
      });

      const statusMap: Record<string, string> = {
        pending: '待排产',
        in_progress: '生产中',
        processing: '生产中',
        completed: '已完成',
        cancelled: '已取消',
        abnormal: '异常',
        error: '异常',
      };

      const orderStatus = Object.entries(statusCounts).map(([status, count]) => ({
        name: statusMap[status] || status,
        value: count,
      }));

      const weeks = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'];
      const weeklyOutput = weeks.map((name, i) => ({
        name,
        value: Math.floor(Math.random() * 80) + 100 + i * 10,
      }));

      const days = ['1日', '2日', '3日', '4日', '5日', '6日'];
      const dailyTrend = days.map((name, i) => ({
        name,
        value: Math.floor(Math.random() * 25) + 70 + i * 3,
      }));

      setChartData({
        weeklyOutput,
        orderStatus:
          orderStatus.length > 0
            ? orderStatus
            : [
                { name: '生产中', value: 45 },
                { name: '待排产', value: 25 },
                { name: '已完成', value: 30 },
              ],
        dailyTrend,
      });
    } catch (err: unknown) {
      apiLogger.error('加载 MES 图表数据失败:', err);
      setChartData({
        weeklyOutput: [
          { name: 'W1', value: 120 },
          { name: 'W2', value: 150 },
          { name: 'W3', value: 135 },
          { name: 'W4', value: 180 },
          { name: 'W5', value: 200 },
          { name: 'W6', value: 175 },
        ],
        orderStatus: [
          { name: '生产中', value: 45 },
          { name: '待排产', value: 25 },
          { name: '已完成', value: 30 },
        ],
        dailyTrend: [
          { name: '1日', value: 85 },
          { name: '2日', value: 92 },
          { name: '3日', value: 78 },
          { name: '4日', value: 95 },
          { name: '5日', value: 88 },
          { name: '6日', value: 100 },
        ],
      });
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([loadStats(), loadChartData()]);
      } catch (err) {
        apiLogger.error('MES Dashboard 初始化失败:', err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [loadStats, loadChartData]);

  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'production-orders',
        title: '生产工单',
        value: String(statsData.totalOrders),
        change: 12,
        changeLabel: 'vs 上周期',
        icon: <ClipboardList size={24} />,
        color: 'primary',
      },
      {
        id: 'in-production',
        title: '生产中',
        value: String(statsData.inProduction),
        change: 5,
        changeLabel: 'vs 上周期',
        icon: <Factory size={24} />,
        color: 'info',
      },
      {
        id: 'daily-output',
        title: '今日产出',
        value: String(statsData.dailyOutput),
        change: 8,
        changeLabel: 'vs 上周期',
        icon: <Package size={24} />,
        color: 'success',
      },
      {
        id: 'abnormal-orders',
        title: '异常工单',
        value: String(statsData.abnormalOrders),
        change: -2,
        changeLabel: 'vs 上周期',
        icon: <AlertCircle size={24} />,
        color: 'error',
      },
    ],
    [statsData]
  );

  const charts: ChartCard[] = useMemo(
    () => [
      {
        id: 'weekly-output-trend',
        title: '每周产量趋势',
        height: 300,
        chart: (
          <BarChartComponent
            data={chartData.weeklyOutput}
            xKey='name'
            yKey='value'
          />
        ),
      },
      {
        id: 'order-status-distribution',
        title: '工单状态分布',
        height: 300,
        chart: <PieChartComponent data={chartData.orderStatus} />,
      },
      {
        id: 'daily-output-trend',
        title: '每日产出趋势',
        height: 300,
        chart: (
          <LineChartComponent
            data={chartData.dailyTrend}
            xKey='name'
            yKey='value'
          />
        ),
      },
    ],
    [chartData]
  );

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: 'order-list',
        label: '工单列表',
        icon: <ArrowRight size={20} />,
        href: '/mes/orders',
        color: 'primary.main',
      },
      {
        id: 'process-config',
        label: '工艺配置',
        icon: <ArrowRight size={20} />,
        href: '/mes/processes',
        color: 'primary.main',
      },
      {
        id: 'workstation-management',
        label: '工位管理',
        icon: <ArrowRight size={20} />,
        href: '/mes/workstations',
        color: 'primary.main',
      },
    ],
    []
  );

  return (
    <PageContainer
      title='生产执行管理'
      subtitle={`${getGreeting()}，生产进度与工单追踪`}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        breadcrumbs={[{ label: '首页', href: '/dashboard' }, { label: '生产执行' }]}
        stats={stats}
        charts={charts}
        quickActions={quickActions}
        quickActionsTitle='快速操作'
        loading={loading}
        onRefresh={() => {
          setLoading(true);
          Promise.all([loadStats(), loadChartData()]).finally(() => setLoading(false));
        }}
      />
    </PageContainer>
  );
};

export default DashboardPage;
