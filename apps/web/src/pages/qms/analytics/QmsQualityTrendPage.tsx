/**
 * 质量趋势分析页
 *
 * 使用 recharts LineChart 展示质量趋势：
 * - 合格率（左 Y 轴，%）
 * - 问题数 / 缺陷数（右 Y 轴，计数）
 * 数据来自 qualityDashboardApi.getQualityTrend。
 */
import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Box, Paper, Typography, CircularProgress, Alert } from '@mui/material';
import { designTokens } from '@topems/tokens';
import { useTranslation } from 'react-i18next';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { qualityDashboardApi, type QualityTrendItem } from '@/api/qms/dashboard';

export default function QmsQualityTrendPage() {
  const { t } = useTranslation('qms');
  const [range, setRange] = useState<'6m' | '12m'>('12m');
  const days = range === '6m' ? 180 : 365;

  const {
    data: trendData,
    loading,
    error,
    reload,
  } = useAnalyticsData<QualityTrendItem[]>({
    fetcher: () => qualityDashboardApi.getQualityTrend({ days }),
    deps: [days],
  });

  const trend = useMemo(() => {
    const list = (trendData ?? []).map((item: QualityTrendItem) => ({
      date: item.period,
      passRate: item.qualification_rate,
      defectCount: item.total_count - item.qualified_count,
      issueCount: item.issue_count,
      inspectionCount: item.total_count,
    }));
    return list;
  }, [trendData]);

  const avgPassRate = useMemo(() => {
    if (trend.length === 0) return 0;
    return Math.round((trend.reduce((s, t) => s + t.passRate, 0) / trend.length) * 10) / 10;
  }, [trend]);

  const totalDefects = useMemo(() => trend.reduce((s, t) => s + t.defectCount, 0), [trend]);

  const timeRangeOptions = [
    { label: t('qms.qms_quality_trend_page.6_2'), value: '6m' },
    { label: t('qms.qms_quality_trend_page.12_3'), value: '12m' },
  ];

  const statCards = [
    {
      id: 'avgPassRate',
      title: t('qms.qms_quality_trend_page.k4'),
      value: avgPassRate,
      suffix: '%',
      color: 'success' as const,
    },
    {
      id: 'totalDefects',
      title: t('qms.qms_quality_trend_page.k5'),
      value: totalDefects,
      color: 'error' as const,
    },
    {
      id: 'trendLength',
      title: t('qms.qms_quality_trend_page.k6'),
      value: `${trend.length} 天`,
      color: 'primary' as const,
    },
  ];

  return (
    <StatsPageTemplate
      title={t('qms.qms_quality_trend_page.k0')}
      statCards={statCards}
      statColumns={3}
      timeRangeOptions={timeRangeOptions}
      timeRange={range}
      onTimeRangeChange={(value) => setRange(value as '6m' | '12m')}
      showSearch={false}
      showExport={false}
      showRefresh={false}
      showCharts={false}
      showTables={false}
      loading={loading}
    >
      {error && (
        <Alert
          severity='error'
          sx={{ mb: 2 }}
          onClose={reload}
        >
          加载失败：{error}
        </Alert>
      )}

      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Typography
          variant='subtitle1'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          {t('qms.qms_quality_trend_page.y_7')}
        </Typography>
        <Box sx={{ width: '100%', height: 340, position: 'relative' }}>
          {loading && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
              }}
            >
              <CircularProgress />
            </Box>
          )}
          {!loading && (
            <ResponsiveContainer
              width='100%'
              height={340}
            >
              <LineChart
                data={trend}
                margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis
                  dataKey='date'
                  fontSize={11}
                />
                <YAxis
                  yAxisId='left'
                  domain={[0, 100]}
                  unit='%'
                  fontSize={11}
                  label={{
                    value: t('qms.qms_quality_trend_page.k8'),
                    angle: -90,
                    position: 'insideLeft',
                  }}
                />
                <YAxis
                  yAxisId='right'
                  orientation='right'
                  fontSize={11}
                  label={{
                    value: t('qms.qms_quality_trend_page.k9'),
                    angle: 90,
                    position: 'insideRight',
                  }}
                />
                <Tooltip />
                <Legend />
                <ReferenceLine
                  yAxisId='left'
                  y={95}
                  stroke={designTokens.colors.success.dark}
                  strokeDasharray='4 4'
                  label={t('qms.qms_quality_trend_page.95_10')}
                />
                <Line
                  yAxisId='left'
                  type='monotone'
                  dataKey='passRate'
                  name={t('qms.qms_quality_trend_page.k11')}
                  stroke={designTokens.colors.success.dark}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  yAxisId='right'
                  type='monotone'
                  dataKey='defectCount'
                  name={t('qms.qms_quality_trend_page.k12')}
                  stroke={designTokens.colors.error.main}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  yAxisId='right'
                  type='monotone'
                  dataKey='issueCount'
                  name={t('qms.qms_quality_trend_page.k13')}
                  stroke={designTokens.colors.warning.main}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Box>
      </Paper>

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography
          variant='subtitle1'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          {t('qms.qms_quality_trend_page.k14')}
        </Typography>
        <Box sx={{ width: '100%', height: 240 }}>
          <ResponsiveContainer
            width='100%'
            height={240}
          >
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis
                dataKey='date'
                fontSize={11}
              />
              <YAxis fontSize={11} />
              <Tooltip />
              <Legend />
              <Line
                type='monotone'
                dataKey='inspectionCount'
                name={t('qms.qms_quality_trend_page.k15')}
                stroke={designTokens.colors.secondary.dark}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
    </StatsPageTemplate>
  );
}
