import { designTokens } from '@topems/tokens';
/**
 * 计划达成率分析页
 *
 * 使用 recharts BarChart 展示计划 vs 实际产量差异：
 * - 柱状图：计划产量 vs 实际产量
 * - 折线图：达成率（%）
 * 数据使用内置 mock 数据。
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { apsApi } from '@/api/aps';
import { StatsPageTemplate } from '@/components/templates';
import type { StatCard } from '@/components/templates/StatsPageTemplate';
import { Box, Paper, Typography } from '@mui/material';
import { Target, ClipboardList, Package } from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';

const mockData = [
  { period: '2025-01', plan: 1200, actual: 1180 },
  { period: '2025-02', plan: 1300, actual: 1250 },
  { period: '2025-03', plan: 1400, actual: 1420 },
  { period: '2025-04', plan: 1500, actual: 1380 },
  { period: '2025-05', plan: 1600, actual: 1550 },
  { period: '2025-06', plan: 1700, actual: 1720 },
  { period: '2025-07', plan: 1800, actual: 1650 },
  { period: '2025-08', plan: 1900, actual: 1880 },
  { period: '2025-09', plan: 2000, actual: 1950 },
  { period: '2025-10', plan: 2100, actual: 2150 },
  { period: '2025-11', plan: 2200, actual: 2080 },
  { period: '2025-12', plan: 2300, actual: 2280 },
];

export default function PlanAdherencePage() {
  const { t } = useTranslation();

  useQuery({
    queryKey: ['aps', 'PlanAdherencePage'],
    queryFn: async () => {
      try {
        const res = await apsApi.listPlans();
        const data = (res as { data?: unknown })?.data;
        const items: Record<string, unknown>[] = Array.isArray(data)
          ? (data as Record<string, unknown>[])
          : Array.isArray((data as { items?: unknown[] })?.items)
            ? (data as { items: Record<string, unknown>[] }).items
            : [];
        return {
          plans: items,
          adherence:
            items.length === 0
              ? 0
              : items.filter((p: Record<string, unknown>) => {
                  const status = String(p.status ?? '');
                  const actual = Number(p.actualQty ?? p.actual ?? 0);
                  const plan = Number(p.planQty ?? p.plan ?? 0);
                  return status === 'COMPLETED' || (plan > 0 && actual >= plan);
                }).length / items.length,
        };
      } catch {
        return {};
      }
    },
  });

  const data = useMemo(() => {
    return mockData.map((d) => ({
      ...d,
      adherenceRate: Number(((d.actual / d.plan) * 100).toFixed(1)),
      variance: d.actual - d.plan,
    }));
  }, []);

  const avgAdherence = useMemo(() => {
    const sum = data.reduce((s, d) => s + d.adherenceRate, 0);
    return Number((sum / data.length).toFixed(1));
  }, [data]);

  const totalPlan = useMemo(() => data.reduce((s, d) => s + d.plan, 0), [data]);
  const totalActual = useMemo(() => data.reduce((s, d) => s + d.actual, 0), [data]);

  const statCards: StatCard[] = [
    {
      id: 'avgAdherence',
      title: t('aps.plan_adherence_page.k2'),
      value: `${avgAdherence}%`,
      icon: <Target size={24} />,
      color: 'success',
    },
    {
      id: 'totalPlan',
      title: t('aps.plan_adherence_page.k3'),
      value: totalPlan.toLocaleString(),
      icon: <ClipboardList size={24} />,
      color: 'primary',
    },
    {
      id: 'totalActual',
      title: t('aps.plan_adherence_page.k4'),
      value: totalActual.toLocaleString(),
      icon: <Package size={24} />,
      color: 'warning',
    },
  ];

  return (
    <StatsPageTemplate
      title={t('aps.plan_adherence_page.k0')}
      subtitle={`${t('pages.plan_adherence_page.k0')} | ${t('aps.plan_adherence_page.vs_1')}`}
      statCards={statCards}
      showStatCards={statCards.length > 0}
      showSearch={false}
      showTimeRange={false}
      showExport={false}
      showRefresh={false}
      showCharts={false}
    >
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography
          variant='subtitle1'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          {t('aps.analytics.planAdherence.k0')}
        </Typography>
        <Box sx={{ width: '100%', height: 360 }}>
          <ResponsiveContainer
            width='100%'
            height='100%'
          >
            <ComposedChart
              data={data}
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
                label={{
                  value: t('aps.plan_adherence_page.k5'),
                  angle: -90,
                  position: 'insideLeft',
                }}
              />
              <YAxis
                yAxisId='right'
                orientation='right'
                domain={[80, 120]}
                unit='%'
                fontSize={11}
                label={{
                  value: t('aps.plan_adherence_page.k6'),
                  angle: 90,
                  position: 'insideRight',
                }}
              />
              <Tooltip />
              <Legend />
              <ReferenceLine
                yAxisId='right'
                y={100}
                stroke={designTokens.colors.success.dark}
                strokeDasharray='4 4'
                label={t('aps.plan_adherence_page.100_7')}
              />
              <Bar
                yAxisId='left'
                dataKey='plan'
                name={t('aps.plan_adherence_page.k8')}
                fill={designTokens.colors.secondary.dark}
                barSize={20}
              />
              <Bar
                yAxisId='left'
                dataKey='actual'
                name={t('aps.plan_adherence_page.k9')}
                fill={designTokens.colors.warning.main}
                barSize={20}
              />
              <Line
                yAxisId='right'
                type='monotone'
                dataKey='adherenceRate'
                name={t('aps.plan_adherence_page.k10')}
                stroke={designTokens.colors.success.dark}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
    </StatsPageTemplate>
  );
}
