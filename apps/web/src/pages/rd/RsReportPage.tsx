import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiLogger } from '@/utils/logger';
import {
  BarChart3 as AnalyticsIcon,
  FlaskConical as ScienceIcon,
  Folder as FolderIcon,
} from 'lucide-react';
import i18n from '@/i18n';
import { StatsPageTemplate, type TableColumn } from '@/components/templates/StatsPageTemplate';
import { apiClient } from '@/api/client';
import { PageContainer } from '@/components/common';
import { QUERY_KEYS } from '@/lib/reactQuery';

interface RsReportData {
  projects: {
    total: number;
    active: number;
    completed: number;
    cancelled: number;
  };
  experiments: {
    total: number;
    lab: number;
    pilot: number;
    scaleup: number;
    successRate: number;
  };
  formulas: {
    total: number;
    published: number;
    testing: number;
    draft: number;
  };
  monthlyProgress: Array<{ month: string; projects: number; experiments: number }>;
}
const defaultReportData: RsReportData = {
  projects: {
    total: 24,
    active: 12,
    completed: 8,
    cancelled: 4,
  },
  experiments: {
    total: 156,
    lab: 80,
    pilot: 50,
    scaleup: 26,
    successRate: 87.5,
  },
  formulas: {
    total: 45,
    published: 30,
    testing: 10,
    draft: 5,
  },
  monthlyProgress: [
    { month: '2024-01', projects: 2, experiments: 15 },
    { month: '2024-02', projects: 3, experiments: 20 },
    { month: '2024-03', projects: 4, experiments: 25 },
    { month: '2024-04', projects: 5, experiments: 30 },
    { month: '2024-05', projects: 4, experiments: 28 },
    { month: '2024-06', projects: 6, experiments: 38 },
  ],
};
const RsReportPage: React.FC = () => {
  const reportQuery = useQuery<RsReportData>({
    queryKey: QUERY_KEYS.AD_HOC.RD_REPORT_SUMMARY_BASE,
    queryFn: async () => {
      const response = await apiClient.rd.get<RsReportData>('/reports/summary');
      if (response.success && response.data) return response.data;
      return defaultReportData;
    },
    staleTime: 5 * 60 * 1000,
  });
  const reportData = reportQuery.data ?? defaultReportData;
  const loading = reportQuery.isLoading;
  useEffect(() => {
    if (reportQuery.isError) {
      apiLogger.error(i18n.t('pages.rs_report_page.k0'), reportQuery.error);
    }
  }, [reportQuery.isError, reportQuery.error]);
  const statCards = [
    {
      id: 'project-stats',
      title: i18n.t('rd.rs_report_page.k0'),
      value: reportData.projects.total,
      icon: <FolderIcon size={24} />,
      color: 'primary' as const,
      description: `${i18n.t('pages.rs_report_page.k1')}${reportData.projects.active}${i18n.t('pages.rs_report_page.k2')}${reportData.projects.completed}`,
    },
    {
      id: 'experiment-stats',
      title: i18n.t('rd.rs_report_page.k1'),
      value: reportData.experiments.total,
      icon: <ScienceIcon size={24} />,
      color: 'warning' as const,
      description: `${i18n.t('pages.rs_report_page.k3')}${reportData.experiments.successRate}%`,
      trend: {
        value: reportData.experiments.successRate,
        direction: 'up' as const,
        label: i18n.t('rd.rs_report_page.k2'),
      },
    },
    {
      id: 'formula-stats',
      title: i18n.t('rd.rs_report_page.k3'),
      value: reportData.formulas.total,
      icon: <AnalyticsIcon size={24} />,
      color: 'info' as const,
      description: `${i18n.t('pages.rs_report_page.k4')}${reportData.formulas.published}${i18n.t('pages.rs_report_page.k5')}${reportData.formulas.testing}`,
    },
  ];
  const charts = [
    {
      id: 'experiment-phase-distribution',
      title: i18n.t('rd.rs_report_page.k4'),
      type: 'pie' as const,
      dataKey: 'value',
      nameKey: 'name',
      data: [
        { name: i18n.t('rd.rs_report_page.k5'), value: reportData.experiments.lab },
        { name: i18n.t('rd.rs_report_page.k6'), value: reportData.experiments.pilot },
        { name: i18n.t('rd.rs_report_page.k7'), value: reportData.experiments.scaleup },
      ],
      colors: ['primary.main', 'warning.main', 'error.main'],
    },
    {
      id: 'monthly-progress-trend',
      title: i18n.t('rd.rs_report_page.k8'),
      type: 'bar' as const,
      dataKey: 'projects',
      nameKey: 'month',
      data: reportData.monthlyProgress.map((item) => ({
        name: item.month,
        value: item.projects,
        experiments: item.experiments,
      })),
      colors: ['primary.main', 'success.main'],
    },
  ];
  const tables = [
    {
      id: 'experiment-phase-details',
      title: i18n.t('rd.rs_report_page.k9'),
      columns: [
        { id: 'phase', label: i18n.t('rd.rs_report_page.k10') },
        { id: 'count', label: i18n.t('rd.rs_report_page.k11') },
        {
          id: 'percentage',
          label: i18n.t('rd.rs_report_page.k12'),
          render: (value: unknown) => `${(value as number).toFixed(1)}%`,
        },
      ] as TableColumn[],
      data: [
        {
          phase: i18n.t('rd.rs_report_page.k13'),
          count: reportData.experiments.lab,
          percentage: (reportData.experiments.lab / reportData.experiments.total) * 100,
        },
        {
          phase: i18n.t('rd.rs_report_page.k14'),
          count: reportData.experiments.pilot,
          percentage: (reportData.experiments.pilot / reportData.experiments.total) * 100,
        },
        {
          phase: i18n.t('rd.rs_report_page.k15'),
          count: reportData.experiments.scaleup,
          percentage: (reportData.experiments.scaleup / reportData.experiments.total) * 100,
        },
      ],
    },
    {
      id: 'monthly-progress-details',
      title: i18n.t('rd.rs_report_page.k16'),
      columns: [
        { id: 'month', label: i18n.t('rd.rs_report_page.k17') },
        { id: 'projects', label: i18n.t('rd.rs_report_page.k18') },
        { id: 'experiments', label: i18n.t('rd.rs_report_page.k19') },
      ],
      data: reportData.monthlyProgress.map((item) => ({
        month: item.month,
        projects: item.projects,
        experiments: item.experiments,
      })),
    },
  ];
  const timeRangeOptions = [
    { label: i18n.t('rd.rs_report_page.k20'), value: 'week' },
    { label: i18n.t('rd.rs_report_page.k21'), value: 'month' },
    { label: i18n.t('rd.rs_report_page.k22'), value: 'quarter' },
    { label: i18n.t('rd.rs_report_page.k23'), value: 'year' },
  ];
  const [timeRange, setTimeRange] = useState('month');
  return (
    <PageContainer
      padding={false}
      maxWidth={false}
    >
      <StatsPageTemplate
        title={i18n.t('rd.rs_report_page.k24')}
        subtitle={i18n.t('rd.rs_report_page.k25')}
        statCards={statCards}
        statColumns={3}
        charts={charts}
        tables={tables}
        loading={loading}
        timeRangeOptions={timeRangeOptions}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        onRefresh={() => reportQuery.refetch()}
        showTimeRange={true}
        showRefresh={true}
        showExport={true}
        showSearch={false}
        chartSectionTitle={i18n.t('rd.rs_report_page.k26')}
        tableSectionTitle={i18n.t('rd.rs_report_page.k27')}
      />
    </PageContainer>
  );
};
export default RsReportPage;
