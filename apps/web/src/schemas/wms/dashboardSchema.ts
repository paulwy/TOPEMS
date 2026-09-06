import type { DashboardSchema, StatCardSchema, ChartSchema } from '@/schema';
import type { WmsDashboardStats } from '@/api/wms/dashboard';
import i18n from '@/i18n';

let wmsStats: WmsDashboardStats | undefined;

export function useWmsDashboardSchema(): DashboardSchema {
  const statCards: StatCardSchema[] = [
    {
      id: 'total-inventory',
      title: i18n.t('wms.dashboard_schema.k0'),
      value: () => {
        const stats = wmsStats;
        return (stats?.total_inventory as number)?.toLocaleString() ?? '-';
      },
      icon: 'Package',
      color: 'primary',
      trend: { value: 0, label: i18n.t('wms.dashboard_schema.k1') },
    },
    {
      id: 'pending-inbound',
      title: i18n.t('wms.dashboard_schema.k2'),
      value: () => {
        const stats = wmsStats;
        return (stats?.pending_inbound as number)?.toLocaleString() ?? '-';
      },
      icon: 'Clock',
      color: 'info',
      trend: { value: 0, label: i18n.t('wms.dashboard_schema.k3') },
    },
    {
      id: 'pending-outbound',
      title: i18n.t('wms.dashboard_schema.k4'),
      value: () => {
        const stats = wmsStats;
        return (stats?.pending_outbound as number)?.toLocaleString() ?? '-';
      },
      icon: 'Activity',
      color: 'warning',
      trend: { value: 0, label: i18n.t('wms.dashboard_schema.k5') },
    },
    {
      id: 'location-utilization',
      title: i18n.t('wms.dashboard_schema.k6'),
      value: () => {
        const stats = wmsStats;
        return stats ? `${stats?.location_utilization ?? 0}%` : '-';
      },
      icon: 'Warehouse',
      color: 'success',
      trend: { value: 0, label: i18n.t('wms.dashboard_schema.k7') },
    },
  ];

  const charts: ChartSchema[] = [
    {
      id: 'inbound-trend',
      title: i18n.t('wms.dashboard_schema.k8'),
      type: 'bar',
      data: () => {
        const stats = wmsStats;
        if (!stats) return [];
        const trend = stats.inbound_trend as Array<{ name: string; value: number }> | undefined;
        return trend ?? [];
      },
      height: 300,
    },
    {
      id: 'inventory-category',
      title: i18n.t('wms.dashboard_schema.k9'),
      type: 'pie',
      data: () => {
        const stats = wmsStats;
        if (!stats) return [];
        const distribution = stats.inventory_categories as
          Array<{ name: string; value: number }> | undefined;
        return distribution ?? [];
      },
      height: 300,
    },
    {
      id: 'outbound-trend',
      title: i18n.t('wms.dashboard_schema.k10'),
      type: 'line',
      data: () => {
        const stats = wmsStats;
        if (!stats) return [];
        const trend = stats.outbound_trend as Array<{ name: string; value: number }> | undefined;
        return trend ?? [];
      },
      height: 300,
    },
  ];

  return {
    title: i18n.t('shared.dashboard_schema.wms_0'),
    loader: async () => {
      const api = await import('@/api/wms/dashboard');
      const response = await api.wmsDashboardApi.getOverview();
      if (response.success && response.data) {
        wmsStats = response.data;
      }
      return { statCards: undefined, charts: undefined, table: undefined };
    },
    statCards,
    charts,
  };
}
