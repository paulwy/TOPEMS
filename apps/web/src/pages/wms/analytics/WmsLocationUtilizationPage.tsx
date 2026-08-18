import { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import i18n from '@/i18n';
import { useWmsMock, type WmsMockShape } from '@/api/wms/mock';
import { designTokens, semanticTokens } from '@topems/tokens';

export default function WmsLocationUtilizationPage() {
  const { data } = useWmsMock<WmsMockShape>();
  const locationUtil = useMemo(() => data.locationUtil ?? [], [data.locationUtil]);
  const avgUtil = useMemo(() => {
    if (locationUtil.length === 0) return 0;
    return Math.round(locationUtil.reduce((s, l) => s + l.utilization, 0) / locationUtil.length);
  }, [locationUtil]);
  const avgDead = useMemo(() => {
    if (locationUtil.length === 0) return 0;
    return Math.round(locationUtil.reduce((s, l) => s + l.deadStock, 0) / locationUtil.length);
  }, [locationUtil]);
  return (
    <div className='space-y-4 p-4'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>{i18n.t('pages.wms_location_utilization_page.k0')}</h1>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>
            {i18n.t('pages.wms_location_utilization_page.k1')}
          </p>
          <p className='mt-1 text-3xl font-bold text-green-600'>{avgUtil}%</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>
            {i18n.t('pages.wms_location_utilization_page.k2')}
          </p>
          <p className='mt-1 text-3xl font-bold text-blue-600'>{100 - avgUtil - avgDead}%</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>
            {i18n.t('pages.wms_location_utilization_page.k3')}
          </p>
          <p className='mt-1 text-3xl font-bold text-red-600'>{avgDead}%</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>
            {i18n.t('pages.wms_location_utilization_page.k4')}
          </p>
          <p className='mt-1 text-3xl font-bold text-purple-600'>{locationUtil.length}</p>
        </div>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>{i18n.t('wms.analytics.locationUtilization.k0')}</h3>
        <ResponsiveContainer
          width='100%'
          height={400}
        >
          <BarChart
            data={locationUtil}
            margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis
              dataKey='area'
              fontSize={12}
            />
            <YAxis
              domain={[0, 100]}
              fontSize={11}
            />
            <Tooltip
              formatter={(v: unknown, n: unknown) => {
                const labels: Record<string, string> = {
                  utilization: i18n.t('pages.wms_location_utilization_page.k5'),
                  vacancy: i18n.t('pages.wms_location_utilization_page.k6'),
                  deadStock: i18n.t('pages.wms_location_utilization_page.k7'),
                };
                return [`${v}%`, labels[String(n)] ?? String(n)];
              }}
            />
            <Legend />
            <Bar
              dataKey='utilization'
              name={i18n.t('pages.wms_location_utilization_page.k8')}
              stackId='a'
              fill={designTokens.colors.success.dark}
            />
            <Bar
              dataKey='vacancy'
              name={i18n.t('pages.wms_location_utilization_page.k9')}
              stackId='a'
              fill={designTokens.colors.primary.main}
            />
            <Bar
              dataKey='deadStock'
              name={i18n.t('pages.wms_location_utilization_page.k10')}
              stackId='a'
              fill={designTokens.colors.error.main}
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
