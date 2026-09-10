import { useMemo, useState } from 'react';
import { FormControl, Select, MenuItem } from '@mui/material';
import i18n from '@/i18n';
import {
  StatsPageTemplate,
  type StatCard,
  type ChartConfig,
} from '@/components/templates/StatsPageTemplate';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { mesAnalyticsApi } from '@/api/mes/analytics';

const getStackedTrend = () =>
  Array.from({ length: 12 }, (_, i) => ({
    month: `M${i + 1}`,
    [i18n.t('pages.mes_energy_cost_page.k0')]: Math.round(15000 + Math.sin(i / 2) * 2000),
    [i18n.t('pages.mes_energy_cost_page.k1')]: Math.round(5000 + Math.cos(i / 3) * 800),
    [i18n.t('pages.mes_energy_cost_page.k2')]: Math.round(2800 + ((i * 100) % 600)),
    [i18n.t('pages.mes_energy_cost_page.k3')]: Math.round(1500 + ((i * 80) % 300)),
  }));

export default function MesEnergyCostPage() {
  const { data: analyticsData, loading } = useAnalyticsData({
    fetcher: () => mesAnalyticsApi.getEnergyCost({ days: 30 }),
    deps: [],
  });
  const [energyType, setEnergyType] = useState('all');

  // 适配后端字段名：energy_type → type
  const data = useMemo(() => ({
    per_unit_trend: analyticsData?.per_unit_trend ?? [],
    energy_mix: (analyticsData?.energy_mix ?? []).map((item) => ({
      type: item.energy_type,
      percentage: item.percentage,
      cost: item.cost,
    })),
    workshop_top_n: analyticsData?.workshop_top_n ?? [],
  }), [analyticsData]);

  const statCards: StatCard[] = useMemo(() => {
    const totalCost = data.energy_mix.reduce((sum, item) => sum + item.cost, 0);
    const colors: Array<'primary' | 'secondary' | 'success' | 'warning'> = [
      'secondary',
      'warning',
      'success',
      'primary',
    ];
    return data.energy_mix.map((item, index) => ({
      id: `energy-mix-${item.type}`,
      title: item.type,
      value: `¥${(item.cost / 1000).toFixed(1)}`,
      suffix: 'k',
      color: colors[index % colors.length],
      description: `${((item.cost / totalCost) * 100).toFixed(1)}% ${i18n.t(
        'pages.mes_energy_cost_page.epercentage_0'
      )}`,
    }));
  }, [data.energy_mix]);

  const charts: ChartConfig[] = useMemo(() => {
    const stackedTrend = getStackedTrend();
    return [
      {
        id: 'per-unit-trend',
        title: i18n.t('mes.mes_energy_cost_page.30_16'),
        type: 'line',
        dataKey: 'value',
        nameKey: 'name',
        data: data.per_unit_trend.map((item) => ({
          name: item.date,
          value: item.kwh_per_unit,
        })),
      },
      {
        id: 'cost-stacked-trend',
        title: i18n.t('mes.mes_energy_cost_page.12_18'),
        type: 'area',
        dataKey: 'value',
        nameKey: 'name',
        data: stackedTrend.map((item) => ({
          name: item.month,
          value: Object.values(item).reduce<number>(
            (sum, value) => (typeof value === 'number' ? sum + value : sum),
            0
          ),
        })),
      },
      {
        id: 'workshop-top-n',
        title: i18n.t('mes.mes_energy_cost_page.topn_23'),
        type: 'bar',
        dataKey: 'value',
        nameKey: 'name',
        data: data.workshop_top_n.map((item) => ({
          name: item.workshop,
          value: item.cost,
        })),
      },
    ];
  }, [data]);

  const customToolbar = useMemo(
    () => (
      <FormControl
        size='small'
        sx={{ minWidth: 200 }}
      >
        <Select
          value={energyType}
          onChange={(e) => setEnergyType(e.target.value)}
          aria-label={i18n.t('mes.mes_energy_cost_page.k11')}
        >
          <MenuItem value='all'>{i18n.t('mes.mes_energy_cost_page.k12')}</MenuItem>
          <MenuItem value='elec'>{i18n.t('mes.mes_energy_cost_page.k13')}</MenuItem>
          <MenuItem value='gas'>{i18n.t('mes.mes_energy_cost_page.k14')}</MenuItem>
          <MenuItem value='steam'>{i18n.t('mes.mes_energy_cost_page.k15')}</MenuItem>
        </Select>
      </FormControl>
    ),
    [energyType]
  );

  return (
    <StatsPageTemplate
      title={i18n.t('mes.mes_energy_cost_page.k10')}
      statCards={statCards}
      statColumns={4}
      charts={charts}
      chartColumns={{ xs: 1, md: 2 }}
      customToolbar={customToolbar}
      showSearch={false}
      showTimeRange={false}
      showExport={false}
      showRefresh={false}
    />
  );
}
