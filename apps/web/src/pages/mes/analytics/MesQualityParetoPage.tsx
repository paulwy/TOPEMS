import { useMemo, useState } from 'react';
import { FormControl, Select, MenuItem } from '@mui/material';
import i18n from '@/i18n';
import type { QualityParetoData } from '@/api/mes/types';
import { designTokens } from '@topems/tokens';
import {
  StatsPageTemplate,
  type StatCard,
  type ChartConfig,
} from '@/components/templates/StatsPageTemplate';

const DISPOSITION_COLORS = [
  designTokens.colors.secondary.dark,
  designTokens.colors.success.dark,
  designTokens.colors.warning.main,
  designTokens.colors.error.main,
  designTokens.colors.secondary.main,
];

function useQualityParetoMock(): QualityParetoData {
  return useMemo(() => {
    const types = [
      i18n.t('mes.mes_quality_pareto_page.k0'),
      i18n.t('mes.mes_quality_pareto_page.k1'),
      i18n.t('mes.mes_quality_pareto_page.k2'),
      i18n.t('mes.mes_quality_pareto_page.k3'),
      i18n.t('mes.mes_quality_pareto_page.k4'),
      i18n.t('mes.mes_quality_pareto_page.k5'),
      i18n.t('mes.mes_quality_pareto_page.k6'),
      i18n.t('mes.mes_quality_pareto_page.k7'),
    ];
    const counts = types.map((t, i) => ({
      type: t,
      count: Math.round(120 - i * 12 + Math.sin(i * 1.3) * 8),
    }));
    const total = counts.reduce((s, c) => s + c.count, 0);
    let acc = 0;
    const withCumulative = counts
      .sort((a, b) => b.count - a.count)
      .map((c) => {
        acc += c.count;
        return { ...c, cumulative_pct: Number(((acc / total) * 100).toFixed(1)) };
      });
    return {
      defect_types: withCumulative,
      heatmap: Array.from({ length: 24 }, (_, i) => ({
        process: `${i18n.t('pages.mes_quality_pareto_page.k0')}${(i % 6) + 1}`,
        defect_type: types[i % types.length] ?? i18n.t('mes.mes_quality_pareto_page.k8'),
        count: 2 + ((i * 5) % 18),
      })),
      disposition: [
        { category: i18n.t('mes.mes_quality_pareto_page.k9'), count: 86 },
        { category: i18n.t('mes.mes_quality_pareto_page.k10'), count: 32 },
        { category: i18n.t('mes.mes_quality_pareto_page.k11'), count: 24 },
        { category: i18n.t('mes.mes_quality_pareto_page.k12'), count: 18 },
        { category: i18n.t('mes.mes_quality_pareto_page.k13'), count: 12 },
      ],
    };
  }, []);
}

export default function MesQualityParetoPage() {
  const data = useQualityParetoMock();
  const [line, setLine] = useState('all');

  const statCards: StatCard[] = useMemo(() => {
    const totalDefects = data.defect_types.reduce((sum, item) => sum + item.count, 0);
    const topDefect = data.defect_types[0];
    const dispositionTotal = data.disposition.reduce((sum, item) => sum + item.count, 0);
    return [
      {
        id: 'total-defects',
        title: i18n.t('mes.mes_quality_pareto_page.k19'),
        value: totalDefects,
        color: 'error',
      },
      {
        id: 'top-defect',
        title: topDefect?.type ?? i18n.t('mes.mes_quality_pareto_page.k8'),
        value: topDefect?.count ?? 0,
        color: 'warning',
      },
      {
        id: 'disposition-total',
        title: i18n.t('mes.mes_quality_pareto_page.k24'),
        value: dispositionTotal,
        color: 'info',
      },
    ];
  }, [data]);

  const heatmapByDefect = useMemo(() => {
    const map = new Map<string, number>();
    data.heatmap.forEach((item) => {
      map.set(item.defect_type, (map.get(item.defect_type) ?? 0) + item.count);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [data.heatmap]);

  const charts: ChartConfig[] = useMemo(
    () => [
      {
        id: 'defect-pareto',
        title: i18n.t('mes.analytics.qualityPareto.k0'),
        type: 'bar',
        dataKey: 'value',
        nameKey: 'name',
        data: data.defect_types.map((item) => ({ name: item.type, value: item.count })),
      },
      {
        id: 'defect-heatmap',
        title: i18n.t('mes.analytics.qualityPareto.k1'),
        type: 'bar',
        dataKey: 'value',
        nameKey: 'name',
        data: heatmapByDefect,
      },
      {
        id: 'disposition-distribution',
        title: i18n.t('mes.mes_quality_pareto_page.k24'),
        type: 'pie',
        dataKey: 'value',
        nameKey: 'name',
        data: data.disposition.map((item) => ({ name: item.category, value: item.count })),
        colors: DISPOSITION_COLORS,
      },
    ],
    [data, heatmapByDefect]
  );

  const customToolbar = useMemo(
    () => (
      <FormControl
        size='small'
        sx={{ minWidth: 200 }}
      >
        <Select
          value={line}
          onChange={(e) => setLine(e.target.value)}
          aria-label={i18n.t('mes.mes_quality_pareto_page.k15')}
        >
          <MenuItem value='all'>{i18n.t('mes.mes_quality_pareto_page.k16')}</MenuItem>
          <MenuItem value='l1'>{i18n.t('mes.mes_quality_pareto_page.1_17')}</MenuItem>
          <MenuItem value='l2'>{i18n.t('mes.mes_quality_pareto_page.2_18')}</MenuItem>
        </Select>
      </FormControl>
    ),
    [line]
  );

  return (
    <StatsPageTemplate
      title={i18n.t('mes.mes_quality_pareto_page.pareto_14')}
      statCards={statCards}
      statColumns={3}
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
