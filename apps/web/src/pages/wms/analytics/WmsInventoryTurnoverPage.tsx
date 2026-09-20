import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { designTokens } from '@topems/tokens';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';
import { useAnalyticsData, getDefaultDateRange } from '@/hooks/useAnalyticsData';
import { wmsAnalyticsApi } from '@/api/wms/analytics';
import type { InventoryTurnoverData } from '@/api/wms/types';

export default function WmsInventoryTurnoverPage() {
  const { t } = useTranslation();
  const { startDate, endDate } = getDefaultDateRange();
  const [groupBy, setGroupBy] = useState<'month' | 'week' | 'day'>('month');

  const { data, loading, error, reload } = useAnalyticsData({
    fetcher: () =>
      wmsAnalyticsApi.getInventoryTurnover({
        start_date: startDate,
        end_date: endDate,
        group_by: groupBy,
      }),
    deps: [startDate, endDate, groupBy],
  });

  // 适配后端数据格式到图表格式
  const chartData = useMemo(() => {
    if (!data?.data) return [];
    return data.data.map((item: InventoryTurnoverData) => ({
      month: item.period,
      turnoverRate: item.turnover_rate,
      days: item.turnover_days,
      outboundCount: item.outbound_count,
      costOfGoods: item.cost_of_goods_sold,
      avgInventory: item.average_inventory_value,
    }));
  }, [data]);

  const summary = useMemo(() => {
    if (!data?.summary) {
      return { avgRate: '0', avgDays: '0', outbound: 0, records: 0 };
    }
    const avgRate = data.summary.avg_turnover.toFixed(2);
    const avgDays =
      data.summary.avg_turnover > 0 ? (30 / data.summary.avg_turnover).toFixed(1) : '0';
    return {
      avgRate,
      avgDays,
      outbound: data.summary.total_outbound,
      records: data.summary.period_count,
    };
  }, [data]);

  const statCards = useMemo(
    () => [
      {
        id: 'avg-rate',
        title: i18n.t('pages.wms_inventory_turnover_page.k1'),
        value: summary.avgRate,
        color: 'success' as const,
      },
      {
        id: 'avg-days',
        title: i18n.t('pages.wms_inventory_turnover_page.k2'),
        value: summary.avgDays,
        suffix: i18n.t('pages.wms_inventory_turnover_page.summaryavgdays_0'),
        color: 'info' as const,
      },
      {
        id: 'outbound-count',
        title: t('wms.inventory_turnover.stat_outbound_count'),
        value: summary.outbound,
        color: 'secondary' as const,
      },
      {
        id: 'record-count',
        title: i18n.t('pages.wms_inventory_turnover_page.k4'),
        value: summary.records,
        color: 'warning' as const,
      },
    ],
    [summary]
  );

  if (loading) {
    return (
      <StatsPageTemplate
        title={i18n.t('pages.wms_inventory_turnover_page.k0')}
        statCards={[]}
        showSearch={false}
        showTimeRange={false}
        showExport={false}
        showRefresh={false}
        showCharts={false}
        showTables={false}
      >
        <div className='flex h-64 items-center justify-center'>
          <div className='text-gray-500'>{t('wms.inventory_turnover.loading')}</div>
        </div>
      </StatsPageTemplate>
    );
  }

  if (error) {
    return (
      <StatsPageTemplate
        title={i18n.t('pages.wms_inventory_turnover_page.k0')}
        statCards={[]}
        showSearch={false}
        showTimeRange={false}
        showExport={false}
        showRefresh={false}
        showCharts={false}
        showTables={false}
      >
        <div className='flex h-64 flex-col items-center justify-center gap-4'>
          <div className='text-red-500'>{t('wms.inventory_turnover.load_failed')}: {error}</div>
          <button
            onClick={reload}
            className='rounded bg-primary px-4 py-2 text-white hover:bg-primary-dark'
          >
            {t('wms.inventory_turnover.retry')}
          </button>
        </div>
      </StatsPageTemplate>
    );
  }

  return (
    <StatsPageTemplate
      title={i18n.t('pages.wms_inventory_turnover_page.k0')}
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
          <span className='text-sm text-gray-600'>{t('wms.inventory_turnover.time_granularity')}:</span>
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
                  ? t('wms.inventory_turnover.granularity_month')
                  : g === 'week'
                    ? t('wms.inventory_turnover.granularity_week')
                    : t('wms.inventory_turnover.granularity_day')}
              </button>
            ))}
          </div>
        </div>

        <div className='rounded-lg border p-4'>
          <h3 className='mb-2 font-semibold'>{i18n.t('pages.wms_inventory_turnover_page.k5')}</h3>
          <ResponsiveContainer
            width='100%'
            height={360}
          >
            <LineChart
              data={chartData}
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
            <BarChart data={chartData.slice(0, 32)}>
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
    </StatsPageTemplate>
  );
}
