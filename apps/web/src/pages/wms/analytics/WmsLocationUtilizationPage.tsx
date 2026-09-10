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
import { designTokens } from '@topems/tokens';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { getLocationUtilization, type LocationUtilizationData } from '@/api/wms/analytics';

export default function WmsLocationUtilizationPage() {
  const { data: response, loading, error, reload } = useAnalyticsData({
    fetcher: () => getLocationUtilization(),
    deps: [],
  });

  const locationUtil = useMemo(() => {
    return (response?.data ?? []).map((item: LocationUtilizationData) => {
      const vacancy = Math.max(0, 100 - item.utilization_rate - (item.dead_stock_locations / Math.max(1, item.total_locations)) * 100);
      return {
        area: item.warehouse_name,
        utilization: item.utilization_rate,
        vacancy: Math.round(vacancy * 10) / 10,
        deadStock: Math.round((item.dead_stock_locations / Math.max(1, item.total_locations)) * 1000) / 10,
        total_locations: item.total_locations,
        used_locations: item.used_locations,
        dead_stock_locations: item.dead_stock_locations,
      };
    });
  }, [response]);

  const avgUtil = useMemo(() => {
    if (locationUtil.length === 0) return 0;
    return Math.round(locationUtil.reduce((s, l) => s + l.utilization, 0) / locationUtil.length);
  }, [locationUtil]);
  const avgDead = useMemo(() => {
    if (locationUtil.length === 0) return 0;
    return Math.round(locationUtil.reduce((s, l) => s + l.deadStock, 0) / locationUtil.length);
  }, [locationUtil]);

  const statCards = useMemo(
    () => [
      {
        id: 'avg-utilization',
        title: i18n.t('pages.wms_location_utilization_page.k1'),
        value: response?.overall_utilization ?? avgUtil,
        suffix: '%',
        color: 'success' as const,
      },
      {
        id: 'total-locations',
        title: '库位总数',
        value: response?.total_locations ?? 0,
        color: 'info' as const,
      },
      {
        id: 'used-locations',
        title: '已用库位',
        value: response?.used_locations ?? 0,
        color: 'warning' as const,
      },
      {
        id: 'warehouse-count',
        title: i18n.t('pages.wms_location_utilization_page.k4'),
        value: locationUtil.length,
        suffix: '个仓库',
        color: 'secondary' as const,
      },
    ],
    [avgUtil, avgDead, locationUtil.length, response]
  );

  return (
    <StatsPageTemplate
      title={i18n.t('pages.wms_location_utilization_page.k0')}
      statCards={statCards}
      showSearch={false}
      showTimeRange={false}
      showExport={false}
      showRefresh={false}
      showCharts={false}
      showTables={false}
      loading={loading}
    >
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

      <div className='mt-4 rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>仓库库位明细</h3>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead className='bg-gray-50'>
              <tr>
                <th className='px-3 py-2 text-left font-medium'>仓库</th>
                <th className='px-3 py-2 text-right font-medium'>库位总数</th>
                <th className='px-3 py-2 text-right font-medium'>已用库位</th>
                <th className='px-3 py-2 text-right font-medium'>利用率</th>
                <th className='px-3 py-2 text-right font-medium'>呆滞库位</th>
              </tr>
            </thead>
            <tbody>
              {locationUtil.map((item, i) => (
                <tr
                  key={item.area}
                  className={i % 2 ? 'bg-gray-50' : ''}
                >
                  <td className='px-3 py-2 font-medium'>{item.area}</td>
                  <td className='px-3 py-2 text-right'>{item.total_locations.toLocaleString()}</td>
                  <td className='px-3 py-2 text-right'>{item.used_locations.toLocaleString()}</td>
                  <td className='px-3 py-2 text-right'>{item.utilization.toFixed(1)}%</td>
                  <td className='px-3 py-2 text-right text-red-600'>{item.dead_stock_locations.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </StatsPageTemplate>
  );
}
