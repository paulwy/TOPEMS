import React, { useState, useEffect, useMemo } from 'react';
import { Box, Button } from '@mui/material';
import { Plus, TrendingUp, Target, Calendar, Calculator, BarChart3 } from 'lucide-react';
import type { SalesForecast, ForecastFactor } from '@/api/crm';
import { crmApi } from '@/api/crm';
import { useAppStore } from '@/store';
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

const ct = designTokens.colors;

const CRMSalesForecastPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [forecasts, setForecasts] = useState<SalesForecast[]>([]);
  const [timeRange, setTimeRange] = useState('monthly');

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadForecasts();
  }, [timeRange]);

  const loadForecasts = async () => {
    try {
      setLoading(true);
      const response = await crmApi.salesForecast.list({
        period_type: timeRange as 'monthly' | 'quarterly' | 'yearly',
      });
      setForecasts(response.data?.items || []);
    } catch (error: unknown) {
      apiLogger.error('加载销售预测数据失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载销售预测数据',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateForecast = async () => {
    try {
      const now = new Date();
      const period =
        timeRange === 'monthly'
          ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
          : timeRange === 'quarterly'
            ? `${now.getFullYear()}-Q${Math.ceil((now.getMonth() + 1) / 3)}`
            : `${now.getFullYear()}`;

      setLoading(true);
      await crmApi.salesForecast.generate({
        period_type: timeRange as 'monthly' | 'quarterly' | 'yearly',
        period,
      });
      addNotification({
        type: 'success',
        title: '成功',
        message: '销售预测生成成功',
      });
      loadForecasts();
    } catch (error: unknown) {
      apiLogger.error('生成销售预测失败:', error);
      addNotification({
        type: 'error',
        title: '生成失败',
        message: '销售预测生成失败',
      });
    } finally {
      setLoading(false);
    }
  };

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
        title: '预测总收入',
        value: `¥${summary.totalPredicted.toLocaleString()}`,
        icon: <Target sx={{ width: 24, height: 24 }} />,
        gradient: [ct.primary.dark, ct.primary[800]] as [string, string],
      },
      {
        id: 'total-actual',
        title: '实际总收入',
        value: `¥${summary.totalActual.toLocaleString()}`,
        icon: <Calculator sx={{ width: 24, height: 24 }} />,
        gradient: [ct.success.main, ct.success.dark] as [string, string],
      },
      {
        id: 'average-confidence',
        title: '平均置信度',
        value: `${summary.averageConfidence}%`,
        icon: <BarChart3 sx={{ width: 24, height: 24 }} />,
        gradient: [ct.secondary.main, ct.secondary.dark] as [string, string],
      },
      {
        id: 'completed-count',
        title: '已完成预测',
        value: `${summary.completedCount} / ${forecasts.length}`,
        icon: <Calendar sx={{ width: 24, height: 24 }} />,
        gradient: [ct.warning.main, ct.warning.dark] as [string, string],
      },
    ],
    [summary, forecasts.length]
  );

  const charts = useMemo<ChartConfig[]>(
    () => [
      {
        id: 'forecast-comparison',
        title: '预测对比',
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
        title: '置信度趋势',
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
    [forecasts]
  );

  const tableColumns: TableColumn[] = [
    { id: 'period', label: '周期', field: 'period' },
    { id: 'predicted', label: '预测金额', field: 'predicted', align: 'right' },
    { id: 'actual', label: '实际金额', field: 'actual', align: 'right' },
    { id: 'confidence', label: '置信度', field: 'confidence', align: 'center' },
    { id: 'trend', label: '趋势', field: 'trend', align: 'center' },
    { id: 'status', label: '状态', field: 'status', align: 'center' },
  ];

  const tables = useMemo<DataTable[]>(
    () => [
      {
        id: 'forecast-list',
        title: '预测列表',
        columns: tableColumns,
        data: forecasts.map((forecast) => ({
          period: forecast.period,
          predicted: `¥${forecast.predicted_amount.toLocaleString()}`,
          actual: forecast.actual_amount ? `¥${forecast.actual_amount.toLocaleString()}` : '-',
          confidence: `${Math.round(forecast.confidencelevel * 100)}%`,
          trend: forecast.trend,
          status:
            forecast.status === 'completed'
              ? '已完成'
              : forecast.status === 'generated'
                ? '已生成'
                : forecast.status,
        })),
        loading,
      },
    ],
    [forecasts, loading]
  );

  const timeRangeOptions = [
    { label: '月度', value: 'monthly' },
    { label: '季度', value: 'quarterly' },
    { label: '年度', value: 'yearly' },
  ];

  const customToolbar = (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
      <Button
        variant='contained'
        startIcon={<Plus />}
        onClick={handleGenerateForecast}
        disabled={loading}
      >
        生成预测
      </Button>
    </Box>
  );

  return (
    <PageContainer
      maxWidth='xl'
      title='销售预测'
      subtitle='基于历史数据预测未来销售趋势'
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
        onRefresh={loadForecasts}
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
