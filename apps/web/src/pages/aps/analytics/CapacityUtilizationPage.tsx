/**
 * 产能利用率分析页
 *
 * 使用 recharts LineChart 展示工作中心利用率趋势：
 * - 各工作中心利用率折线
 * - 目标利用率基准线
 * 数据使用内置 mock 数据。
 */
import { useMemo } from 'react';
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
        <h1 className='text-2xl font-bold'>产能利用率分析</h1>
        <span className='text-sm text-gray-500'>工作中心利用率趋势</span>
      </div>
      <p className='text-sm text-gray-600'>
        展示各工作中心近 12 周的产能利用率趋势，识别瓶颈工序与闲置产能，辅助产能调配决策。
      </p>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>平均利用率</p>
          <p className='mt-1 text-3xl font-bold text-blue-600'>{avgUtilization}%</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>最高利用率</p>
          <p className='mt-1 text-3xl font-bold text-green-600'>{maxUtilization}%</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>最低利用率</p>
          <p className='mt-1 text-3xl font-bold text-orange-600'>{minUtilization}%</p>
        </div>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>工作中心利用率趋势</h3>
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
              label={{ value: '利用率', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip />
            <Legend />
            <ReferenceLine
              y={85}
              stroke='#10b981'
              strokeDasharray='4 4'
              label='目标 85%'
            />
            <Line
              type='monotone'
              dataKey='wcA'
              name='工作中心A'
              stroke='#6366f1'
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              type='monotone'
              dataKey='wcB'
              name='工作中心B'
              stroke='#f59e0b'
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              type='monotone'
              dataKey='wcC'
              name='工作中心C'
              stroke='#10b981'
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
