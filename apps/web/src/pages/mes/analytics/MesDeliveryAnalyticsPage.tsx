import { useMemo, useState } from 'react';
import { FormControl, Select, MenuItem } from '@mui/material';
import i18n from '@/i18n';
import { designTokens } from '@topems/tokens';
import {
  StatsPageTemplate,
  type StatCard,
  type ChartConfig,
  type DataTable,
} from '@/components/templates/StatsPageTemplate';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { mesAnalyticsApi } from '@/api/mes/analytics';

const DONUT_COLORS = [
  designTokens.colors.success.dark,
  designTokens.colors.warning.main,
  designTokens.colors.error.main,
  designTokens.colors.secondary.dark,
];

export default function MesDeliveryAnalyticsPage() {
  const { data: analyticsData, loading } = useAnalyticsData({
    fetcher: () => mesAnalyticsApi.getDeliveryAnalytics({ days: 30 }),
    deps: [],
  });
  const [productFamily, setProductFamily] = useState('all');

  // 从后端数据派生前端需要的结构
  const data = useMemo(() => ({
    on_time_rate: analyticsData?.on_time_rate ?? 0,
    sla_achievement: (analyticsData?.on_time_rate ?? 0) + 5,
    top10_delayed: [],
    distribution: (analyticsData?.trend ?? []).map((item, i) => ({
      order_no: `WO-${String(20240001 + i).padStart(8, '0')}`,
      planned: item.date,
      actual: item.date,
      diff_days: item.planned - item.delivered,
    })),
  }), [analyticsData]);

  const donutData = useMemo(
    () => [
      { name: i18n.t('mes.mes_delivery_analytics_page.k6'), value: 32 },
      { name: i18n.t('mes.mes_delivery_analytics_page.k7'), value: 124 },
      { name: i18n.t('mes.mes_delivery_analytics_page.k8'), value: 18 },
      { name: i18n.t('mes.mes_delivery_analytics_page.k9'), value: 6 },
    ],
    []
  );

  const boxApprox = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        week: `W${i + 1}`,
        min: 1 + i * 0.5,
        q1: 2 + i * 0.6,
        median: 3 + i * 0.7,
        q3: 4 + i * 0.8,
        max: 6 + i * 0.9,
      })),
    []
  );

  const statCards: StatCard[] = useMemo(
    () => [
      {
        id: 'on-time-rate',
        title: i18n.t('mes.mes_delivery_analytics_page.k13'),
        value: data.on_time_rate.toFixed(1),
        suffix: '%',
        color: 'success',
        description: i18n.t('mes:mes_delivery_analytics_page.slav0_1', {
          v0: data.sla_achievement.toFixed(1),
        }),
      },
      {
        id: 'delayed-orders',
        title: i18n.t('mes.mes_delivery_analytics_page.top10_20'),
        value: data.top10_delayed.length,
        color: 'warning',
      },
      {
        id: 'distribution-records',
        title: i18n.t('mes.mes_delivery_analytics_page.k15'),
        value: data.distribution.length,
        color: 'info',
      },
    ],
    [data]
  );

  const charts: ChartConfig[] = useMemo(
    () => [
      {
        id: 'delivery-status-distribution',
        title: i18n.t('mes.mes_delivery_analytics_page.k14'),
        type: 'donut',
        dataKey: 'value',
        nameKey: 'name',
        data: donutData,
        colors: DONUT_COLORS,
      },
      {
        id: 'delivery-cycle-trend',
        title: i18n.t('mes.mes_delivery_analytics_page.k15'),
        type: 'area',
        dataKey: 'value',
        nameKey: 'name',
        data: boxApprox.map((item) => ({ name: item.week, value: item.max })),
      },
      {
        id: 'delivery-cycle-stats',
        title: i18n.t('mes.mes_delivery_analytics_page.top6_16'),
        type: 'bar',
        dataKey: 'value',
        nameKey: 'name',
        data: boxApprox.map((item) => ({ name: item.week, value: item.median })),
      },
    ],
    [donutData, boxApprox]
  );

  const tables: DataTable[] = useMemo(
    () => [
      {
        id: 'top-delayed-orders',
        title: i18n.t('mes.mes_delivery_analytics_page.top10_20'),
        columns: [
          {
            id: 'order_no',
            label: i18n.t('mes.mes_delivery_analytics_page.k21'),
            field: 'order_no',
          },
          {
            id: 'delay_days',
            label: i18n.t('mes.mes_delivery_analytics_page.k22'),
            field: 'delay_days',
            render: (value) =>
              i18n.t('mes:mes_delivery_analytics_page.v0_0', {
                v0: Number(value).toFixed(1),
              }),
          },
          {
            id: 'reason',
            label: i18n.t('mes.mes_delivery_analytics_page.k23'),
            field: 'reason',
          },
        ],
        data: data.top10_delayed as Record<string, unknown>[],
      },
    ],
    [data.top10_delayed]
  );

  const customToolbar = useMemo(
    () => (
      <FormControl
        size='small'
        sx={{ minWidth: 200 }}
      >
        <Select
          value={productFamily}
          onChange={(e) => setProductFamily(e.target.value)}
          aria-label={i18n.t('mes.mes_delivery_analytics_page.k11')}
        >
          <MenuItem value='all'>{i18n.t('mes.mes_delivery_analytics_page.k12')}</MenuItem>
          <MenuItem value='fa'>{i18n.t('mes:mes_delivery_analytics_page.k3')}</MenuItem>
          <MenuItem value='fb'>{i18n.t('mes:mes_delivery_analytics_page.k2')}</MenuItem>
        </Select>
      </FormControl>
    ),
    [productFamily]
  );

  return (
    <StatsPageTemplate
      title={i18n.t('mes.mes_delivery_analytics_page.k10')}
      statCards={statCards}
      statColumns={3}
      charts={charts}
      chartColumns={{ xs: 1, md: 2 }}
      tables={tables}
      customToolbar={customToolbar}
      showSearch={false}
      showTimeRange={false}
      showExport={false}
      showRefresh={false}
    />
  );
}
