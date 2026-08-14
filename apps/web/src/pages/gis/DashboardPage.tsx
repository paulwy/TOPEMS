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
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const iconMap: Record<string, React.ReactNode> = {
  FileText: <FileText size={24} />,
  Activity: <Activity size={24} />,
  Layers: <Layers size={24} />,
  MapPin: <MapPin size={24} />,
  Globe: <Globe size={24} />,
};

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return i18n.t('gis.dashboard_page.k0');
  if (hour < 18) return i18n.t('gis.dashboard_page.k1');
  return i18n.t('gis.dashboard_page.k2');
};

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation('gis');
  const navigate = useNavigate();

  const { data: statistics, isPending: loading } = useQuery<GisStatistics | null>({
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
        title: i18n.t('gis.dashboard_page.k3'),
        value: statistics.factory_maps.toString(),
        icon: iconMap.Layers,
        change: 0,
        changeLabel: 'vs 上周期',
        color: 'primary',
      },
      {
        id: 'location-data',
        title: i18n.t('gis.dashboard_page.k4'),
        value: statistics.device_points.toLocaleString(),
        icon: iconMap.MapPin,
        change: 0,
        changeLabel: 'vs 上周期',
        color: 'info',
      },
      {
        id: 'storage-locations',
        title: i18n.t('gis.dashboard_page.k5'),
        value: statistics.storage_locations.toLocaleString(),
        icon: iconMap.Activity,
        change: 0,
        changeLabel: 'vs 上周期',
        color: 'success',
      },
      {
        id: 'map-services',
        title: i18n.t('gis.dashboard_page.k6'),
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
      { name: i18n.t('gis.dashboard_page.k7'), value: statistics.device_points },
      { name: i18n.t('gis.dashboard_page.k8'), value: statistics.pipelines },
      { name: i18n.t('gis.dashboard_page.k9'), value: statistics.storage_locations },
      { name: i18n.t('gis.dashboard_page.k10'), value: statistics.business_locations },
      { name: i18n.t('gis.dashboard_page.k11'), value: statistics.factory_maps },
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
        title: i18n.t('gis.dashboard_page.k12'),
        chart: (
          <LazyChart
            type='bar'
            data={barData}
            xKey='name'
            yKey='value'
          />
        ),
        height: 300,
      },
      {
        id: 'quarterly-data-trend',
        title: i18n.t('gis.dashboard_page.k13'),
        chart: (
          <LazyChart
            type='line'
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
      label: t('gis.dashboard_page.k14'),
      icon: <ArrowRight size={18} />,
      onClick: () => navigate(GIS_PATHS.map),
    },
  ];

  return (
    <PageContainer
      title={t('gis.dashboard_page.k15')}
      subtitle={t('gis.dashboard_page.e1')}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        stats={stats}
        charts={charts}
        quickActions={quickActions}
        quickActionsTitle={t('gis.dashboard_page.k16')}
        loading={loading}
      />
    </PageContainer>
  );
};

export default DashboardPage;
