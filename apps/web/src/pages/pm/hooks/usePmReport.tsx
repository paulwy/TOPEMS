import { useState, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar, CheckCircle, AlertTriangle, DollarSign } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { pmApi } from '@/api/pm';
import type { PmStatistics, ProjectBenefit } from '@/api/pm';
import type { StatCard } from '@/components/templates/StatsPageTemplate';
import { PM_PATHS } from '@/modules/pm/config';
import { QUERY_KEYS } from '@/lib/reactQuery';

export const DEFAULT_STATS: PmStatistics = {
  total_projects: 0,
  draft_projects: 0,
  pending_projects: 0,
  active_projects: 0,
  completed_projects: 0,
  cancelled_projects: 0,
  total_contracts: 0,
  pending_contracts: 0,
  active_contracts: 0,
  completed_contracts: 0,
  total_budget: 0,
  spent_budget: 0,
  budget_usage_rate: 0,
  on_time_projects: 0,
  delayed_projects: 0,
  average_progress: 0,
  high_risk_projects: 0,
  medium_risk_projects: 0,
  low_risk_projects: 0,
};

export interface ChartDatum {
  name: string;
  value: number;
  fill: string;
}

export interface TrendDatum {
  month: string;
  cpi: number;
  spi: number;
}

export interface TimeRangeOption {
  label: string;
  value: string;
}

export interface UsePmReportReturn {
  selectedPeriod: string;
  setSelectedPeriod: (period: string) => void;
  stats: PmStatistics;
  benefits: ProjectBenefit[];
  loading: boolean;
  error: string;
  loadReportData: () => void;
  handleExport: () => void;
  statCards: StatCard[];
  projectStatusData: ChartDatum[];
  riskData: ChartDatum[];
  trendData: TrendDatum[];
  budgetUtilization: number;
  timeRangeOptions: TimeRangeOption[];
  pageTitle: string;
  pageSubtitle: string;
  exportText: string;
  navigate: ReturnType<typeof useNavigate>;
  params: ReturnType<typeof useParams<{ projectId?: string }>>;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export const usePmReport = (): UsePmReportReturn => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams<{ projectId?: string }>();
  const [selectedPeriod, setSelectedPeriod] = useState('all');

  const statsQuery = useQuery({
    queryKey: [...QUERY_KEYS.PM.STATISTICS, selectedPeriod, params.projectId ?? ''],
    queryFn: async () => {
      const response = await pmApi.getStatistics();
      if (response.success && response.data) {
        return response.data as PmStatistics;
      }
      return DEFAULT_STATS;
    },
  });

  const benefitsQuery = useQuery({
    queryKey: [
      ...(params.projectId ? QUERY_KEYS.PM.BENEFITS(params.projectId) : QUERY_KEYS.PM.REPORTS),
      selectedPeriod,
    ],
    queryFn: async () => {
      if (!params.projectId) return [] as ProjectBenefit[];
      const response = await pmApi.benefits.list(params.projectId);
      if (response.success && response.data) {
        return (response.data as { benefits?: ProjectBenefit[] }).benefits || [];
      }
      return [] as ProjectBenefit[];
    },
  });

  const stats = statsQuery.data ?? DEFAULT_STATS;
  const benefits = benefitsQuery.data ?? [];
  const loading = statsQuery.isLoading || benefitsQuery.isLoading;
  const error =
    statsQuery.isError || benefitsQuery.isError ? t('pm.pm_report_page.text_ca2c36') : '';

  const loadReportData = useCallback(() => {
    statsQuery.refetch();
    benefitsQuery.refetch();
  }, [statsQuery, benefitsQuery]);

  const handleExport = useCallback(() => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      statistics: stats,
      benefits,
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [stats, benefits]);

