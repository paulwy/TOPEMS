import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
import i18n from '@/i18n';
import { designTokens } from '@topems/tokens';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { getAgePareto, type AgeParetoData } from '@/api/wms/analytics';

export default function WmsAgeParetoPage() {
  const { t } = useTranslation();
  const { data: response, loading } = useAnalyticsData({
    fetcher: () => getAgePareto(),
    deps: [],
  });

  const pareto = useMemo(() => {
    return (response?.data ?? []).map((item: AgeParetoData) => ({
      sku: item.age_bucket,
      amount: item.total_value,
      cumulative: item.cumulative_percentage,
      material_count: item.material_count,
    }));
  }, [response]);

  const top80 = useMemo(() => {
    const count = pareto.findIndex((p) => p.cumulative >= 80) + 1;
    return count > 0 ? count : pareto.length;
  }, [pareto]);
  const totalAmount = useMemo(() => pareto.reduce((s, p) => s + p.amount, 0), [pareto]);

  const statCards = useMemo(
    () => [
      {
        id: 'total-amount',
        title: i18n.t('pages.wms_age_pareto_page.k0'),
        value: `¥${totalAmount.toLocaleString()}`,
        color: 'success' as const,
      },
      {
        id: 'top80-count',
        title: i18n.t('pages.wms_age_pareto_page.80sku_1'),
        value: top80,
        suffix: t('wms.age_pareto.suffix_age_bucket'),
        color: 'info' as const,
      },
      {
        id: 'sku-count',
        title: i18n.t('wms.analytics.agePareto.k1'),
        value: pareto.length,
        suffix: t('wms.age_pareto.suffix_age_bucket'),
        color: 'secondary' as const,
      },
      {
        id: 'total-materials',
        title: t('wms.age_pareto.stat_total_materials'),
        value: response?.total_materials ?? 0,
        color: 'warning' as const,
      },
    ],
    [totalAmount, top80, pareto.length, response, t]
  );

  return (
    <StatsPageTemplate
      title={i18n.t('wms.analytics.agePareto.k0')}
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
        <h3 className='mb-2 font-semibold'>{i18n.t('pages.wms_age_pareto_page.k0')}</h3>
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
              fontSize={11}
            />
            <YAxis
              yAxisId='left'
              fontSize={11}
              label={{
                value: i18n.t('pages.wms_age_pareto_page.k2'),
                angle: -90,
                position: 'insideLeft',
              }}
            />
            <YAxis
              yAxisId='right'
              orientation='right'
              domain={[0, 100]}
              unit='%'
              fontSize={11}
              label={{
                value: i18n.t('pages.wms_age_pareto_page.k3'),
                angle: 90,
                position: 'insideRight',
              }}
            />
            <Tooltip />
            <Legend />
            <ReferenceLine
              yAxisId='right'
              y={80}
              stroke={designTokens.colors.error.main}
              strokeDasharray='4 4'
              label={i18n.t('pages.wms_age_pareto_page.80_1')}
            />
            <Bar
              yAxisId='left'
              dataKey='amount'
              name={i18n.t('pages.wms_age_pareto_page.sku_2')}
              fill={designTokens.colors.primary.main}
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId='right'
              type='monotone'
              dataKey='cumulative'
              name={i18n.t('pages.wms_age_pareto_page.k4')}
              stroke={designTokens.colors.success.dark}
              strokeWidth={2.5}
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className='mt-4 rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>{t('wms.age_pareto.section_detail')}</h3>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead className='bg-gray-50'>
              <tr>
                <th className='px-3 py-2 text-left font-medium'>
                  {t('wms.age_pareto.col_age_bucket')}
                </th>
                <th className='px-3 py-2 text-right font-medium'>
                  {t('wms.age_pareto.col_material_count')}
                </th>
                <th className='px-3 py-2 text-right font-medium'>
                  {t('wms.age_pareto.col_inventory_value')}
                </th>
                <th className='px-3 py-2 text-right font-medium'>
                  {t('wms.age_pareto.col_cumulative')}
                </th>
              </tr>
            </thead>
            <tbody>
              {pareto.map((item, i) => (
                <tr
                  key={item.sku}
                  className={i % 2 ? 'bg-gray-50' : ''}
                >
                  <td className='px-3 py-2 font-medium'>{item.sku}</td>
                  <td className='px-3 py-2 text-right'>{item.material_count.toLocaleString()}</td>
                  <td className='px-3 py-2 text-right'>¥{item.amount.toLocaleString()}</td>
                  <td className='px-3 py-2 text-right'>{item.cumulative.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </StatsPageTemplate>
  );
}
