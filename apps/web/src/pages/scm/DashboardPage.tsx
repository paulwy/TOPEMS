import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, FileText, ArrowRight, ShoppingCart, RefreshCw, Truck } from 'lucide-react';
import BarChartComponent from '../../components/charts/BarChart';
import LineChartComponent from '../../components/charts/LineChart';
import PieChartComponent from '../../components/charts/PieChart';
import {
  DashboardTemplate,
  type StatCard,
  type ChartCard,
  type QuickAction,
} from '@/components/templates';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

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
        value: '128',
        icon: <Users size={24} />,
        change: 5,
        changeLabel: '较上周期',
        color: 'primary',
      },
      {
        id: 'orders',
        title: '采购订单',
        value: '45',
        icon: <ShoppingCart size={24} />,
        change: 8,
        changeLabel: '较上周期',
        color: 'success',
      },
      {
        id: 'turnover',
        title: '库存周转率',
        value: '4.2',
        icon: <RefreshCw size={24} />,
        change: 0.3,
        changeLabel: '较上周期',
        color: 'info',
      },
      {
        id: 'transit',
        title: '运输中',
        value: '12',
        icon: <Truck size={24} />,
        change: 3,
        changeLabel: '较上周期',
        color: 'warning',
      },
    ],
    []
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
        id: 'warehouse',
        label: '仓库管理',
        icon: <ArrowRight size={18} />,
        onClick: () => navigate('/scm/warehouse'),
      },
      {
        id: 'logistics',
        label: '物流追踪',
        icon: <ArrowRight size={18} />,
        onClick: () => navigate('/scm/logistics'),
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
