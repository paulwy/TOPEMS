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
import { useWmsMock, type WmsMockShape } from '@/api/wms/_mock';
import { designTokens, semanticTokens } from '@topems/tokens';

export default function WmsAgeParetoPage() {
  const { data } = useWmsMock<WmsMockShape>();

  const pareto = useMemo(() => data.agePareto ?? [], [data.agePareto]);

  const top80 = useMemo(() => {
    const count = pareto.findIndex((p) => p.cumulative >= 80) + 1;
    return count > 0 ? count : pareto.length;
  }, [pareto]);

  const totalAmount = useMemo(() => pareto.reduce((s, p) => s + p.amount, 0), [pareto]);

  return (
    <div className='space-y-4 p-4'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>库龄帕累托分析（80/20 规则）</h1>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>累计库存金额</p>
          <p className='mt-1 text-3xl font-bold text-green-600'>¥{totalAmount.toLocaleString()}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>覆盖 80% 金额的 SKU 数</p>
          <p className='mt-1 text-3xl font-bold text-blue-600'>{top80}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>SKU 总数</p>
          <p className='mt-1 text-3xl font-bold text-purple-600'>{pareto.length}</p>
        </div>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>
          SKU 库龄金额分布（Bar）+ 累计占比（Line）+ 80% 参考线
        </h3>
        <ResponsiveContainer
          width='100%'
          height={420}
        >
          <ComposedChart
            data={pareto}
            margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis
              dataKey='sku'
              fontSize={10}
              angle={-30}
              textAnchor='end'
              height={80}
            />
            <YAxis
              yAxisId='left'
              fontSize={11}
              label={{ value: '库存金额', angle: -90, position: 'insideLeft' }}
            />
            <YAxis
              yAxisId='right'
              orientation='right'
              domain={[0, 100]}
              unit='%'
              fontSize={11}
              label={{ value: '累计占比', angle: 90, position: 'insideRight' }}
            />
            <Tooltip />
            <Legend />
            <ReferenceLine
              yAxisId='right'
              y={80}
              stroke={designTokens.colors.error.main}
              strokeDasharray='4 4'
              label='80% 线'
            />
            <ReferenceLine
              yAxisId='right'
              y={20}
              stroke={designTokens.colors.secondary.dark}
              strokeDasharray='2 2'
              label='20% SKU'
            />
            <Bar
              yAxisId='left'
              dataKey='amount'
              name='SKU 金额'
              fill={designTokens.colors.primary.main}
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId='right'
              type='monotone'
              dataKey='cumulative'
              name='累计占比 %'
              stroke={designTokens.colors.success.dark}
              strokeWidth={2.5}
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
