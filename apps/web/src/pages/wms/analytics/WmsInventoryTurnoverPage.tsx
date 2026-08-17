import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import i18n from '@/i18n';
import { useWmsMock, type WmsMockShape } from '@/api/wms/_mock';
import { designTokens, semanticTokens } from '@topems/tokens';

export default function WmsInventoryTurnoverPage() {
  const { data } = useWmsMock<WmsMockShape>();

  const turnover = useMemo(() => data.turnover ?? [], [data.turnover]);

  const summary = useMemo(() => {
    const totalRate = turnover.reduce((s, t) => s + (t.turnoverRate || 0), 0);
    const totalDays = turnover.reduce((s, t) => s + (t.days || 0), 0);
    const avgRate = turnover.length ? (totalRate / turnover.length).toFixed(2) : '0';
    const avgDays = turnover.length ? (totalDays / turnover.length).toFixed(1) : '0';
    const warehouses = new Set(turnover.map((t) => t.warehouse)).size;
    return { avgRate, avgDays, warehouses, records: turnover.length };
  }, [turnover]);

  return (
    <div className='space-y-4 p-4'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>{i18n.t('pages.wms_inventory_turnover_page.k0')}</h1>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('pages.wms_inventory_turnover_page.k1')}</p>
          <p className='mt-1 text-3xl font-bold text-green-600'>{summary.avgRate}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('pages.wms_inventory_turnover_page.k2')}</p>
          <p className='mt-1 text-3xl font-bold text-blue-600'>
            {i18n.t('pages.wms_inventory_turnover_page.summaryavgdays_0')}
          </p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('pages.wms_inventory_turnover_page.k3')}</p>
          <p className='mt-1 text-3xl font-bold text-purple-600'>{summary.warehouses}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('pages.wms_inventory_turnover_page.k4')}</p>
          <p className='mt-1 text-3xl font-bold text-orange-600'>{summary.records}</p>
        </div>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>{i18n.t('pages.wms_inventory_turnover_page.k5')}</h3>
        <ResponsiveContainer
          width='100%'
          height={360}
        >
          <LineChart
            data={turnover}
            margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis
              dataKey='month'
              fontSize={11}
            />
            <YAxis fontSize={11} />
            <Tooltip />
            <Legend />
            <Line
              type='monotone'
              dataKey='turnoverRate'
              name={i18n.t('pages.wms_inventory_turnover_page.k6')}
              stroke={designTokens.colors.success.dark}
              strokeWidth={2}
              dot={{ r: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>{i18n.t('pages.wms_inventory_turnover_page.k7')}</h3>
        <ResponsiveContainer
          width='100%'
          height={300}
        >
          <BarChart data={turnover.slice(0, 32)}>
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis
              dataKey='month'
              fontSize={11}
            />
            <YAxis fontSize={11} />
            <Tooltip />
            <Legend />
            <Bar
              dataKey='days'
              name={i18n.t('pages.wms_inventory_turnover_page.k8')}
              fill={designTokens.colors.primary.main}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
