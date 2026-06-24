import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { Button } from '@mui/material';
import { Package, ClipboardList, AlertCircle, Factory, ArrowRight } from 'lucide-react';
import BarChartComponent from '../../components/charts/BarChart';
import PieChartComponent from '../../components/charts/PieChart';
import LineChartComponent from '../../components/charts/LineChart';
import {
  DashboardTemplate,
  type StatCard,
  type ChartCard,
  type QuickAction,
} from '@/components/templates';

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Package,
  ClipboardList,
  AlertCircle,
  Factory,
};

const barData = [
  { name: 'W1', value: 120 },
  { name: 'W2', value: 150 },
  { name: 'W3', value: 135 },
  { name: 'W4', value: 180 },
  { name: 'W5', value: 200 },
  { name: 'W6', value: 175 },
];
const pieData = [
  { name: '生产中', value: 45 },
  { name: '待排产', value: 25 },
  { name: '已完成', value: 30 },
];
const lineData = [
  { name: '1日', value: 85 },
  { name: '2日', value: 92 },
  { name: '3日', value: 78 },
  { name: '4日', value: 95 },
  { name: '5日', value: 88 },
  { name: '6日', value: 100 },
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

  const stats: StatCard[] = [
    {
      id: 'production-orders',
      title: '生产工单',
      value: '128',
      change: 12,
      changeLabel: 'vs 上周期',
      icon: <ClipboardList size={24} />,
      color: 'primary',
    },
    {
      id: 'in-production',
      title: '生产中',
      value: '24',
      change: 5,
      changeLabel: 'vs 上周期',
      icon: <Factory size={24} />,
      color: 'info',
    },
    {
      id: 'daily-output',
      title: '今日产出',
      value: '1,580',
      change: 8,
      changeLabel: 'vs 上周期',
      icon: <Package size={24} />,
      color: 'success',
    },
    {
      id: 'abnormal-orders',
      title: '异常工单',
      value: '3',
      change: -2,
      changeLabel: 'vs 上周期',
      icon: <AlertCircle size={24} />,
      color: 'error',
    },
  ];

  const charts: ChartCard[] = [
    {
      id: 'weekly-output-trend',
      title: '每周产量趋势',
      height: 300,
      chart: (
        <BarChartComponent
          data={barData}
          xKey='name'
          yKey='value'
        />
      ),
    },
    {
      id: 'order-status-distribution',
      title: '工单状态分布',
      height: 300,
      chart: <PieChartComponent data={pieData} />,
    },
    {
      id: 'daily-output-trend',
      title: '每日产出趋势',
      height: 300,
      chart: (
        <LineChartComponent
          data={lineData}
          xKey='name'
          yKey='value'
        />
      ),
    },
  ];

  const quickActions: QuickAction[] = [
    {
      id: 'create-order',
      label: '创建工单',
      icon: <ArrowRight size={20} />,
      href: '/mes/orders/create',
      color: 'primary.main',
    },
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
  ];

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography sx={{ fontSize: '1.125rem', color: 'grey.600' }}>加载中...</Typography>
      </Box>
    );
  }

  return (
    <DashboardTemplate
      title='生产执行管理'
      subtitle={`${getGreeting()}，生产进度与工单追踪`}
      breadcrumbs={[{ label: '首页', href: '/dashboard' }, { label: '生产执行' }]}
      stats={stats}
      charts={charts}
      quickActions={quickActions}
      quickActionsTitle='快速操作'
    />
  );
};

export default DashboardPage;