  const statCards: StatCard[] = useMemo(
    () => [
      {
        id: 'total-projects',
        title: t('pm.pm_report_page.title_3ea3ec'),
        value: stats.total_projects,
        icon: <Calendar size={20} />,
        color: 'primary',
      },
      {
        id: 'completed-projects',
        title: t('pm.pm_report_page.title_fad522'),
        value: stats.completed_projects,
        icon: <CheckCircle size={20} />,
        color: 'success',
      },
      {
        id: 'budget-usage',
        title: t('pm.pm_report_page.title_dcd3c8'),
        value: `${stats.budget_usage_rate}%`,
        icon: <DollarSign size={20} />,
        color: 'warning',
      },
      {
        id: 'high-risk',
        title: t('pm.pm_report_page.title_271379'),
        value: stats.high_risk_projects,
        icon: <AlertTriangle size={20} />,
        color: 'error',
      },
    ],
    [stats, t]
  );

  const projectStatusData: ChartDatum[] = useMemo(
    () =>
      [
        { name: t('pm.pm_report_page.name_22b433'), value: stats.draft_projects, fill: 'grey.500' },
        {
          name: t('pm.pm_report_page.name_b0bf01'),
          value: stats.pending_projects,
          fill: 'warning.main',
        },
        {
          name: t('pm.pm_report_page.name_fb852f'),
          value: stats.active_projects,
          fill: 'primary.main',
        },
        {
          name: t('pm.pm_report_page.name_fad522'),
          value: stats.completed_projects,
          fill: 'success.main',
        },
        {
          name: t('pm.pm_report_page.name_2111cc'),
          value: stats.cancelled_projects,
          fill: 'error.main',
        },
      ].filter((d) => d.value > 0),
    [stats, t]
  );

  const riskData: ChartDatum[] = useMemo(
    () =>
      [
        {
          name: t('pm.pm_report_page.name_4433e7'),
          value: stats.high_risk_projects,
          fill: 'error.main',
        },
        {
          name: t('pm.pm_report_page.name_8a8992'),
          value: stats.medium_risk_projects,
          fill: 'warning.main',
        },
        {
          name: t('pm.pm_report_page.name_b56976'),
          value: stats.low_risk_projects,
          fill: 'success.main',
        },
      ].filter((d) => d.value > 0),
    [stats, t]
  );

  const trendData: TrendDatum[] = useMemo(
    () =>
      benefits.slice(0, 6).map((b, index) => ({
        month: t(`pm.pm_report_page.text_31f4ca${{ index_1: index + 1 }}`),
        cpi: b.cpi,
        spi: b.spi,
      })),
    [benefits, t]
  );

  const budgetUtilization = useMemo(
    () => (stats.total_budget > 0 ? (stats.spent_budget / stats.total_budget) * 100 : 0),
    [stats]
  );

  const timeRangeOptions: TimeRangeOption[] = useMemo(
    () => [
      { label: t('pm.pm_report_page.label_98c99f'), value: 'all' },
      { label: t('pm.pm_report_page.label_725205'), value: 'week' },
      { label: t('pm.pm_report_page.label_0ec94a'), value: 'month' },
      { label: t('pm.pm_report_page.label_0477ce'), value: 'quarter' },
      { label: t('pm.pm_report_page.label_04ab9d'), value: 'year' },
    ],
    [t]
  );

  const pageTitle = t('pm.pm_report_page.attr_d5179b');
  const pageSubtitle = params.projectId
    ? t('pm.pm_report_page.text_fd2114')
    : t('pm.pm_report_page.text_939d8c');
  const exportText = t('pm.pm_report_page.attr_4fcf74');

  return {
    selectedPeriod,
    setSelectedPeriod,
    stats,
    benefits,
    loading,
    error,
    loadReportData,
    handleExport,
    statCards,
    projectStatusData,
    riskData,
    trendData,
    budgetUtilization,
    timeRangeOptions,
    pageTitle,
    pageSubtitle,
    exportText,
    navigate,
    params,
    t,
  };
};

export default usePmReport;
