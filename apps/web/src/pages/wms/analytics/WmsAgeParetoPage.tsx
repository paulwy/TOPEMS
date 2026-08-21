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
import i18n from '@/i18n';
import { useWmsMock, type WmsMockShape } from '@/api/wms/_mock';
import { designTokens } from '@topems/tokens';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';

export default function WmsAgeParetoPage() {
  const { data } = useWmsMock<WmsMockShape>();
  const pareto = useMemo(() => data.agePareto ?? [], [data.agePareto]);
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
        color: 'info' as const,
      },
      {
        id: 'sku-count',
        title: i18n.t('wms.analytics.agePareto.k1'),
        value: pareto.length,
        color: 'secondary' as const,
      },
    ],
    [totalAmount, top80, pareto.length]
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
              fontSize={10}
              angle={-30}
              textAnchor='end'
              height={80}
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
    </StatsPageTemplate>
  );
}
