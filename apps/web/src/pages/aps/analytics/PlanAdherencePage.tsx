import { designTokens, semanticTokens } from '@topems/tokens';
/**
 * 计划达成率分析页
 *
 * 使用 recharts BarChart 展示计划 vs 实际产量差异：
 * - 柱状图：计划产量 vs 实际产量
 * - 折线图：达成率（%）
 * 数据使用内置 mock 数据。
 */
import { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';

const mockData = [
  { period: '2025-01', plan: 1200, actual: 1180 },
  { period: '2025-02', plan: 1300, actual: 1250 },
  { period: '2025-03', plan: 1400, actual: 1420 },
  { period: '2025-04', plan: 1500, actual: 1380 },
  { period: '2025-05', plan: 1600, actual: 1550 },
  { period: '2025-06', plan: 1700, actual: 1720 },
  { period: '2025-07', plan: 1800, actual: 1650 },
  { period: '2025-08', plan: 1900, actual: 1880 },
  { period: '2025-09', plan: 2000, actual: 1950 },
  { period: '2025-10', plan: 2100, actual: 2150 },
  { period: '2025-11', plan: 2200, actual: 2080 },
  { period: '2025-12', plan: 2300, actual: 2280 },
];

export default function PlanAdherencePage() {
  const data = useMemo(() => {
    return mockData.map((d) => ({
      ...d,
      adherenceRate: Number(((d.actual / d.plan) * 100).toFixed(1)),
      variance: d.actual - d.plan,
    }));
  }, []);

  const avgAdherence = useMemo(() => {
    const sum = data.reduce((s, d) => s + d.adherenceRate, 0);
    return Number((sum / data.length).toFixed(1));
  }, [data]);

  const totalPlan = useMemo(() => data.reduce((s, d) => s + d.plan, 0), [data]);
  const totalActual = useMemo(() => data.reduce((s, d) => s + d.actual, 0), [data]);

  return (
    <div className='space-y-4 p-4'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>计划达成率分析</h1>
        <span className='text-sm text-gray-500'>计划 vs 实际产量差异分析</span>
      </div>
      <p className='text-sm text-gray-600'>
        展示各周期计划产量与实际产量的对比，以及达成率趋势，帮助识别产能瓶颈与计划偏差。
      </p>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>平均达成率</p>
          <p className='mt-1 text-3xl font-bold text-green-600'>{avgAdherence}%</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>计划总产量</p>
          <p className='mt-1 text-3xl font-bold text-blue-600'>{totalPlan.toLocaleString()}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>实际总产量</p>
          <p className='mt-1 text-3xl font-bold text-orange-600'>{totalActual.toLocaleString()}</p>
        </div>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>计划 vs 实际产量（柱+达成率线）</h3>
        <ResponsiveContainer
          width='100%'
          height={360}
        >
          <ComposedChart
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
              label={{ value: '产量', angle: -90, position: 'insideLeft' }}
            />
            <YAxis
              yAxisId='right'
              orientation='right'
              domain={[80, 120]}
              unit='%'
              fontSize={11}
              label={{ value: '达成率', angle: 90, position: 'insideRight' }}
            />
            <Tooltip />
            <Legend />
            <ReferenceLine
              yAxisId='right'
              y={100}
              stroke={designTokens.colors.success.dark}
              strokeDasharray='4 4'
              label='目标 100%'
            />
            <Bar
              yAxisId='left'
              dataKey='plan'
              name='计划产量'
              fill={designTokens.colors.secondary.dark}
              barSize={20}
            />
            <Bar
              yAxisId='left'
              dataKey='actual'
              name='实际产量'
              fill={designTokens.colors.warning.main}
              barSize={20}
            />
            <Line
              yAxisId='right'
              type='monotone'
              dataKey='adherenceRate'
              name='达成率'
              stroke={designTokens.colors.success.dark}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
