import { qualityDashboardApi } from '@/api/qms';
import type { QualityOverview } from '@/api/qms/types';
import type { DashboardSchema, StatCardSchema, ChartSchema } from '@/schema';

declare global {
  interface Window {
    __qmsStats?: QualityOverview;
  }
}

export function useQmsDashboardSchema(): DashboardSchema {
  const statCards: StatCardSchema[] = [
    {
      id: 'pass-rate',
      title: '合格率',
      value: () => {
        const stats = window.__qmsStats;
        return stats ? `${stats.passRate.toFixed(1)}%` : '-';
      },
      icon: 'CheckCircle',
      color: 'success',
      trend: { value: 0, label: '上月' },
    },
    {
      id: 'total-inspections',
      title: '检测总数',
      value: () => {
        const stats = window.__qmsStats;
        return stats?.totalInspections.toLocaleString() ?? '-';
      },
      icon: 'ClipboardList',
      color: 'primary',
      trend: { value: 0, label: '上月' },
    },
    {
      id: 'open-issues',
      title: '待处理问题',
      value: () => {
        const stats = window.__qmsStats;
        return stats?.totalIssues.toLocaleString() ?? '-';
      },
      icon: 'AlertCircle',
      color: 'warning',
      trend: { value: 0, label: '上月' },
    },
    {
      id: 'customer-complaints',
      title: '客户投诉',
      value: () => {
        const stats = window.__qmsStats;
        return stats?.customerComplaintCount.toLocaleString() ?? '-';
      },
      icon: 'Users',
      color: 'error',
      trend: { value: 0, label: '上月' },
    },
  ];

  const charts: ChartSchema[] = [
    {
      id: 'quality-trend',
      title: '质量趋势',
      type: 'line',
      data: () => {
        const stats = window.__qmsStats;
        if (!stats) return [];
        return stats.trendData.map((item) => ({
          name: item.date,
          value: item.passRate,
        }));
      },
      height: 300,
    },
    {
      id: 'issue-type-distribution',
      title: '问题类型分布',
      type: 'pie',
      data: () => {
        const stats = window.__qmsStats;
        if (!stats) return [];
        return stats.topIssues.map((item) => ({
          name: item.category,
          value: item.count,
        }));
      },
      height: 300,
    },
    {
      id: 'inspection-pass-rate',
      title: '检测合格率',
      type: 'bar',
      data: () => {
        const stats = window.__qmsStats;
        if (!stats) return [];
        return stats.departmentPerformance.map((item) => ({
          name: item.department,
          value: item.passRate,
        }));
      },
      height: 300,
    },
  ];

  return {
    title: 'QMS 仪表盘',
    loader: async () => {
      const response = await qualityDashboardApi.getQualityOverview();
      if (response.success && response.data) {
        window.__qmsStats = response.data;
      }
      return { statCards: undefined, charts: undefined, table: undefined };
    },
    statCards,
    charts,
  };
}
