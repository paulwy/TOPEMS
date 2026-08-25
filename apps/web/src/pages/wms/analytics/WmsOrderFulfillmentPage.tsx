import { useMemo } from 'react';
import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import i18n from '@/i18n';
import { useWmsMock, type WmsMockShape } from '@/api/wms/_mock';
import { designTokens } from '@topems/tokens';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';

function getColor(rate: number): string {
  if (rate >= 95) return designTokens.colors.success.dark;
  if (rate >= 90) return designTokens.colors.primary.main;
  if (rate >= 85) return designTokens.colors.warning.main;
  return designTokens.colors.error.main;
}

export default function WmsOrderFulfillmentPage() {
  const { data } = useWmsMock<WmsMockShape>();

  const fulfillment = useMemo(() => data.fulfillment ?? [], [data.fulfillment]);

  const { avgOnTime, avgHours, avgSla, best } = useMemo(() => {
    if (fulfillment.length === 0) {
      return { avgOnTime: 0, avgHours: 0, avgSla: 0, best: '-' };
    }
    const onTime = fulfillment.reduce((s, f) => s + f.onTimeRate, 0) / fulfillment.length;
    const hours = fulfillment.reduce((s, f) => s + f.avgHours, 0) / fulfillment.length;
    const sla = fulfillment.reduce((s, f) => s + f.slaPass, 0) / fulfillment.length;
    const bestWh = [...fulfillment].sort((a, b) => b.onTimeRate - a.onTimeRate)[0];
    return {
      avgOnTime: Number(onTime.toFixed(1)),
      avgHours: Number(hours.toFixed(1)),
      avgSla: Number(sla.toFixed(1)),
      best: bestWh?.warehouse ?? '-',
    };
  }, [fulfillment]);

  const statCards = useMemo(
    () => [
      {
        id: 'avg-on-time',
        title: i18n.t('pages.wms_order_fulfillment_page.k1'),
        value: avgOnTime,
        suffix: '%',
        color: 'success' as const,
      },
      {
        id: 'avg-hours',
        title: i18n.t('pages.wms_order_fulfillment_page.k2'),
        value: avgHours,
        suffix: i18n.t('pages.wms_order_fulfillment_page.avgours_0'),
        color: 'info' as const,
      },
      {
        id: 'avg-sla',
        title: i18n.t('pages.wms_order_fulfillment_page.l_1'),
        value: avgSla,
        suffix: '%',
        color: 'secondary' as const,
      },
      {
        id: 'best-warehouse',
        title: i18n.t('pages.wms_order_fulfillment_page.k3'),
        value: best,
        color: 'warning' as const,
      },
    ],
    [avgOnTime, avgHours, avgSla, best]
  );

  return (
    <StatsPageTemplate
      title={i18n.t('pages.wms_order_fulfillment_page.sla_0')}
      statCards={statCards}
      showSearch={false}
      showTimeRange={false}
      showExport={false}
      showRefresh={false}
      showCharts={false}
      showTables={false}
    >
      <div className='space-y-4'>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <div className='rounded-lg border p-4'>
            <h3 className='mb-2 font-semibold'>{i18n.t('pages.wms_order_fulfillment_page.l_2')}</h3>
            <ResponsiveContainer
              width='100%'
              height={360}
            >
              <RadialBarChart
                innerRadius='20%'
                outerRadius='100%'
                data={fulfillment.map((f) => ({
                  ...f,
                  fill: getColor(f.onTimeRate),
                }))}
                startAngle={180}
                endAngle={0}
                barCategoryGap='20%'
              >
                <RadialBar
                  dataKey='onTimeRate'
                  name={i18n.t('pages.wms_order_fulfillment_page.k4')}
                  cornerRadius={8}
                  background={{ fill: 'colors.grey.100' }}
                />
                <Legend
                  iconSize={10}
                  layout='horizontal'
                  verticalAlign='bottom'
                />
                <Tooltip
                  formatter={(v: unknown) => [
                    `${v}%`,
                    i18n.t('pages.wms_order_fulfillment_page.k5'),
                  ]}
                />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>

          <div className='rounded-lg border p-4'>
            <h3 className='mb-2 font-semibold'>
              {i18n.t('pages.wms_order_fulfillment_page.by_6')}
            </h3>
            <ResponsiveContainer
              width='100%'
              height={360}
            >
              <BarChart
                data={fulfillment}
                layout='vertical'
              >
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis
                  type='number'
                  fontSize={11}
                />
                <YAxis
                  type='category'
                  dataKey='warehouse'
                  fontSize={12}
                  width={80}
                />
                <Tooltip />
                <Bar
                  dataKey='avgHours'
                  name={i18n.t('pages.wms_order_fulfillment_page.k7')}
                  radius={[0, 6, 6, 0]}
                >
                  {fulfillment.map((f, i) => (
                    <Cell
                      key={i}
                      fill={
                        f.avgHours <= 10
                          ? designTokens.colors.success.dark
                          : f.avgHours <= 15
                            ? designTokens.colors.primary.main
                            : f.avgHours <= 20
                              ? designTokens.colors.warning.main
                              : designTokens.colors.error.main
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className='rounded-lg border p-4'>
          <h3 className='mb-2 font-semibold'>{i18n.t('pages.wms_order_fulfillment_page.lvs_3')}</h3>
          <ResponsiveContainer
            width='100%'
            height={300}
          >
            <BarChart data={fulfillment}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis
                dataKey='warehouse'
                fontSize={12}
              />
              <YAxis
                domain={[80, 100]}
                fontSize={11}
              />
              <Tooltip />
              <Legend />
              <Bar
                dataKey='onTimeRate'
                name={i18n.t('pages.wms_order_fulfillment_page.k8')}
                fill={designTokens.colors.primary.main}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey='slaPass'
                name={i18n.t('pages.wms_order_fulfillment_page.sla_0')}
                fill={designTokens.colors.success.dark}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </StatsPageTemplate>
  );
}
