/**
 * 质量成本分析页
 *
 * 使用 recharts 展示 PAF 质量成本模型：
 * - PieChart：预防 / 鉴定 / 内部故障 / 外部故障 占比
 * - BarChart：按部门成本分布
 * - LineChart：月度成本趋势
 * 数据来自 useQmsMock 的 qualityCosts。
 */
import { useMemo } from 'react';
import { Grid, Paper, Typography, CircularProgress, Box, Alert } from '@mui/material';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { designTokens } from '@topems/tokens';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { StatsPageTemplate, type StatCard } from '@/components/templates/StatsPageTemplate';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { qualityCostApi } from '@/api/qms/qualityCost';
import type { QualityCost } from '@/api/qms/types';

const COST_TYPE_COLORS: Record<string, string> = {
  prevention: designTokens.colors.success.dark,
  appraisal: designTokens.colors.primary.main,
  internal_failure: designTokens.colors.warning.main,
  external_failure: designTokens.colors.error.main,
};

function getCostTypeLabels(): Record<string, string> {
  return {
    prevention: i18n.t('qms.qms_cost_analysis_page.k0'),
    appraisal: i18n.t('qms.qms_cost_analysis_page.k1'),
    internal_failure: i18n.t('qms.qms_cost_analysis_page.k2'),
    external_failure: i18n.t('qms.qms_cost_analysis_page.k3'),
  };
}

