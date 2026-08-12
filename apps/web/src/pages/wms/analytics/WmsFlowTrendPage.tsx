import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useWmsMock, type WmsMockShape } from '@/api/wms/_mock';

export default function WmsFlowTrendPage() {
  const { data } = useWmsMock<WmsMockShape>();
  const [range, setRange] = useState<'7d' | '15d' | '30d'>('30d');

  const flow = useMemo(() => {
    const list = data.flowTrend ?? [];
    if (range === '7d') return list.slice(-7);
    if (range === '15d') return list.slice(-15);
    return list;
  }, [data.flowTrend, range]);

  const totals = useMemo(() => {
    const inb = flow.reduce((s, f) => s + f.inboundQty, 0);
    const out = flow.reduce((s, f) => s + f.outboundQty, 0);
    const net = inb - out;
    return { inb, out, net, days: flow.length };
  }, [flow]);

  return (
    <div className='space-y-4 p-4'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>出入库流量趋势（最近 30 天）</h1>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value as '7d' | '15d' | '30d')}
          className='border rounded px-3 py-1.5 text-sm'
          aria-label='时间范围'
        >
          <option value='7d'>近 7 天</option>
          <option value='15d'>近 15 天</option>
          <option value='30d'>近 30 天</option>
        </select>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>累计入库</p>
          <p className='mt-1 text-3xl font-bold text-green-600'>{totals.inb.toLocaleString()}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>累计出库</p>
          <p className='mt-1 text-3xl font-bold text-blue-600'>{totals.out.toLocaleString()}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>净出入库</p>
          <p
            className={`mt-1 text-3xl font-bold ${
              totals.net >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {totals.net >= 0 ? '+' : ''}
            {totals.net.toLocaleString()}
          </p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>统计天数</p>
          <p className='mt-1 text-3xl font-bold text-purple-600'>{totals.days} 天</p>
        </div>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>出入库流量（Area 3 系列：入库 / 出库 / 净流量）</h3>
        <ResponsiveContainer
          width='100%'
          height={380}
        >
          <AreaChart
            data={flow}
            margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
          >
            <defs>
              <linearGradient
                id='inbGrad'
                x1='0'
                y1='0'
                x2='0'
                y2='1'
              >
                <stop
                  offset='5%'
                  stopColor='#10b981'
                  stopOpacity={0.6}
                />
                <stop
                  offset='95%'
                  stopColor='#10b981'
                  stopOpacity={0.05}
                />
              </linearGradient>
              <linearGradient
                id='outGrad'
                x1='0'
                y1='0'
                x2='0'
                y2='1'
              >
                <stop
                  offset='5%'
                  stopColor='#3b82f6'
                  stopOpacity={0.6}
                />
                <stop
                  offset='95%'
                  stopColor='#3b82f6'
                  stopOpacity={0.05}
                />
              </linearGradient>
              <linearGradient
                id='netGrad'
                x1='0'
                y1='0'
                x2='0'
                y2='1'
              >
                <stop
                  offset='5%'
                  stopColor='#f59e0b'
                  stopOpacity={0.5}
                />
                <stop
                  offset='95%'
                  stopColor='#f59e0b'
                  stopOpacity={0.05}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis
              dataKey='date'
              fontSize={11}
            />
            <YAxis
              fontSize={11}
              label={{ value: '数量', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip />
            <Legend />
            <Area
              type='monotone'
              dataKey='inboundQty'
              name='入库量'
              stroke='#10b981'
              fill='url(#inbGrad)'
              strokeWidth={2}
            />
            <Area
              type='monotone'
              dataKey='outboundQty'
              name='出库量'
              stroke='#3b82f6'
              fill='url(#outGrad)'
              strokeWidth={2}
            />
            <Area
              type='monotone'
              dataKey='net'
              name='净流量'
              stroke='#f59e0b'
              fill='url(#netGrad)'
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
