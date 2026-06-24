import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { Button } from '@mui/material';
import { QuickSearch } from '@/components/common';
import { Warehouse, Package, AlertCircle, ArrowRight, Truck } from 'lucide-react';
import BarChartComponent from '../../components/charts/BarChart';
import PieChartComponent from '../../components/charts/PieChart';
import LineChartComponent from '../../components/charts/LineChart';
import {
  DashboardTemplate,
  type StatCard,
  type ChartCard,
  type QuickAction,
} from '@/components/templates';

const barData = [
  { name: 'A区', value: 1200 },
  { name: 'B区', value: 980 },
  { name: 'C区', value: 1500 },
  { name: 'D区', value: 750 },
  { name: 'E区', value: 1100 },
  { name: 'F区', value: 620 },
];
const pieData = [
  { name: '原材料', value: 35 },
  { name: '成品', value: 45 },
  { name: '半成品', value: 20 },
];
const lineData = [
  { name: '周一', value: 85 },
  { name: '周二', value: 92 },
  { name: '周三', value: 78 },
  { name: '周四', value: 95 },
  { name: '周五', value: 88 },
  { name: '周六', value: 45 },
];

const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  Warehouse,
  Package,
  AlertCircle,
  Truck,
};

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
        id: 'warehouses',
        title: '仓库数量',
        value: '6',
        icon: <Warehouse size={24} />,
        change: 1,
        changeLabel: '较上周期',
        color: 'primary',
      },
      {
        id: 'inventory',
        title: '库存总量',
        value: '6,150',
        icon: <Package size={24} />,
        change: 320,
        changeLabel: '较上周期',
        color: 'success',
      },
      {
        id: 'inbound',
        title: '今日入库',
        value: '128',
        icon: <Truck size={24} />,
        change: 25,
        changeLabel: '较上周期',
        color: 'info',
      },
      {
        id: 'alerts',
        title: '库存预警',
        value: '5',
        icon: <AlertCircle size={24} />,
        change: -3,
        changeLabel: '较上周期',
        color: 'warning',
      },
    ],
    []
  );

  const charts: ChartCard[] = useMemo(
    () => [
      {
        id: 'inventory-distribution',
        title: '各仓库库存分布',
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
        id: 'inventory-type',
        title: '库存类型分布',
        chart: <PieChartComponent data={pieData} />,
        height: 300,
        type: 'pie',
      },
      {
        id: 'daily-trend',
        title: '每日出入库趋势',
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
    ],
    []
  );

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: 'inbound',
        label: '入库登记',
        icon: <ArrowRight size={16} />,
        onClick: () => navigate('/wms/inbound-orders/create'),
      },
      {
        id: 'outbound',
        label: '出库登记',
        icon: <ArrowRight size={16} />,
        onClick: () => navigate('/wms/outbound-orders/create'),
      },
      {
        id: 'inventory',
        label: '库存查询',
        icon: <ArrowRight size={16} />,
        onClick: () => navigate('/wms/inventory'),
      },
      {
        id: 'warehouse-settings',
        label: '仓库设置',
        icon: <ArrowRight size={16} />,
        onClick: () => navigate('/wms/warehouses'),
      },
    ],
    [navigate]
  );

  const headerContent = useMemo(
    () => (
      <QuickSearch
        placeholder='搜索仓储内容...'
        onSearch={(query) => {
          navigate(`/wms/inventory?search=${encodeURIComponent(query)}`);
        }}
        width={320}
      />
    ),
    [navigate]
  );

  return (
    <DashboardTemplate
      title='仓储管理'
      subtitle={`${getGreeting()}，仓库库存与物流概览`}
      breadcrumbs={[{ label: '首页', href: '/dashboard' }, { label: '仓储' }]}
      stats={stats}
      charts={charts}
      quickActions={quickActions}
      quickActionsTitle='快速操作'
      loading={loading}
      headerContent={headerContent}
    />
  );
};

export default DashboardPage;
