import React, { useState, useMemo } from 'react';
import { Box, Button } from '@mui/material';
import { Plus, Target, Calendar, Calculator, BarChart3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { crmApi } from '@/api/crm';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';
import type {
  StatCard,
  ChartConfig,
  DataTable,
  TableColumn,
} from '@/components/templates/StatsPageTemplate';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;

const CRMSalesForecastPage: React.FC = () => {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState('monthly');

  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();

  const forecastsQuery = useQuery({
    queryKey: [...QUERY_KEYS.CRM.SALES_FORECAST, timeRange],
    queryFn: async () => {
      const response = await crmApi.salesForecast.list({
        period_type: timeRange as 'monthly' | 'quarterly' | 'yearly',
      });
      return response.data?.items || [];
    },
  });

  const forecasts = forecastsQuery.data || [];

  const generateMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const period =
        timeRange === 'monthly'
          ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
          : timeRange === 'quarterly'
            ? `${now.getFullYear()}-Q${Math.ceil((now.getMonth() + 1) / 3)}`
            : `${now.getFullYear()}`;
      return crmApi.salesForecast.generate({
        period_type: timeRange as 'monthly' | 'quarterly' | 'yearly',
        period,
      });
    },
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: t('crm.salesForecast.title_success'),
        message: t('crm.salesForecast.msg_generate_success'),
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CRM.SALES_FORECAST });
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
    forecastsQuery.isLoading || forecastsQuery.isFetching || generateMutation.isPending;

  const summary = useMemo(
    () => ({
      totalPredicted: forecasts.reduce((sum, f) => sum + f.predicted_amount, 0),
      totalActual: forecasts.reduce((sum, f) => sum + (f.actual_amount || 0), 0),
      averageConfidence:
        forecasts.length > 0
          ? Math.round(
              (forecasts.reduce((sum, f) => sum + f.confidencelevel, 0) / forecasts.length) * 100
            )
          : 0,
      completedCount: forecasts.filter((f) => f.status === 'completed').length,
    }),
    [forecasts]
  );

  const statCards = useMemo<StatCard[]>(
    () => [
      {
        id: 'total-predicted',
        title: t('crm.salesForecast.stat_total_predicted'),
        value: `¥${summary.totalPredicted.toLocaleString()}`,
        icon: <Target sx={{ width: 24, height: 24 }} />,
        gradient: [ct.primary.dark, ct.primary[800]] as [string, string],
      },
      {
        id: 'total-actual',
        title: t('crm.salesForecast.stat_total_actual'),
        value: `¥${summary.totalActual.toLocaleString()}`,
        icon: <Calculator sx={{ width: 24, height: 24 }} />,
        gradient: [ct.success.main, ct.success.dark] as [string, string],
      },
      {
        id: 'average-confidence',
        title: t('crm.salesForecast.stat_avg_confidence'),
        value: `${summary.averageConfidence}%`,
        icon: <BarChart3 sx={{ width: 24, height: 24 }} />,
        gradient: [ct.secondary.main, ct.secondary.dark] as [string, string],
      },
      {
        id: 'completed-count',
        title: t('crm.salesForecast.stat_completed'),
        value: `${summary.completedCount} / ${forecasts.length}`,
        icon: <Calendar sx={{ width: 24, height: 24 }} />,
        gradient: [ct.warning.main, ct.warning.dark] as [string, string],
      },
    ],
    [summary, forecasts.length, t]
  );

  const charts = useMemo<ChartConfig[]>(
    () => [
      {
        id: 'forecast-comparison',
        title: t('crm.salesForecast.chart_comparison'),
        type: 'bar',
        dataKey: 'value',
        nameKey: 'name',
        data: forecasts.flatMap((f) => [
          { name: f.period, value: f.predicted_amount, type: 'predicted' },
          { name: f.period, value: f.actual_amount || 0, type: 'actual' },
        ]),
        height: 288,
      },
      {
        id: 'confidence-trend',
        title: t('crm.salesForecast.chart_confidence_trend'),
        type: 'line',
        dataKey: 'value',
        nameKey: 'name',
        data: forecasts.map((f) => ({
          name: f.period,
          value: Math.round(f.confidencelevel * 100),
        })),
        height: 288,
      },
    ],
    [forecasts, t]
  );

  const tableColumns: TableColumn[] = [
    { id: 'period', label: t('crm.salesForecast.col_period'), field: 'period' },
    {
      id: 'predicted',
      label: t('crm.salesForecast.col_predicted'),
      field: 'predicted',
      align: 'right',
    },
    { id: 'actual', label: t('crm.salesForecast.col_actual'), field: 'actual', align: 'right' },
    {
      id: 'confidence',
      label: t('crm.salesForecast.col_confidence'),
      field: 'confidence',
      align: 'center',
    },
    { id: 'trend', label: t('crm.salesForecast.col_trend'), field: 'trend', align: 'center' },
    { id: 'status', label: t('crm.salesForecast.col_status'), field: 'status', align: 'center' },
  ];

  const tables = useMemo<DataTable[]>(
    () => [
      {
        id: 'forecast-list',
        title: t('crm.salesForecast.table_title'),
        columns: tableColumns,
        data: forecasts.map((forecast) => ({
          period: forecast.period,
          predicted: `¥${forecast.predicted_amount.toLocaleString()}`,
          actual: forecast.actual_amount ? `¥${forecast.actual_amount.toLocaleString()}` : '-',
          confidence: `${Math.round(forecast.confidencelevel * 100)}%`,
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
    [forecasts, loading, t]
  );

  const timeRangeOptions = [
    { label: t('crm.salesForecast.range_monthly'), value: 'monthly' },
    { label: t('crm.salesForecast.range_quarterly'), value: 'quarterly' },
    { label: t('crm.salesForecast.range_yearly'), value: 'yearly' },
  ];

  const customToolbar = (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
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
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        onRefresh={() => forecastsQuery.refetch()}
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
