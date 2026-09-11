/**
 * 预测准确率分析页
 *
 * 使用 recharts LineChart 展示预测 vs 实际准确率趋势：
 * - 预测量 vs 实际量折线
 * - 准确率折线（右 Y 轴）
 * 数据来自 APS 后端列表 API，按预测期间聚合。
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Box, Paper, Typography, CircularProgress } from '@mui/material';
import { Target, CheckCircle, AlertTriangle } from 'lucide-react';
import { apsApi } from '@/api/aps';
import type { DemandForecast } from '@/api/aps/types';
import { StatsPageTemplate } from '@/components/templates';
import type { StatCard } from '@/components/templates/StatsPageTemplate';
import { designTokens } from '@topems/tokens';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';

interface ForecastAccuracyItem {
  period: string;
  forecast: number;
  actual: number;
  accuracy: number;
}

export default function ForecastAccuracyPage() {
  const { t } = useTranslation();

  const { data: apiData, isLoading } = useQuery({
    queryKey: ['aps', 'forecasts'],
    queryFn: async () => {
      const res = await apsApi.listForecasts();
      const items =
        res?.data?.items ?? (Array.isArray(res?.data) ? (res.data as DemandForecast[]) : []);
      return items;
    },
  });

  const data = useMemo<ForecastAccuracyItem[]>(() => {
    const forecasts = apiData ?? [];
    if (forecasts.length === 0) return [];

    // 按预测期间分组
    const periodMap = new Map<string, { forecast: number; actual: number }>();

    forecasts.forEach((fc) => {
      // 优先使用 forecast_period，否则使用 forecast_date 的月份
      const period =
        fc.forecast_period ?? (fc.forecast_date ? fc.forecast_date.substring(0, 7) : null);
      if (!period) return;

      const forecastQty = fc.forecast_quantity ?? 0;
      const actualQty = fc.actual_quantity ?? 0;

      if (!periodMap.has(period)) {
        periodMap.set(period, { forecast: 0, actual: 0 });
      }
      const entry = periodMap.get(period)!;
      entry.forecast += forecastQty;
      entry.actual += actualQty;
    });

    // 转换为数组并按期间排序
    const periods = Array.from(periodMap.keys()).sort();
    return periods.map((period) => {
      const entry = periodMap.get(period)!;
      const forecast = Math.round(entry.forecast);
      const actual = Math.round(entry.actual);
      const accuracy =
        forecast > 0
          ? Math.round((100 - (Math.abs(actual - forecast) / forecast) * 100) * 10) / 10
          : 0;
      return {
        period,
        forecast,
        actual,
        accuracy,
      };
    });
  }, [apiData]);

  const avgAccuracy = useMemo(() => {
    if (data.length === 0) return 0;
    const sum = data.reduce((s, d) => s + d.accuracy, 0);
    return Number((sum / data.length).toFixed(1));
  }, [data]);

  const bestAccuracy = useMemo(() => {
    return data.length > 0 ? Math.max(...data.map((d) => d.accuracy)) : 0;
  }, [data]);

  const worstAccuracy = useMemo(() => {
    const positive = data.filter((d) => d.accuracy > 0);
    return positive.length > 0 ? Math.min(...positive.map((d) => d.accuracy)) : 0;
  }, [data]);

  const statCards: StatCard[] = [
    {
      id: 'avgAccuracy',
      title: t('aps.forecast_accuracy_page.k2'),
      value: avgAccuracy,
      suffix: '%',
      icon: <Target size={24} />,
      color: 'success',
    },
    {
      id: 'bestAccuracy',
      title: t('aps.forecast_accuracy_page.k3'),
      value: bestAccuracy,
      suffix: '%',
      icon: <CheckCircle size={24} />,
      color: 'info',
    },
    {
      id: 'worstAccuracy',
      title: t('aps.forecast_accuracy_page.k4'),
      value: worstAccuracy,
      suffix: '%',
      icon: <AlertTriangle size={24} />,
      color: 'warning',
    },
  ];

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '60vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <StatsPageTemplate
      title={t('aps.forecast_accuracy_page.k0')}
      subtitle={t('pages.forecast_accuracy_page.k0')}
      statCards={statCards}
      showStatCards={statCards.length > 0}
      showSearch={false}
      showTimeRange={false}
      showExport={false}
      showRefresh={false}
      showCharts={false}
    >
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography
          variant='subtitle1'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          {t('aps.forecast_accuracy_page.vs_5')}
        </Typography>
        <Box sx={{ width: '100%', height: 340 }}>
          <ResponsiveContainer
            width='100%'
            height={340}
          >
            <LineChart
              data={data}
              margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis
                dataKey='period'
                fontSize={11}
              />
              <YAxis
                yAxisId='left'
                fontSize={11}
                label={{
                  value: t('aps.forecast_accuracy_page.k6'),
                  angle: -90,
                  position: 'insideLeft',
                }}
              />
              <YAxis
                yAxisId='right'
                orientation='right'
                domain={[0, 100]}
                unit='%'
                fontSize={11}
                label={{
                  value: t('aps.forecast_accuracy_page.k7'),
                  angle: 90,
                  position: 'insideRight',
                }}
              />
              <Tooltip />
              <Legend />
              <ReferenceLine
                yAxisId='right'
                y={95}
                stroke={designTokens.colors.success.dark}
                strokeDasharray='4 4'
                label={t('aps.forecast_accuracy_page.95_8')}
              />
              <Line
                yAxisId='left'
                type='monotone'
                dataKey='forecast'
                name={t('aps.forecast_accuracy_page.k9')}
                stroke={designTokens.colors.secondary.dark}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                yAxisId='left'
                type='monotone'
                dataKey='actual'
                name={t('aps.forecast_accuracy_page.k10')}
                stroke={designTokens.colors.warning.main}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                yAxisId='right'
                type='monotone'
                dataKey='accuracy'
                name={t('aps.forecast_accuracy_page.k11')}
                stroke={designTokens.colors.success.dark}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
    </StatsPageTemplate>
  );
}
