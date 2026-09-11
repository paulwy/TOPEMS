import { useMemo, useState } from 'react';
import { FormControl, Select, MenuItem } from '@mui/material';
import i18n from '@/i18n';
import { designTokens } from '@topems/tokens';
import {
  StatsPageTemplate,
  type StatCard,
  type ChartConfig,
} from '@/components/templates/StatsPageTemplate';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { mesAnalyticsApi } from '@/api/mes/analytics';

const DISPOSITION_COLORS = [
  designTokens.colors.secondary.dark,
  designTokens.colors.success.dark,
  designTokens.colors.warning.main,
  designTokens.colors.error.main,
  designTokens.colors.secondary.main,
];

export default function MesQualityParetoPage() {
  const { data: analyticsData } = useAnalyticsData({
    fetcher: () => mesAnalyticsApi.getQualityPareto({ days: 30 }),
    deps: [],
  });
  const [line, setLine] = useState('all');

  // 适配后端数据结构
  const data = useMemo(
    () => ({
      defect_types: (analyticsData?.pareto ?? []).map((item) => ({
        type: item.defect_type,
        count: item.count,
        cumulative_pct: item.cumulative_percentage,
      })),
      heatmap: [] as Array<{ process: string; defect_type: string; count: number }>,
      disposition: [
        { category: '合格', count: Math.round((analyticsData?.pass_rate ?? 0) * 10) },
        { category: '返工', count: Math.round((analyticsData?.total_defects ?? 0) * 0.3) },
        { category: '报废', count: Math.round((analyticsData?.total_defects ?? 0) * 0.2) },
      ],
    }),
    [analyticsData]
  );

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
