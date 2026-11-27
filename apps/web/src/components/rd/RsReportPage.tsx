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
  };
  formulas: {
    total: number;
    published: number;
    testing: number;
    draft: number;
  };
  monthlyProgress: Array<{ month: string; projects: number }>;
}
const emptyReportData: RsReportData = {
  projects: { total: 0, active: 0, completed: 0, cancelled: 0 },
  experiments: { total: 0, lab: 0, pilot: 0, scaleup: 0 },
  formulas: { total: 0, published: 0, testing: 0, draft: 0 },
  monthlyProgress: [],
};
const RsReportPage: React.FC = () => {
  const reportQuery = useQuery<RsReportData>({
    queryKey: QUERY_KEYS.AD_HOC.RD_REPORT_SUMMARY_BASE,
    queryFn: async () => {
      // 全部取真实端点（原实现把 156 个试验 / 87.5% 成功率 / 2024 年月度趋势当默认值，
      // 空库时用户看到的就是这组编造数字）：
      //   /reports/projects/summary  项目汇总
      //   /reports/projects/trends   按周立项趋势
      //   /experiments/phase/{lab|pilot|scaleup}  三阶段试验数
      //   /formulas                  配方台账
      const [summaryRes, trendsRes, labRes, pilotRes, scaleupRes, formulasRes] = await Promise.all([
        apiClient.rd.get<Record<string, unknown>>('/reports/projects/summary'),
        apiClient.rd.get<Array<Record<string, unknown>>>('/reports/projects/trends'),
        apiClient.rd.get<{ total: number }>('/experiments/phase/lab', {
          params: { page: 1, page_size: 1 },
        }),
        apiClient.rd.get<{ total: number }>('/experiments/phase/pilot', {
          params: { page: 1, page_size: 1 },
        }),
        apiClient.rd.get<{ total: number }>('/experiments/phase/scaleup', {
          params: { page: 1, page_size: 1 },
        }),
        apiClient.rd.get<{ items?: Array<Record<string, unknown>>; total?: number }>('/formulas', {
          params: { page: 1, page_size: 200 },
        }),
      ]);

      const d = summaryRes.success ? (summaryRes.data ?? {}) : {};
      const lab = Number((labRes.success ? labRes.data?.total : 0) ?? 0);
      const pilot = Number((pilotRes.success ? pilotRes.data?.total : 0) ?? 0);
      const scaleup = Number((scaleupRes.success ? scaleupRes.data?.total : 0) ?? 0);

      const formulas = (formulasRes.success ? formulasRes.data?.items : undefined) ?? [];
      let published = 0;
      let testing = 0;
      let draft = 0;
      for (const item of formulas) {
        const status = String(item.status ?? '').toLowerCase();
        if (/publish|release|active|approve/.test(status)) published += 1;
        else if (/test|review|trial/.test(status)) testing += 1;
        else draft += 1;
      }

      const trends = (trendsRes.success ? trendsRes.data : undefined) ?? [];
      return {
        projects: {
          total: Number(d.total_projects ?? 0),
          active: Number(d.active_projects ?? 0),
          completed: Number(d.completed_projects ?? 0),
          cancelled: Number(d.delayed_projects ?? 0),
        },
        experiments: { total: lab + pilot + scaleup, lab, pilot, scaleup },
        formulas: {
          total: Number((formulasRes.success ? formulasRes.data?.total : 0) ?? formulas.length),
          published,
          testing,
          draft,
        },
        monthlyProgress: trends
          .map((row) => ({
            month: String(row.period ?? '').slice(0, 7),
            projects: Number(row.project_count ?? 0),
          }))
          .filter((row) => row.month),
      } as RsReportData;
    },
    staleTime: 5 * 60 * 1000,
  });
  const reportData = reportQuery.data ?? emptyReportData;
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
      // 原「成功率 87.5%」没有任何后端来源，属于编造指标，已删除。
      description: `${reportData.experiments.lab} / ${reportData.experiments.pilot} / ${reportData.experiments.scaleup}`,
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
      ],
      data: reportData.monthlyProgress.map((item) => ({
        month: item.month,
        projects: item.projects,
      })),
    },
  ];
  // 时间范围控件已撤：/api/rd/report* 不接受任何周期参数，下拉框只是摆设。
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
        onRefresh={() => reportQuery.refetch()}
        showTimeRange={false}
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
