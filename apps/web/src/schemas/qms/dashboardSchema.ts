import { qualityDashboardApi } from '@/api/qms';
import type { QualityOverview } from '@/api/qms/types';
import type { DashboardSchema, StatCardSchema, ChartSchema } from '@/schema';
import i18n from '@/i18n';

let qmsStats: QualityOverview | undefined;

export function useQmsDashboardSchema(): DashboardSchema {
  const statCards: StatCardSchema[] = [
    {
      id: 'pass-rate',
      title: i18n.t('qms.dashboard_schema.k0'),
      value: () => {
        const stats = qmsStats;
        return stats ? `${stats.passRate.toFixed(1)}%` : '-';
      },
      icon: 'CheckCircle',
      color: 'success',
      trend: { value: 0, label: i18n.t('qms.dashboard_schema.k1') },
    },
    {
      id: 'total-inspections',
      title: i18n.t('qms.dashboard_schema.k2'),
      value: () => {
        const stats = qmsStats;
        return stats?.totalInspections.toLocaleString() ?? '-';
      },
      icon: 'ClipboardList',
      color: 'primary',
      trend: { value: 0, label: i18n.t('qms.dashboard_schema.k3') },
    },
    {
      id: 'open-issues',
      title: i18n.t('qms.dashboard_schema.k4'),
      value: () => {
        const stats = qmsStats;
        return stats?.totalIssues.toLocaleString() ?? '-';
      },
      icon: 'AlertCircle',
      color: 'warning',
      trend: { value: 0, label: i18n.t('qms.dashboard_schema.k5') },
    },
    {
      id: 'customer-complaints',
      title: i18n.t('qms.dashboard_schema.k6'),
      value: () => {
        const stats = qmsStats;
        return stats?.customerComplaintCount.toLocaleString() ?? '-';
      },
      icon: 'Users',
      color: 'error',
      trend: { value: 0, label: i18n.t('qms.dashboard_schema.k7') },
    },
  ];

  const charts: ChartSchema[] = [
    {
      id: 'quality-trend',
      title: i18n.t('qms.dashboard_schema.k8'),
      type: 'line',
      data: () => {
        const stats = qmsStats;
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
      title: i18n.t('qms.dashboard_schema.k9'),
      type: 'pie',
      data: () => {
        const stats = qmsStats;
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
      title: i18n.t('qms.dashboard_schema.k10'),
      type: 'bar',
      data: () => {
        const stats = qmsStats;
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
    title: i18n.t('shared.dashboard_schema.qms_0'),
    loader: async () => {
      const response = await qualityDashboardApi.getQualityOverview();
      if (response.success && response.data) {
        qmsStats = response.data;
      }
      return { statCards: undefined, charts: undefined, table: undefined };
    },
    statCards,
    charts,
  };
}
