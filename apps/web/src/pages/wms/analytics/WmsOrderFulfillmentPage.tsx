import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  ComposedChart,
} from 'recharts';
import i18n from '@/i18n';
import { designTokens } from '@topems/tokens';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';
import { useAnalyticsData, getDefaultDateRange } from '@/hooks/useAnalyticsData';
import { wmsAnalyticsApi } from '@/api/wms/analytics';
import type { WmsOrderFulfillmentData } from '@/api/wms/analytics';

export default function WmsOrderFulfillmentPage() {
  const { t } = useTranslation();
  const { startDate, endDate } = getDefaultDateRange();
  const [groupBy, setGroupBy] = useState<'month' | 'week' | 'day'>('month');

  const { data, loading, error, reload } = useAnalyticsData({
    fetcher: () =>
      wmsAnalyticsApi.getOrderFulfillment({
        start_date: startDate,
        end_date: endDate,
        group_by: groupBy,
      }),
    deps: [startDate, endDate, groupBy],
  });

  // 适配后端数据格式到图表格式
  const chartData = useMemo(() => {
    if (!data?.data) return [];
    return data.data.map((item: WmsOrderFulfillmentData) => ({
      period: item.period,
      totalOrders: item.total_orders,
      fulfilledOrders: item.fulfilled_orders,
      fulfillmentRate: item.fulfillment_rate,
      avgDays: item.avg_fulfillment_days,
      onTimeOrders: item.on_time_orders,
      onTimeRate: item.on_time_rate,
    }));
  }, [data]);

  const summary = useMemo(() => {
    if (!data?.summary) {
      return { fulfillmentRate: 0, avgDays: 0, onTimeRate: 0, totalOrders: 0 };
    }
    return {
      fulfillmentRate: data.summary.fulfillment_rate,
      avgDays: data.summary.avg_fulfillment_days,
      onTimeRate: data.summary.on_time_rate,
      totalOrders: data.summary.total_orders,
    };
  }, [data]);

  const statCards = useMemo(
    () => [
      {
        id: 'fulfillment-rate',
        title: t('wms.order_fulfillment.stat_fulfillment_rate'),
        value: summary.fulfillmentRate.toFixed(1),
        suffix: '%',
        color: 'success' as const,
      },
      {
        id: 'avg-days',
        title: t('wms.order_fulfillment.stat_avg_days'),
        value: summary.avgDays.toFixed(1),
        suffix: t('wms.order_fulfillment.unit_day'),
        color: 'info' as const,
      },
      {
        id: 'on-time-rate',
        title: t('wms.order_fulfillment.stat_on_time_rate'),
        value: summary.onTimeRate.toFixed(1),
        suffix: '%',
        color: 'secondary' as const,
      },
      {
        id: 'total-orders',
        title: t('wms.order_fulfillment.stat_total_orders'),
        value: summary.totalOrders,
        color: 'warning' as const,
      },
    ],
    [summary, t]
  );

  if (loading) {
    return (
      <StatsPageTemplate
        title={i18n.t('pages.wms_order_fulfillment_page.sla_0')}
        statCards={[]}
        showSearch={false}
        showTimeRange={false}
        showExport={false}
        showRefresh={false}
        showCharts={false}
        showTables={false}
      >
        <div className='flex h-64 items-center justify-center'>
          <div className='text-gray-500'>{t('wms.order_fulfillment.loading')}</div>
        </div>
      </StatsPageTemplate>
    );
  }

  if (error) {
    return (
      <StatsPageTemplate
        title={i18n.t('pages.wms_order_fulfillment_page.sla_0')}
        statCards={[]}
        showSearch={false}
        showTimeRange={false}
        showExport={false}
        showRefresh={false}
        showCharts={false}
        showTables={false}
      >
        <div className='flex h-64 flex-col items-center justify-center gap-4'>
          <div className='text-red-500'>
            {t('wms.order_fulfillment.load_failed')}: {error}
          </div>
          <button
            onClick={reload}
            className='rounded bg-primary px-4 py-2 text-white hover:bg-primary-dark'
          >
            {t('wms.order_fulfillment.retry')}
          </button>
        </div>
      </StatsPageTemplate>
    );
  }

  return (
    <StatsPageTemplate
      title={i18n.t('pages.wms_order_fulfillment_page.sla_0')}
      statCards={statCards}
      showSearch={false}
      showTimeRange={false}
      showExport={false}
      showRefresh={true}
      onRefresh={reload}
      showCharts={false}
      showTables={false}
    >
      <div className='space-y-4'>
        {/* 时间粒度选择 */}
        <div className='flex items-center gap-4'>
          <span className='text-sm text-gray-600'>
            {t('wms.order_fulfillment.time_granularity')}:
          </span>
          <div className='flex gap-2'>
            {(['month', 'week', 'day'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                className={`rounded px-3 py-1 text-sm ${
                  groupBy === g
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {g === 'month'
                  ? t('wms.order_fulfillment.granularity_month')
                  : g === 'week'
                    ? t('wms.order_fulfillment.granularity_week')
                    : t('wms.order_fulfillment.granularity_day')}
              </button>
            ))}
          </div>
        </div>

        {/* 履约率趋势图 */}
        <div className='rounded-lg border p-4'>
          <h3 className='mb-2 font-semibold'>
            {t('wms.order_fulfillment.chart_fulfillment_trend')}
          </h3>
          <ResponsiveContainer
            width='100%'
            height={360}
          >
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis
                dataKey='period'
                fontSize={11}
              />
              <YAxis
                yAxisId='left'
                fontSize={11}
                domain={[0, 100]}
              />
              <YAxis
                yAxisId='right'
                orientation='right'
                fontSize={11}
              />
              <Tooltip />
              <Legend />
              <Area
                yAxisId='left'
                type='monotone'
                dataKey='fulfillmentRate'
                name={t('wms.order_fulfillment.series_fulfillment_rate')}
                fill={designTokens.colors.success.light}
                stroke={designTokens.colors.success.dark}
                strokeWidth={2}
              />
              <Line
                yAxisId='left'
                type='monotone'
                dataKey='onTimeRate'
                name={t('wms.order_fulfillment.series_on_time_rate')}
                stroke={designTokens.colors.primary.main}
                strokeWidth={2}
                dot={{ r: 2 }}
              />
              <Bar
                yAxisId='right'
                dataKey='totalOrders'
                name={t('wms.order_fulfillment.series_order_count')}
                fill={designTokens.colors.secondary.light}
                radius={[4, 4, 0, 0]}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* 平均履约天数趋势 */}
        <div className='rounded-lg border p-4'>
          <h3 className='mb-2 font-semibold'>{t('wms.order_fulfillment.chart_avg_days_trend')}</h3>
          <ResponsiveContainer
            width='100%'
            height={300}
          >
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis
                dataKey='period'
                fontSize={11}
              />
              <YAxis fontSize={11} />
              <Tooltip />
              <Legend />
              <Bar
                dataKey='avgDays'
                name={t('wms.order_fulfillment.stat_avg_days')}
                fill={designTokens.colors.primary.main}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 订单数量对比 */}
        <div className='rounded-lg border p-4'>
          <h3 className='mb-2 font-semibold'>
            {t('wms.order_fulfillment.chart_order_comparison')}
          </h3>
          <ResponsiveContainer
            width='100%'
            height={300}
          >
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis
                dataKey='period'
                fontSize={11}
              />
              <YAxis fontSize={11} />
              <Tooltip />
              <Legend />
              <Bar
                dataKey='totalOrders'
                name={t('wms.order_fulfillment.series_total_orders')}
                fill={designTokens.colors.secondary.light}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey='fulfilledOrders'
                name={t('wms.order_fulfillment.series_fulfilled')}
                fill={designTokens.colors.success.dark}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey='onTimeOrders'
                name={t('wms.order_fulfillment.series_on_time_fulfilled')}
                fill={designTokens.colors.primary.main}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </StatsPageTemplate>
  );
}
