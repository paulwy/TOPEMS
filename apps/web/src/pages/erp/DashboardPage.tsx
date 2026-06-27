import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  FileText,
  Wallet,
  Package,
  BarChart3,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { DashboardTemplate } from '@/components/templates';
import type { StatCard, ChartCard, QuickAction } from '@/components/templates';
import { PageContainer } from '@/components/common';
import BarChartComponent from '../../components/charts/BarChart';
import LineChartComponent from '../../components/charts/LineChart';
import PieChartComponent from '../../components/charts/PieChart';

const iconMap: Record<string, React.ReactNode> = {
  TrendingUp: <TrendingUp size={24} />,
  FileText: <FileText size={24} />,
  Wallet: <Wallet size={24} />,
  Package: <Package size={24} />,
};

const barData = [
  { name: '1月', value: 4000 },
  { name: '2月', value: 3000 },
  { name: '3月', value: 5000 },
  { name: '4月', value: 4500 },
  { name: '5月', value: 6000 },
  { name: '6月', value: 5500 },
];
const pieData = [
  { name: '原材料', value: 45 },
  { name: '成品', value: 35 },
  { name: '半成品', value: 20 },
];
const lineData = [
  { name: '周一', value: 120 },
  { name: '周二', value: 130 },
  { name: '周三', value: 110 },
  { name: '周四', value: 140 },
  { name: '周五', value: 160 },
  { name: '周六', value: 90 },
  { name: '周日', value: 80 },
];

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return '上午好';
  if (hour < 18) return '下午好';
  return '晚上好';
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const stats: StatCard[] = [
    {
      id: 'total-assets',
      title: '总资产',
      value: '¥12,580,000',
      icon: iconMap.TrendingUp,
      change: 8.5,
      changeLabel: '% vs 上周期',
      color: 'success',
    },
    {
      id: 'monthly-income',
      title: '本月收入',
      value: '¥2,340,000',
      icon: iconMap.Wallet,
      change: 12,
      changeLabel: '% vs 上周期',
      color: 'info',
    },
    {
      id: 'inventory-total',
      title: '库存总量',
      value: '15,680',
      icon: iconMap.Package,
      change: -3,
      changeLabel: '% vs 上周期',
      color: 'warning',
    },
    {
      id: 'pending-orders',
      title: '待审批订单',
      value: '23',
      icon: iconMap.FileText,
      change: 5,
      changeLabel: 'vs 上周期',
      color: 'primary',
    },
  ];

  const charts: ChartCard[] = [
    {
      id: 'data-overview',
      title: '数据概览',
      chart: (
        <BarChartComponent
          data={barData}
          xKey='name'
          yKey='value'
        />
      ),
      height: 300,
    },
    {
      id: 'trend-analysis',
      title: '趋势分析',
      chart: (
        <LineChartComponent
          data={lineData}
          xKey='name'
          yKey='value'
        />
      ),
      height: 300,
    },
  ];

  const quickActions: QuickAction[] = [];

  return (
    <PageContainer
      title='企业资源管理'
      subtitle={`${getGreeting()}，财务管理与库存概览`}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
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
