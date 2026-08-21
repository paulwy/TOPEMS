import { useMemo, useState } from 'react';
import { FormControl, Select, MenuItem } from '@mui/material';
import i18n from '@/i18n';
import type { EnergyCostData } from '@/api/mes/types';
import {
  StatsPageTemplate,
  type StatCard,
  type ChartConfig,
} from '@/components/templates/StatsPageTemplate';

function useEnergyMock(): EnergyCostData {
  return useMemo(() => {
    const workshops = [
      i18n.t('mes.mes_energy_cost_page.k5'),
      i18n.t('mes.mes_energy_cost_page.k4'),
      i18n.t('mes.mes_energy_cost_page.k3'),
      i18n.t('mes.mes_energy_cost_page.k2'),
      i18n.t('mes.mes_energy_cost_page.k1'),
      i18n.t('mes.mes_energy_cost_page.k0'),
    ];
    return {
      per_unit_trend: Array.from({ length: 30 }, (_, i) => ({
        date: `D${i + 1}`,
        kwh_per_unit: Number((2.4 + Math.sin(i / 4) * 0.4 + (i % 7) * 0.03).toFixed(2)),
      })),
      energy_mix: [
        { type: i18n.t('mes.mes_energy_cost_page.k6'), percentage: 62, cost: 184000 },
        { type: i18n.t('mes.mes_energy_cost_page.k7'), percentage: 21, cost: 62000 },
        { type: i18n.t('mes.mes_energy_cost_page.k8'), percentage: 11, cost: 33000 },
        { type: i18n.t('mes.mes_energy_cost_page.k9'), percentage: 6, cost: 18000 },
      ],
      workshop_top_n: workshops
        .map((w, i) => ({
          workshop: w,
          cost: Math.round(50000 - i * 6000 + Math.cos(i) * 4000),
        }))
        .sort((a, b) => b.cost - a.cost),
    };
  }, []);
}

const getStackedTrend = () =>
  Array.from({ length: 12 }, (_, i) => ({
    month: `M${i + 1}`,
    [i18n.t('pages.mes_energy_cost_page.k0')]: Math.round(15000 + Math.sin(i / 2) * 2000),
    [i18n.t('pages.mes_energy_cost_page.k1')]: Math.round(5000 + Math.cos(i / 3) * 800),
    [i18n.t('pages.mes_energy_cost_page.k2')]: Math.round(2800 + ((i * 100) % 600)),
    [i18n.t('pages.mes_energy_cost_page.k3')]: Math.round(1500 + ((i * 80) % 300)),
  }));

export default function MesEnergyCostPage() {
  const data = useEnergyMock();
  const [energyType, setEnergyType] = useState('all');

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
