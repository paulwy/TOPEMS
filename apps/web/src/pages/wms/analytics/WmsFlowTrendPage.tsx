import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { designTokens } from '@topems/tokens';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { getFlowTrend, type FlowTrendData } from '@/api/wms/analytics';

const RANGE_OPTIONS = [
  { label: i18n.t('pages.wms_flow_trend_page.7_2'), value: '7d' },
  { label: i18n.t('pages.wms_flow_trend_page.15_3'), value: '15d' },
  { label: i18n.t('pages.wms_flow_trend_page.30_4'), value: '30d' },
];

export default function WmsFlowTrendPage() {
  const { t } = useTranslation();
  const [range, setRange] = useState<'7d' | '15d' | '30d'>('30d');
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');

  const { data: response, loading } = useAnalyticsData({
    fetcher: () => getFlowTrend({ group_by: groupBy }),
    deps: [groupBy],
  });

  const flow = useMemo(() => {
    const list: (FlowTrendData & { net: number })[] = (response?.data ?? []).map((item) => ({
      ...item,
      net: item.inbound_qty - item.outbound_qty,
    }));
    if (range === '7d') return list.slice(-7);
    if (range === '15d') return list.slice(-15);
    return list;
  }, [response, range]);

  const totals = useMemo(() => {
    const inb = flow.reduce((s, f) => s + f.inbound_qty, 0);
    const out = flow.reduce((s, f) => s + f.outbound_qty, 0);
    const net = inb - out;
    return { inb, out, net, days: flow.length };
  }, [flow]);

  const statCards = useMemo(
    () => [
      {
        id: 'total-inbound',
        title: i18n.t('pages.wms_flow_trend_page.k5'),
        value: totals.inb.toLocaleString(),
        color: 'success' as const,
      },
      {
        id: 'total-outbound',
        title: i18n.t('pages.wms_flow_trend_page.k6'),
        value: totals.out.toLocaleString(),
        color: 'info' as const,
      },
      {
        id: 'net-flow',
        title: i18n.t('pages.wms_flow_trend_page.k7'),
        value: `${totals.net >= 0 ? '+' : ''}${totals.net.toLocaleString()}`,
        color: totals.net >= 0 ? ('success' as const) : ('error' as const),
      },
      {
        id: 'days',
        title: i18n.t('pages.wms_flow_trend_page.k8'),
        value: totals.days,
        suffix: i18n.t('pages.wms_flow_trend_page.totalsdays_0'),
        color: 'secondary' as const,
      },
    ],
    [totals]
  );

  const customToolbar = (
    <div className='flex items-center gap-2'>
      <select
        value={groupBy}
        onChange={(e) => setGroupBy(e.target.value as 'day' | 'week' | 'month')}
        className='border rounded px-3 py-1.5 text-sm'
        aria-label={t('wms.flow_trend.aria_granularity')}
      >
        <option value='day'>{t('wms.flow_trend.by_day')}</option>
        <option value='week'>{t('wms.flow_trend.by_week')}</option>
        <option value='month'>{t('wms.flow_trend.by_month')}</option>
      </select>
      <select
        value={range}
        onChange={(e) => setRange(e.target.value as '7d' | '15d' | '30d')}
        className='border rounded px-3 py-1.5 text-sm'
        aria-label={i18n.t('pages.wms_flow_trend_page.k1')}
      >
        {RANGE_OPTIONS.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <StatsPageTemplate
      title={i18n.t('pages.wms_flow_trend_page.30_0')}
      statCards={statCards}
      showSearch={false}
      showTimeRange={false}
      showExport={false}
      showRefresh={false}
      showCharts={false}
      showTables={false}
      customToolbar={customToolbar}
      loading={loading}
    >
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
              dataKey='period'
              fontSize={11}
            />
            <YAxis
              fontSize={11}
              label={{
                value: i18n.t('pages.wms_flow_trend_page.k9'),
                angle: -90,
                position: 'insideLeft',
              }}
            />
            <Tooltip />
            <Legend />
            <Area
              type='monotone'
              dataKey='inbound_qty'
              name={i18n.t('pages.wms_flow_trend_page.k10')}
              stroke={designTokens.colors.success.dark}
              fill='url(#inbGrad)'
              strokeWidth={2}
            />
            <Area
              type='monotone'
              dataKey='outbound_qty'
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
    </StatsPageTemplate>
  );
}
