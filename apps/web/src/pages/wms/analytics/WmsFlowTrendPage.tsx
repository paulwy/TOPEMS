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
import i18n from '@/i18n';
import { useWmsMock, type WmsMockShape } from '@/api/wms/_mock';
import { designTokens, semanticTokens } from '@topems/tokens';

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
        <h1 className='text-2xl font-bold'>{i18n.t('pages.wms_flow_trend_page.30_0')}</h1>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value as '7d' | '15d' | '30d')}
          className='border rounded px-3 py-1.5 text-sm'
          aria-label={i18n.t('pages.wms_flow_trend_page.k1')}
        >
          <option value='7d'>{i18n.t('pages.wms_flow_trend_page.7_2')}</option>
          <option value='15d'>{i18n.t('pages.wms_flow_trend_page.15_3')}</option>
          <option value='30d'>{i18n.t('pages.wms_flow_trend_page.30_4')}</option>
        </select>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('pages.wms_flow_trend_page.k5')}</p>
          <p className='mt-1 text-3xl font-bold text-green-600'>{totals.inb.toLocaleString()}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('pages.wms_flow_trend_page.k6')}</p>
          <p className='mt-1 text-3xl font-bold text-blue-600'>{totals.out.toLocaleString()}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('pages.wms_flow_trend_page.k7')}</p>
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
          <p className='text-sm text-gray-600'>{i18n.t('pages.wms_flow_trend_page.k8')}</p>
          <p className='mt-1 text-3xl font-bold text-purple-600'>{i18n.t('pages.wms_flow_trend_page.totalsdays_0')}</p>
        </div>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>{i18n.t('pages.wms_flow_trend_page.k1')}</h3>
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
                  stopColor={designTokens.colors.success.dark}
                  stopOpacity={0.6}
                />
                <stop
                  offset='95%'
                  stopColor={designTokens.colors.success.dark}
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
                  stopColor={designTokens.colors.primary.main}
                  stopOpacity={0.6}
                />
                <stop
                  offset='95%'
                  stopColor={designTokens.colors.primary.main}
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
                  stopColor={designTokens.colors.warning.main}
                  stopOpacity={0.5}
                />
                <stop
                  offset='95%'
                  stopColor={designTokens.colors.warning.main}
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
              label={{ value: i18n.t('pages.wms_flow_trend_page.k9'), angle: -90, position: 'insideLeft' }}
            />
            <Tooltip />
            <Legend />
            <Area
              type='monotone'
              dataKey='inboundQty'
              name={i18n.t('pages.wms_flow_trend_page.k10')}
              stroke={designTokens.colors.success.dark}
              fill='url(#inbGrad)'
              strokeWidth={2}
            />
            <Area
              type='monotone'
              dataKey='outboundQty'
              name={i18n.t('pages.wms_flow_trend_page.k11')}
              stroke={designTokens.colors.primary.main}
              fill='url(#outGrad)'
              strokeWidth={2}
            />
            <Area
              type='monotone'
              dataKey='net'
              name={i18n.t('pages.wms_flow_trend_page.k12')}
              stroke={designTokens.colors.warning.main}
              fill='url(#netGrad)'
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
