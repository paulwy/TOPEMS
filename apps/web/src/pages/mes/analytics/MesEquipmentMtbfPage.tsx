import { useMemo, useState } from 'react';
import { FormControl, Select, MenuItem } from '@mui/material';
import i18n from '@/i18n';
import {
  StatsPageTemplate,
  type StatCard,
  type ChartConfig,
  type DataTable,
} from '@/components/templates/StatsPageTemplate';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { mesAnalyticsApi } from '@/api/mes/analytics';

const TREND_12W = Array.from({ length: 12 }, (_, i) => ({
  week: `W${i + 1}`,
  mtbf: Math.round(220 + Math.sin(i / 2) * 60 + i * 4),
  target: 280,
}));

export default function MesEquipmentMtbfPage() {
  const { data: analyticsData } = useAnalyticsData({
    fetcher: () => mesAnalyticsApi.getEquipmentMtbf({ days: 90 }),
    deps: [],
  });
  const [severity, setSeverity] = useState('all');

  // 适配后端字段名：equipment_type → type
  const data = useMemo(
    () => ({
      by_equipment_type: (analyticsData?.by_equipment_type ?? []).map((item) => ({
        type: item.equipment_type,
        mtbf_hours: item.mtbf_hours,
        mttr_hours: item.mttr_hours,
      })),
      fault_reasons: analyticsData?.fault_reasons ?? [],
      scatter: analyticsData?.scatter ?? [],
    }),
    [analyticsData]
  );

  const statCards: StatCard[] = useMemo(() => {
    const avgMtbf = Math.round(
      TREND_12W.reduce((sum, item) => sum + item.mtbf, 0) / TREND_12W.length
    );
    const avgMttr = Number(
      (
        data.by_equipment_type.reduce((sum, item) => sum + item.mttr_hours, 0) /
        data.by_equipment_type.length
      ).toFixed(1)
    );
    const totalFaults = data.fault_reasons.reduce((sum, item) => sum + item.frequency, 0);
    return [
      {
        id: 'avg-mtbf',
        title: 'MTBF',
        value: avgMtbf,
        suffix: 'h',
        color: 'primary',
      },
      {
        id: 'avg-mttr',
        title: 'MTTR',
        value: avgMttr,
        suffix: 'h',
        color: 'warning',
      },
      {
        id: 'total-faults',
        title: i18n.t('pages.mes_equipment_mtbf_page.topn_20'),
        value: totalFaults,
        color: 'error',
      },
    ];
  }, [data]);

  const charts: ChartConfig[] = useMemo(
    () => [
      {
        id: 'mtbf-12w-trend',
        title: i18n.t('mes:mes_equipment_mtbf_page.mtbf12_2'),
        type: 'line',
        dataKey: 'value',
        nameKey: 'name',
        data: TREND_12W.map((item) => ({ name: item.week, value: item.mtbf })),
      },
      {
        id: 'mttr-by-type',
        title: i18n.t('pages.mes_equipment_mtbf_page.mttr_19'),
        type: 'bar',
        dataKey: 'value',
        nameKey: 'name',
        data: data.by_equipment_type.map((item) => ({
          name: item.type,
          value: item.mttr_hours,
        })),
      },
      {
        id: 'mtbf-vs-oee',
        title: i18n.t('mes:mes_equipment_mtbf_page.mtbfvsoee_1'),
        type: 'line',
        dataKey: 'value',
        nameKey: 'name',
        data: data.scatter.map((item) => ({ name: item.label, value: item.oee })),
      },
    ],
    [data]
  );

  const tables: DataTable[] = useMemo(() => {
    const total = data.fault_reasons.reduce((sum, item) => sum + item.frequency, 0);
    return [
      {
        id: 'fault-reasons',
        title: i18n.t('pages.mes_equipment_mtbf_page.topn_20'),
        columns: [
          {
            id: 'reason',
            label: i18n.t('pages.mes_equipment_mtbf_page.k21'),
            field: 'reason',
          },
          {
            id: 'frequency',
            label: i18n.t('pages.mes_equipment_mtbf_page.k22'),
            field: 'frequency',
            render: (value) =>
              i18n.t('mes:mes_equipment_mtbf_page.v0_0', {
                v0: Number(value),
              }),
          },
          {
            id: 'percentage',
            label: i18n.t('pages.mes_equipment_mtbf_page.k23'),
            field: 'frequency',
            render: (value) => `${((Number(value) / total) * 100).toFixed(1)}%`,
          },
        ],
        data: data.fault_reasons as unknown as Record<string, unknown>[],
      },
    ];
  }, [data.fault_reasons]);

  const customToolbar = useMemo(
    () => (
      <FormControl
        size='small'
        sx={{ minWidth: 200 }}
      >
        <Select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          aria-label={i18n.t('pages.mes_equipment_mtbf_page.k13')}
        >
          <MenuItem value='all'>{i18n.t('pages.mes_equipment_mtbf_page.k14')}</MenuItem>
          <MenuItem value='critical'>{i18n.t('pages.mes_equipment_mtbf_page.k15')}</MenuItem>
          <MenuItem value='major'>{i18n.t('pages.mes_equipment_mtbf_page.k16')}</MenuItem>
          <MenuItem value='minor'>{i18n.t('pages.mes_equipment_mtbf_page.k17')}</MenuItem>
        </Select>
      </FormControl>
    ),
    [severity]
  );

  return (
    <StatsPageTemplate
      title={i18n.t('mes:mes_equipment_mtbf_page.mtbfmttr_3')}
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
