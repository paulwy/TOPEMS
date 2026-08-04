import type { DashboardSchema, StatCardSchema, ChartSchema } from '@/schema';
import type { WmsDashboardStats } from '@/api/wms/dashboard';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __wmsStats?: WmsDashboardStats;
  }
}

export function useWmsDashboardSchema(): DashboardSchema {
  const statCards: StatCardSchema[] = [
    {
      id: 'total-inventory',
      title: '库存总数',
      value: () => {
        const stats = window.__wmsStats;
        return (stats?.total_inventory as number)?.toLocaleString() ?? '-';
      },
      icon: 'Package',
      color: 'primary',
      trend: { value: 0, label: '上月' },
    },
    {
      id: 'pending-inbound',
      title: '待入库',
      value: () => {
        const stats = window.__wmsStats;
        return (stats?.pending_inbound as number)?.toLocaleString() ?? '-';
      },
      icon: 'Clock',
      color: 'info',
      trend: { value: 0, label: '上月' },
    },
    {
      id: 'pending-outbound',
      title: '待出库',
      value: () => {
        const stats = window.__wmsStats;
        return (stats?.pending_outbound as number)?.toLocaleString() ?? '-';
      },
      icon: 'Activity',
      color: 'warning',
      trend: { value: 0, label: '上月' },
    },
    {
      id: 'location-utilization',
      title: '库位利用率',
      value: () => {
        const stats = window.__wmsStats;
        return stats ? `${stats?.location_utilization ?? 0}%` : '-';
      },
      icon: 'Warehouse',
      color: 'success',
      trend: { value: 0, label: '上月' },
    },
  ];

  const charts: ChartSchema[] = [
    {
      id: 'inbound-trend',
      title: '入库趋势',
      type: 'bar',
      data: () => {
        const stats = window.__wmsStats;
        if (!stats) return [];
        const trend = stats.inbound_trend as Array<{ name: string; value: number }> | undefined;
        return trend ?? [];
      },
      height: 300,
    },
    {
      id: 'inventory-category',
      title: '库存分类分布',
      type: 'pie',
      data: () => {
        const stats = window.__wmsStats;
        if (!stats) return [];
        const distribution = stats.inventory_categories as
          Array<{ name: string; value: number }> | undefined;
        return distribution ?? [];
      },
      height: 300,
    },
    {
      id: 'outbound-trend',
      title: '出库趋势',
      type: 'line',
      data: () => {
        const stats = window.__wmsStats;
        if (!stats) return [];
        const trend = stats.outbound_trend as Array<{ name: string; value: number }> | undefined;
        return trend ?? [];
      },
      height: 300,
    },
  ];

  return {
    title: 'WMS 仪表盘',
    loader: async () => {
      const api = await import('@/api/wms/dashboard');
      const response = await api.wmsDashboardApi.getOverview();
      if (response.success && response.data) {
        window.__wmsStats = response.data;
      }
      return { statCards: undefined, charts: undefined, table: undefined };
    },
    statCards,
    charts,
  };
}