export default function QmsCostAnalysisPage() {
  const { t } = useTranslation('qms');
  const { data: qualityCostsData, loading, error, reload } = useAnalyticsData<QualityCost[]>({
    fetcher: () => qualityCostApi.listQualityCosts(),
    deps: [],
  });

  const qualityCosts = useMemo(() => qualityCostsData ?? [], [qualityCostsData]);

  const costByType = useMemo(() => {
    const map: Record<string, number> = {
      prevention: 0,
      appraisal: 0,
      internal_failure: 0,
      external_failure: 0,
    };
    qualityCosts.forEach((c) => {
      const key = c.costType;
      if (map[key] !== undefined) map[key] += c.amount;
    });
    return Object.entries(map).map(([type, amount]) => ({
      type,
      label: getCostTypeLabels()[type] ?? type,
      amount,
    }));
  }, [qualityCosts]);

  const costByDepartment = useMemo(() => {
    const map = new Map<string, number>();
    qualityCosts.forEach((c) => {
      const dept = c.department || t('qms.qms_cost_analysis_page.k4');
      map.set(dept, (map.get(dept) ?? 0) + c.amount);
    });
    return Array.from(map.entries()).map(([department, amount]) => ({ department, amount }));
  }, [qualityCosts, t]);

  const trend = useMemo(() => {
    const map = new Map<
      string,
      { prevention: number; appraisal: number; internal_failure: number; external_failure: number }
    >();
    qualityCosts.forEach((c) => {
      const month = (c.occurrenceDate || '').slice(0, 7);
      if (!month) return;
      if (!map.has(month)) {
        map.set(month, { prevention: 0, appraisal: 0, internal_failure: 0, external_failure: 0 });
      }
      const entry = map.get(month)!;
      if (entry[c.costType as keyof typeof entry] !== undefined) {
        entry[c.costType as keyof typeof entry] += c.amount;
      }
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, ...v }));
  }, [qualityCosts]);

  const totalCost = costByType.reduce((s, c) => s + c.amount, 0);
  const failureCost =
    (costByType.find((c) => c.type === 'internal_failure')?.amount ?? 0) +
    (costByType.find((c) => c.type === 'external_failure')?.amount ?? 0);
  const preventionCost = costByType.find((c) => c.type === 'prevention')?.amount ?? 0;

  const statCards = useMemo<StatCard[]>(
    () => [
      {
        id: 'totalCost',
        title: t('qms.qms_cost_analysis_page.k6'),
        value: totalCost.toLocaleString(),
        prefix: '¥',
        color: 'primary',
      },
      {
        id: 'preventionCost',
        title: t('qms.qms_cost_analysis_page.k7'),
        value: preventionCost.toLocaleString(),
        prefix: '¥',
        color: 'success',
      },
      {
        id: 'failureCost',
        title: t('qms.qms_cost_analysis_page.k8'),
        value: failureCost.toLocaleString(),
        prefix: '¥',
        color: 'error',
      },
      {
        id: 'costCount',
        title: t('qms.qms_cost_analysis_page.k9'),
        value: qualityCosts.length,
        color: 'info',
      },
    ],
    [totalCost, preventionCost, failureCost, qualityCosts.length, t]
  );

  return (
    <StatsPageTemplate
      title={t('qms.qms_cost_analysis_page.paf_5')}
      subtitle={i18n.t('pages.qms_cost_analysis_page.k0')}
      statCards={statCards}
      showTimeRange={false}
      showSearch={false}
      showExport={false}
      showRefresh={false}
      showCharts={false}
      showTables={false}
      loading={loading}
    >
      {error && (
        <Alert severity='error' sx={{ mb: 2 }} onClose={reload}>
          加载失败：{error}
        </Alert>
      )}
      <Grid
        container
        spacing={3}
      >
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600, mb: 2 }}
            >
              {i18n.t('pages.qms_cost_analysis_page.pf_1')}
            </Typography>
            <ResponsiveContainer
              width='100%'
              height={300}
            >
              <PieChart>
                <Pie
                  data={costByType}
                  dataKey='amount'
                  nameKey='label'
                  label={(entry: unknown) => {
                    const e = entry as { label?: string; amount?: number };
                    return `${e.label}: ¥${(e.amount ?? 0).toLocaleString()}`;
                  }}
                  outerRadius={100}
                >
                  {costByType.map((entry) => (
                    <Cell
                      key={entry.type}
                      fill={COST_TYPE_COLORS[entry.type] ?? designTokens.colors.grey[400]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value: unknown) => `¥${Number(value).toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600, mb: 2 }}
            >
              {t('qms.qms_cost_analysis_page.k10')}
            </Typography>
            <ResponsiveContainer
              width='100%'
              height={300}
            >
              <BarChart
                data={costByDepartment}
                margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis
                  dataKey='department'
                  fontSize={11}
                />
                <YAxis fontSize={11} />
                <Tooltip formatter={(value: unknown) => `¥${Number(value).toLocaleString()}`} />
                <Legend />
                <Bar
                  dataKey='amount'
                  name={t('qms.qms_cost_analysis_page.k11')}
                  fill={designTokens.colors.secondary.dark}
                  barSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600, mb: 2 }}
            >
              {t('qms.qms_cost_analysis_page.k12')}
            </Typography>
            <ResponsiveContainer
              width='100%'
              height={300}
            >
              <LineChart
                data={trend}
                margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis
                  dataKey='month'
                  fontSize={11}
                />
                <YAxis fontSize={11} />
                <Tooltip formatter={(value: unknown) => `¥${Number(value).toLocaleString()}`} />
                <Legend />
                <Line
                  type='monotone'
                  dataKey='prevention'
                  name={t('qms.qms_cost_analysis_page.k13')}
                  stroke={COST_TYPE_COLORS.prevention}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type='monotone'
                  dataKey='appraisal'
                  name={t('qms.qms_cost_analysis_page.k14')}
                  stroke={COST_TYPE_COLORS.appraisal}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type='monotone'
                  dataKey='internal_failure'
                  name={t('qms.qms_cost_analysis_page.k15')}
                  stroke={COST_TYPE_COLORS.internal_failure}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type='monotone'
                  dataKey='external_failure'
                  name={t('qms.qms_cost_analysis_page.k16')}
                  stroke={COST_TYPE_COLORS.external_failure}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </StatsPageTemplate>
  );
}
