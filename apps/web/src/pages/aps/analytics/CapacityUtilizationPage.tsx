import { designTokens, semanticTokens } from '@topems/tokens';
import i18n from '@/i18n';
/**
 * 产能利用率分析页
 *
 * 使用 recharts LineChart 展示工作中心利用率趋势：
 * - 各工作中心利用率折线
 * - 目标利用率基准线
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
  { date: 'W1', wcA: 78, wcB: 65, wcC: 88 },
  { date: 'W2', wcA: 82, wcB: 70, wcC: 91 },
  { date: 'W3', wcA: 85, wcB: 75, wcC: 85 },
  { date: 'W4', wcA: 90, wcB: 80, wcC: 92 },
  { date: 'W5', wcA: 88, wcB: 85, wcC: 89 },
  { date: 'W6', wcA: 92, wcB: 78, wcC: 94 },
  { date: 'W7', wcA: 85, wcB: 82, wcC: 90 },
  { date: 'W8', wcA: 89, wcB: 88, wcC: 93 },
  { date: 'W9', wcA: 94, wcB: 90, wcC: 96 },
  { date: 'W10', wcA: 91, wcB: 85, wcC: 92 },
  { date: 'W11', wcA: 87, wcB: 83, wcC: 88 },
  { date: 'W12', wcA: 93, wcB: 89, wcC: 95 },
];
export default function CapacityUtilizationPage() {
  const { data: backendData, isLoading: isBackendLoading } = useQuery({
    queryKey: ['aps', 'CapacityUtilizationPage'],
    queryFn: async () => {
      try {
        const res = await apsApi.listCapacities();
        const items = res?.data?.items ?? (Array.isArray(res?.data) ? res.data : []);
        const totalUsed = items.reduce((s: number, c: any) => s + (c.usedQty || c.used || 0), 0);
        const totalCap = items.reduce((s: number, c: any) => s + (c.totalQty || c.total || c.capacity || 0), 0);
        return {
          capacities: items,
          usedRatio: totalCap > 0 ? totalUsed / totalCap : 0,
        };
      } catch {
        return {};
      }
    },
  });
  const data = mockData;
  const avgUtilization = useMemo(() => {
    const allValues = data.flatMap((d) => [d.wcA, d.wcB, d.wcC]);
    return Math.round((allValues.reduce((s, v) => s + v, 0) / allValues.length) * 10) / 10;
  }, [data]);
  const maxUtilization = useMemo(() => {
    return Math.max(...data.flatMap((d) => [d.wcA, d.wcB, d.wcC]));
  }, [data]);
  const minUtilization = useMemo(() => {
    return Math.min(...data.flatMap((d) => [d.wcA, d.wcB, d.wcC]));
  }, [data]);
  return (
    <div className='space-y-4 p-4'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>{i18n.t('aps.capacity_utilization_page.k0')}</h1>
        <span className='text-sm text-gray-500'>{i18n.t('aps.capacity_utilization_page.k1')}</span>
      </div>
      <p className='text-sm text-gray-600'>
        {i18n.t('pages.capacity_utilization_page.k0')}
      </p>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('aps.capacity_utilization_page.k2')}</p>
          <p className='mt-1 text-3xl font-bold text-blue-600'>{avgUtilization}%</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('aps.capacity_utilization_page.k3')}</p>
          <p className='mt-1 text-3xl font-bold text-green-600'>{maxUtilization}%</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('aps.capacity_utilization_page.k4')}</p>
          <p className='mt-1 text-3xl font-bold text-orange-600'>{minUtilization}%</p>
        </div>
      </div>
      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>{i18n.t('aps.capacity_utilization_page.k5')}</h3>
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
              dataKey='date'
              fontSize={11}
            />
            <YAxis
              domain={[50, 100]}
              unit='%'
              fontSize={11}
              label={{ value: i18n.t('aps.capacity_utilization_page.k6'), angle: -90, position: 'insideLeft' }}
            />
            <Tooltip />
            <Legend />
            <ReferenceLine
              y={85}
              stroke={designTokens.colors.success.dark}
              strokeDasharray='4 4'
              label={i18n.t('aps.capacity_utilization_page.85_7')}
            />
            <Line
              type='monotone'
              dataKey='wcA'
              name={i18n.t('aps.capacity_utilization_page.a_8')}
              stroke={designTokens.colors.secondary.dark}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              type='monotone'
              dataKey='wcB'
              name={i18n.t('aps.capacity_utilization_page.b_9')}
              stroke={designTokens.colors.warning.main}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              type='monotone'
              dataKey='wcC'
              name={i18n.t('aps.capacity_utilization_page.c_10')}
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