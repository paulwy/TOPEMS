/**
 * 预测准确率分析页
 *
 * 使用 recharts LineChart 展示预测 vs 实际准确率趋势：
 * - 预测量 vs 实际量折线
 * - 准确率折线（右 Y 轴）
 * 数据使用内置 mock 数据。
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Box, Paper, Typography } from '@mui/material';
import { Target, CheckCircle, AlertTriangle } from 'lucide-react';
import { apsApi } from '@/api/aps';
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

const mockData = [
  { period: '2025-01', forecast: 1000, actual: 980 },
  { period: '2025-02', forecast: 1100, actual: 1150 },
  { period: '2025-03', forecast: 1200, actual: 1180 },
  { period: '2025-04', forecast: 1300, actual: 1250 },
  { period: '2025-05', forecast: 1400, actual: 1420 },
  { period: '2025-06', forecast: 1500, actual: 1480 },
  { period: '2025-07', forecast: 1600, actual: 1550 },
  { period: '2025-08', forecast: 1700, actual: 1720 },
  { period: '2025-09', forecast: 1800, actual: 1780 },
  { period: '2025-10', forecast: 1900, actual: 1850 },
  { period: '2025-11', forecast: 2000, actual: 2050 },
  { period: '2025-12', forecast: 2100, actual: 2080 },
];

export default function ForecastAccuracyPage() {
  const { t } = useTranslation();

  useQuery({
    queryKey: ['aps', 'ForecastAccuracyPage'],
    queryFn: async () => {
      try {
        const res = await apsApi.listForecasts();
        const items = res?.data?.items ?? (Array.isArray(res?.data) ? res.data : []);
        const valid = items.filter(
          (f: any) => f.forecastQty || f.forecast || f.actualQty || f.actual
        );
        const totalAcc = valid.reduce((s: number, f: any) => {
          const fc = f.forecastQty || f.forecast || 0;
          const ac = f.actualQty || f.actual || 0;
          if (fc <= 0) return s;
          return s + (100 - (Math.abs(ac - fc) / fc) * 100);
        }, 0);
        return {
          forecasts: items,
          accuracy: valid.length > 0 ? totalAcc / valid.length : 0,
        };
      } catch {
        return {};
      }
    },
  });

  const data = useMemo(() => {
    return mockData.map((d) => ({
      ...d,
      accuracy: Number((100 - (Math.abs(d.actual - d.forecast) / d.forecast) * 100).toFixed(1)),
    }));
  }, []);
  const avgAccuracy = useMemo(() => {
    const sum = data.reduce((s, d) => s + d.accuracy, 0);
    return Number((sum / data.length).toFixed(1));
  }, [data]);
  const bestAccuracy = useMemo(() => Math.max(...data.map((d) => d.accuracy)), [data]);
  const worstAccuracy = useMemo(() => Math.min(...data.map((d) => d.accuracy)), [data]);

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
                domain={[80, 100]}
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
