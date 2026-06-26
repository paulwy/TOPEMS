import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowRight, Activity, Layers, MapPin, Globe } from 'lucide-react';
import { DashboardTemplate } from '@/components/templates';
import type { StatCard, ChartCard, QuickAction } from '@/components/templates';
import BarChartComponent from '../../components/charts/BarChart';
import LineChartComponent from '../../components/charts/LineChart';
import PieChartComponent from '../../components/charts/PieChart';

const iconMap: Record<string, React.ReactNode> = {
  FileText: <FileText size={24} />,
  Activity: <Activity size={24} />,
  Layers: <Layers size={24} />,
  MapPin: <MapPin size={24} />,
  Globe: <Globe size={24} />,
};

const barData = [
  { name: '北京', value: 520 },
  { name: '上海', value: 480 },
  { name: '广州', value: 350 },
  { name: '深圳', value: 320 },
  { name: '成都', value: 280 },
];
const pieData = [
  { name: '道路', value: 30 },
  { name: '建筑', value: 25 },
  { name: '绿地', value: 20 },
  { name: '水域', value: 15 },
  { name: '其他', value: 10 },
];
const lineData = [
  { name: 'Q1', value: 400 },
  { name: 'Q2', value: 520 },
  { name: 'Q3', value: 480 },
  { name: 'Q4', value: 600 },
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
      id: 'layer-count',
      title: '图层数量',
      value: '15',
      icon: iconMap.Layers,
      change: 3,
      changeLabel: 'vs 上周期',
      color: 'primary',
    },
    {
      id: 'location-data',
      title: '点位数据',
      value: '2,345',
      icon: iconMap.MapPin,
      change: 128,
      changeLabel: 'vs 上周期',
      color: 'info',
    },
    {
      id: 'analysis-tasks',
      title: '分析任务',
      value: '8',
      icon: iconMap.Activity,
      change: 2,
      changeLabel: 'vs 上周期',
      color: 'success',
    },
    {
      id: 'map-services',
      title: '地图服务',
      value: '5',
      icon: iconMap.Globe,
      change: 0,
      changeLabel: 'vs 上周期',
      color: 'warning',
    },
  ];

  const charts: ChartCard[] = [
    {
      id: 'city-data-distribution',
      title: '城市数据分布',
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
      id: 'quarterly-data-trend',
      title: '季度数据趋势',
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

  const quickActions: QuickAction[] = [
    {
      id: 'view-map',
      label: '查看地图',
      icon: <ArrowRight size={18} />,
      onClick: () => navigate('/gis/map'),
    },
  ];

  return (
    <DashboardTemplate
      title='地理信息系统'
      subtitle={`${getGreeting()}，地图视图与空间分析`}
      stats={stats}
      charts={charts}
      quickActions={quickActions}
      quickActionsTitle='快捷操作'
      loading={loading}
    />
  );
};

export default DashboardPage;
