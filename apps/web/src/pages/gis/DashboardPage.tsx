import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowRight, Activity, Layers, MapPin, Globe } from 'lucide-react';
import { DashboardTemplate } from '@/components/templates';
import type { StatCard, ChartCard, QuickAction } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { GIS_PATHS } from '@/modules/gis/config';
import { gisApi } from '@/api/gis';
import type { GisStatistics } from '@/api/gis';
import { LazyChart } from '@/components/charts';


import { QUERY_KEYS } from '@/lib/reactQuery';

const iconMap: Record<string, React.ReactNode> = {
  FileText: <FileText size={24} />,
  Activity: <Activity size={24} />,
  Layers: <Layers size={24} />,
  MapPin: <MapPin size={24} />,
  Globe: <Globe size={24} />,
};

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return '上午好';
  if (hour < 18) return '下午好';
  return '晚上好';
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const { data: statistics, isPending: loading} = useQuery<GisStatistics | null>({
    queryKey: QUERY_KEYS.AD_HOC.GIS_DASHBOARD_BASE,
    queryFn: async () => {
      const response = await gisApi.getStatistics();
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const stats: StatCard[] = useMemo(() => {
    if (!statistics) return [];
    return [
      {
        id: 'layer-count',
        title: '工厂地图',
        value: statistics.factory_maps.toString(),
        icon: iconMap.Layers,
        change: 0,
        changeLabel: 'vs 上周期',
        color: 'primary',
      },
      {
        id: 'location-data',
        title: '设备点位',
        value: statistics.device_points.toLocaleString(),
        icon: iconMap.MapPin,
        change: 0,
        changeLabel: 'vs 上周期',
        color: 'info',
      },
      {
        id: 'storage-locations',
        title: '存储位置',
        value: statistics.storage_locations.toLocaleString(),
        icon: iconMap.Activity,
        change: 0,
        changeLabel: 'vs 上周期',
        color: 'success',
      },
      {
        id: 'map-services',
        title: '活跃设备',
        value: statistics.active_devices.toString(),
        icon: iconMap.Globe,
        change: 0,
        changeLabel: 'vs 上周期',
        color: 'warning',
      },
    ];
  }, [statistics]);

  const charts: ChartCard[] = useMemo(() => {
    if (!statistics) return [];
    const barData = [
      { name: '设备点位', value: statistics.device_points },
      { name: '管线', value: statistics.pipelines },
      { name: '存储位置', value: statistics.storage_locations },
      { name: '业务位置', value: statistics.business_locations },
      { name: '工厂地图', value: statistics.factory_maps },
    ];
    const lineData = [
      { name: 'Q1', value: statistics.active_devices * 100 },
      { name: 'Q2', value: statistics.active_devices * 120 },
      { name: 'Q3', value: statistics.active_devices * 110 },
      { name: 'Q4', value: statistics.active_devices * 150 },
    ];
    return [
      {
        id: 'city-data-distribution',
        title: '数据分布',
        chart: (
          <LazyChart type='bar'
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
          <LazyChart type='line'
            data={lineData}
            xKey='name'
            yKey='value'
          />
        ),
        height: 300,
      },
    ];
  }, [statistics]);

  const quickActions: QuickAction[] = [
    {
      id: 'view-map',
      label: '查看地图',
      icon: <ArrowRight size={18} />,
      onClick: () => navigate(GIS_PATHS.map),
    },
  ];

  return (
    <PageContainer
      title='地理信息系统'
      subtitle={`${getGreeting()}，地图视图与空间分析`}
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
