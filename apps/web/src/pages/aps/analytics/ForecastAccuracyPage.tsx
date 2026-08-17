import { designTokens, semanticTokens } from '@topems/tokens';
import i18n from '@/i18n';
/**
 * 预测准确率分析页
 *
 * 使用 recharts LineChart 展示预测 vs 实际准确率趋势：
 * - 预测量 vs 实际量折线
 * - 准确率折线（右 Y 轴）
 * 数据使用内置 mock 数据。
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apsApi } from '@/api/aps';
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
  const { data: backendData, isLoading: isBackendLoading } = useQuery({
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
  return (
    <div className='space-y-4 p-4'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>{i18n.t('aps.forecast_accuracy_page.k0')}</h1>
        <span className='text-sm text-gray-500'>{i18n.t('aps.forecast_accuracy_page.vs_1')}</span>
      </div>
      <p className='text-sm text-gray-600'>{i18n.t('pages.forecast_accuracy_page.k0')}</p>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('aps.forecast_accuracy_page.k2')}</p>
          <p className='mt-1 text-3xl font-bold text-green-600'>{avgAccuracy}%</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('aps.forecast_accuracy_page.k3')}</p>
          <p className='mt-1 text-3xl font-bold text-blue-600'>{bestAccuracy}%</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('aps.forecast_accuracy_page.k4')}</p>
          <p className='mt-1 text-3xl font-bold text-orange-600'>{worstAccuracy}%</p>
        </div>
      </div>
      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>{i18n.t('aps.forecast_accuracy_page.vs_5')}</h3>
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
                value: i18n.t('aps.forecast_accuracy_page.k6'),
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
                value: i18n.t('aps.forecast_accuracy_page.k7'),
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
              label={i18n.t('aps.forecast_accuracy_page.95_8')}
            />
            <Line
              yAxisId='left'
              type='monotone'
              dataKey='forecast'
              name={i18n.t('aps.forecast_accuracy_page.k9')}
              stroke={designTokens.colors.secondary.dark}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              yAxisId='left'
              type='monotone'
              dataKey='actual'
              name={i18n.t('aps.forecast_accuracy_page.k10')}
              stroke={designTokens.colors.warning.main}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              yAxisId='right'
              type='monotone'
              dataKey='accuracy'
              name={i18n.t('aps.forecast_accuracy_page.k11')}
              stroke={designTokens.colors.success.dark}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
