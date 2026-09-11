import { designTokens } from '@topems/tokens';
/**
 * 计划达成率分析页
 *
 * 使用 recharts BarChart 展示计划 vs 实际产量差异：
 * - 柱状图：计划产量 vs 实际产量
 * - 折线图：达成率（%）
 * 数据来自 APS 后端列表 API，按开始日期月份聚合。
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { apsApi } from '@/api/aps';
import type { ProductionPlan } from '@/api/aps/types';
import { StatsPageTemplate } from '@/components/templates';
import type { StatCard } from '@/components/templates/StatsPageTemplate';
import { Box, Paper, Typography, CircularProgress, Alert } from '@mui/material';
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

interface PlanAdherenceItem {
  period: string;
  plan: number;
  actual: number;
  adherenceRate: number;
  variance: number;
}

export default function PlanAdherencePage() {
  const { t } = useTranslation();

  const { data: apiData, isLoading } = useQuery({
    queryKey: ['aps', 'plans'],
    queryFn: async () => {
      const res = await apsApi.listPlans();
      const items =
        res?.data?.items ?? (Array.isArray(res?.data) ? (res.data as ProductionPlan[]) : []);
      return items;
    },
  });

  const data = useMemo<PlanAdherenceItem[]>(() => {
    const plans = apiData ?? [];
    if (plans.length === 0) return [];

    // 按开始日期的月份分组
    const monthMap = new Map<string, { plan: number; actual: number }>();

    plans.forEach((plan) => {
      if (!plan.start_date) return;
      const month = plan.start_date.substring(0, 7); // YYYY-MM
      const targetQty = plan.target_quantity ?? 0;

      if (!monthMap.has(month)) {
        monthMap.set(month, { plan: 0, actual: 0 });
      }
      const entry = monthMap.get(month)!;
      entry.plan += targetQty;

      // 基于状态估算实际产量：已完成=100%，进行中=50%，已批准=80%，待批准=30%，其他=0
      const status = plan.status ?? '';
      if (status === 'completed') {
        entry.actual += targetQty;
      } else if (status === 'in_progress') {
        entry.actual += targetQty * 0.5;
      } else if (status === 'approved') {
        entry.actual += targetQty * 0.8;
      } else if (status === 'pending_approval') {
        entry.actual += targetQty * 0.3;
      }
    });

    // 转换为数组并按月份排序
    const months = Array.from(monthMap.keys()).sort();
    return months.map((month) => {
      const entry = monthMap.get(month)!;
      const plan = Math.round(entry.plan);
      const actual = Math.round(entry.actual);
      const adherenceRate = plan > 0 ? Math.round((actual / plan) * 1000) / 10 : 0;
      return {
        period: month,
        plan,
        actual,
        adherenceRate,
        variance: actual - plan,
      };
    });
  }, [apiData]);

  const avgAdherence = useMemo(() => {
    if (data.length === 0) return 0;
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

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '60vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

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
      <Alert
        severity='info'
        sx={{ mb: 3 }}
      >
        Actual quantity is estimated based on plan status (completed=100%, in_progress=50%,
        approved=80%, pending_approval=30%, others=0%)
      </Alert>

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
                domain={[0, 120]}
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
