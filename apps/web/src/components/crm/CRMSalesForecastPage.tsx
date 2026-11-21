import React, { useState, useMemo } from 'react';
import { Box, Button, useTheme } from '@mui/material';
import { Plus, Target, Calendar, Calculator, BarChart3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { crmApi, crmAnalyticsApi, type Period, type ForecastSeriesRow } from '@/api/crm';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';
import type {
  StatCard,
  ChartConfig,
  DataTable,
  TableColumn,
} from '@/components/templates/StatsPageTemplate';
import i18n from '@/i18n';
import { PageContainer } from '@/components/common';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';

const tableColumns: TableColumn[] = [
  { id: 'period', label: i18n.t('crm.salesForecast.col_period'), field: 'period' },
  {
    id: 'predicted',
    label: i18n.t('crm.salesForecast.col_predicted'),
    field: 'predicted',
    align: 'right',
  },
  { id: 'actual', label: i18n.t('crm.salesForecast.col_actual'), field: 'actual', align: 'right' },
  {
    id: 'confidence',
    label: i18n.t('crm.salesForecast.col_confidence'),
    field: 'confidence',
    align: 'center',
  },
  { id: 'trend', label: i18n.t('crm.salesForecast.col_trend'), field: 'trend', align: 'center' },
  { id: 'status', label: i18n.t('crm.salesForecast.col_status'), field: 'status', align: 'center' },
];

const CRMSalesForecastPage: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [timeRange, _setTimeRange] = useState('monthly');
  const [period, setPeriod] = useState<Period>('MTD');

  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();

  // 真实聚合：GET /api/crm/analytics/forecast → { series:[{period,period_type,predicted_amount,actual_amount,confidence_level,trend}] }
  // 后端无独立 status 字段：以 actual_amount>0 推断为已完成，否则为已生成（诚实近似）。
  const analyticsForecastQuery = useQuery({
    queryKey: [...QUERY_KEYS.CRM.SALES_FORECAST, timeRange, period],
    queryFn: () => crmAnalyticsApi.getForecast(period),
    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const seriesRows: ForecastSeriesRow[] = analyticsForecastQuery.data?.data?.series ?? [];
  const displayForecasts = seriesRows.map((row) => ({
    period: row.period,
    predicted_amount: row.predicted_amount,
    actual_amount: row.actual_amount,
    confidence_level: row.confidence_level,
    trend: row.trend,
    status: row.actual_amount > 0 ? ('completed' as const) : ('generated' as const),
  }));

  const generateMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const periodLabel =
        timeRange === 'monthly'
          ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
          : timeRange === 'quarterly'
            ? `${now.getFullYear()}-Q${Math.ceil((now.getMonth() + 1) / 3)}`
            : `${now.getFullYear()}`;
      return crmApi.salesForecast.generate({
        period_type: timeRange as 'monthly' | 'quarterly' | 'yearly',
        period: periodLabel,
      });
    },
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: t('crm.salesForecast.title_success'),
        message: t('crm.salesForecast.msg_generate_success'),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.CRM.SALES_FORECAST,
        exact: false,
        refetchType: 'active',
      });
    },
    onError: (error: unknown) => {
      apiLogger.error(t('crm.salesForecast.log_generate_fail'), error);
      addNotification({
        type: 'error',
        title: t('crm.salesForecast.title_fail'),
        message: t('crm.salesForecast.msg_generate_fail'),
      });
    },
  });

  const handleGenerateForecast = () => {
    generateMutation.mutate();
  };

  const loading =
    analyticsForecastQuery.isLoading ||
    analyticsForecastQuery.isFetching ||
    generateMutation.isPending;

  const summary = useMemo(() => {
    return {
      totalPredicted: displayForecasts.reduce((sum, f) => sum + f.predicted_amount, 0),
      totalActual: displayForecasts.reduce((sum, f) => sum + f.actual_amount, 0),
      averageConfidence:
        displayForecasts.length > 0
          ? Math.round(
              (displayForecasts.reduce((sum, f) => sum + f.confidence_level, 0) /
                displayForecasts.length) *
                100
            )
          : 0,
      completedCount: displayForecasts.filter((f) => f.status === 'completed').length,
    };
  }, [analyticsForecastQuery.data, t]);

  const statCards = useMemo<StatCard[]>(
    () => [
      {
        id: 'total-predicted',
        title: t('crm.salesForecast.stat_total_predicted'),
        value: `¥${summary.totalPredicted.toLocaleString()}`,
        icon: <Target sx={{ width: 24, height: 24 }} />,
        gradient: [theme.palette.primary.dark, theme.palette.primary[800]] as [string, string],
      },
      {
        id: 'total-actual',
        title: t('crm.salesForecast.stat_total_actual'),
        value: `¥${summary.totalActual.toLocaleString()}`,
        icon: <Calculator sx={{ width: 24, height: 24 }} />,
        gradient: [theme.palette.success.main, theme.palette.success.dark] as [string, string],
      },
      {
        id: 'average-confidence',
        title: t('crm.salesForecast.stat_avg_confidence'),
        value: `${summary.averageConfidence}%`,
        icon: <BarChart3 sx={{ width: 24, height: 24 }} />,
        gradient: [theme.palette.secondary.main, theme.palette.secondary.dark] as [string, string],
      },
      {
        id: 'completed-count',
        title: t('crm.salesForecast.stat_completed'),
        value: `${summary.completedCount} / ${displayForecasts.length}`,
        icon: <Calendar sx={{ width: 24, height: 24 }} />,
        gradient: [theme.palette.warning.main, theme.palette.warning.dark] as [string, string],
      },
    ],
    [summary, displayForecasts.length, t]
  );

  const charts = useMemo<ChartConfig[]>(() => {
    // 后端 analytics/forecast 无 target/weighted 第三系列：仅画 predicted vs actual（诚实两线）。
    const comparisonData = displayForecasts.flatMap((f) => [
      { name: f.period, value: f.predicted_amount, type: 'predicted' },
      { name: f.period, value: f.actual_amount || 0, type: 'actual' },
    ]);

    const confidenceData = displayForecasts.map((f) => ({
      name: f.period,
      value: Math.round(f.confidence_level * 100),
    }));

    return [
      {
        id: 'forecast-three-line',
        title: t('crm.salesForecast.chart_comparison'),
        type: 'line',
        dataKey: 'value',
        nameKey: 'name',
        data: comparisonData,
        height: 288,
      },
      {
        id: 'confidence-trend',
        title: t('crm.salesForecast.chart_confidence_trend'),
        type: 'line',
        dataKey: 'value',
        nameKey: 'name',
        data: confidenceData,
        height: 288,
      },
    ];
  }, [displayForecasts, t]);

  const tables = useMemo<DataTable[]>(
    () => [
      {
        id: 'forecast-list',
        title: t('crm.salesForecast.table_title'),
        columns: tableColumns,
        data: displayForecasts.map((forecast) => ({
          period: forecast.period,
          predicted: `¥${Number(forecast.predicted_amount || 0).toLocaleString()}`,
          actual: forecast.actual_amount
            ? `¥${Number(forecast.actual_amount).toLocaleString()}`
            : '-',
          confidence: `${Math.round((forecast.confidence_level || 0) * 100)}%`,
          trend: forecast.trend,
          status:
            forecast.status === 'completed'
              ? t('crm.salesForecast.status_completed')
              : forecast.status === 'generated'
                ? t('crm.salesForecast.status_generated')
                : forecast.status,
        })),
        loading,
      },
    ],
    [displayForecasts, loading, t]
  );

  const timeRangeOptions = [
    { label: t('crm.period.mtd') || i18n.t('pages.crm_sales_forecast_page.k0'), value: 'MTD' },
    { label: t('crm.period.qtd') || i18n.t('pages.crm_sales_forecast_page.k1'), value: 'QTD' },
    { label: t('crm.period.ytd') || i18n.t('pages.crm_sales_forecast_page.k2'), value: 'YTD' },
    {
      label: t('crm.period.r12') || i18n.t('pages.crm_sales_forecast_page.12_3'),
      value: 'ROLLING_12M',
    },
  ];

  const customToolbar = (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
      <Button
        variant='contained'
        startIcon={<Plus />}
        onClick={handleGenerateForecast}
        disabled={loading}
      >
        {t('crm.salesForecast.btn_generate')}
      </Button>
    </Box>
  );

  return (
    <PageContainer
      maxWidth='xl'
      title={t('crm.salesForecast.title')}
      subtitle={t('crm.salesForecast.subtitle')}
      autoTitle
      autoBreadcrumbs
    >
      <StatsPageTemplate
        title=''
        subtitle=''
        statCards={statCards}
        statColumns={4}
        charts={charts}
        chartColumns={{ xs: 1, lg: 2 }}
        tables={tables}
        loading={loading}
        timeRangeOptions={timeRangeOptions}
        timeRange={period}
        onTimeRangeChange={(v) => setPeriod(v as Period)}
        onRefresh={() => analyticsForecastQuery.refetch()}
        showExport={false}
        showRefresh={true}
        showTimeRange={true}
        showSearch={false}
        customToolbar={customToolbar}
        statCardDirection='row'
      />
    </PageContainer>
  );
};

export default CRMSalesForecastPage;
