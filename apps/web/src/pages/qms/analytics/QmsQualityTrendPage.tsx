/**
 * 质量趋势分析页
 *
 * 使用 recharts LineChart 展示月度质量趋势：
 * - 合格率（左 Y 轴，%）
 * - 问题数 / 缺陷数（右 Y 轴，计数）
 * 数据来自 useQmsMock 的 qualityTrend。
 */
import { useMemo, useState } from 'react';
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
import { useQmsMock, type QmsMockShape } from '@/api/qms/_mock';

export default function QmsQualityTrendPage() {
  const { data } = useQmsMock<QmsMockShape>();
  const [range, setRange] = useState<'6m' | '12m'>('12m');

  const trend = useMemo(() => {
    const list = data.qualityTrend ?? [];
    return range === '6m' ? list.slice(-6) : list;
  }, [data.qualityTrend, range]);

  const avgPassRate = useMemo(() => {
    if (trend.length === 0) return 0;
    return Math.round((trend.reduce((s, t) => s + t.passRate, 0) / trend.length) * 10) / 10;
  }, [trend]);

  const totalDefects = useMemo(() => trend.reduce((s, t) => s + t.defectCount, 0), [trend]);

  return (
    <div className='space-y-4 p-4'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>质量趋势分析</h1>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value as '6m' | '12m')}
          className='border rounded px-3 py-1.5 text-sm'
          aria-label='时间范围'
        >
          <option value='6m'>近 6 个月</option>
          <option value='12m'>近 12 个月</option>
        </select>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>平均合格率</p>
          <p className='mt-1 text-3xl font-bold text-green-600'>{avgPassRate}%</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>累计缺陷数</p>
          <p className='mt-1 text-3xl font-bold text-red-600'>{totalDefects}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>统计周期</p>
          <p className='mt-1 text-3xl font-bold text-blue-600'>{trend.length} 月</p>
        </div>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>合格率与缺陷数趋势（双 Y 轴）</h3>
        <ResponsiveContainer
          width='100%'
          height={340}
        >
          <LineChart
            data={trend}
            margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis
              dataKey='date'
              fontSize={11}
            />
            <YAxis
              yAxisId='left'
              domain={[70, 100]}
              unit='%'
              fontSize={11}
              label={{ value: '合格率', angle: -90, position: 'insideLeft' }}
            />
            <YAxis
              yAxisId='right'
              orientation='right'
              fontSize={11}
              label={{ value: '缺陷数', angle: 90, position: 'insideRight' }}
            />
            <Tooltip />
            <Legend />
            <ReferenceLine
              yAxisId='left'
              y={95}
              stroke='#10b981'
              strokeDasharray='4 4'
              label='目标 95%'
            />
            <Line
              yAxisId='left'
              type='monotone'
              dataKey='passRate'
              name='合格率'
              stroke='#10b981'
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              yAxisId='right'
              type='monotone'
              dataKey='defectCount'
              name='缺陷数'
              stroke='#ef4444'
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              yAxisId='right'
              type='monotone'
              dataKey='issueCount'
              name='问题数'
              stroke='#f59e0b'
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>检验量趋势</h3>
        <ResponsiveContainer
          width='100%'
          height={240}
        >
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis
              dataKey='date'
              fontSize={11}
            />
            <YAxis fontSize={11} />
            <Tooltip />
            <Legend />
            <Line
              type='monotone'
              dataKey='inspectionCount'
              name='检验批次'
              stroke='#6366f1'
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
