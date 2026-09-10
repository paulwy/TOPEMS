/**
 * SPC 控制图分析页
 *
 * 使用 recharts LineChart + ReferenceLine 展示统计过程控制图：
 * - UCL/LCL/CL 控制限
 * - 样本均值点（超限标红）
 * 数据来自 useQmsMock 的 spcCharts + spcDataPoints。
 */
import { useMemo, useState, useEffect } from 'react';
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
import { Box, Paper, Typography, FormControl, Select, MenuItem, CircularProgress, Alert } from '@mui/material';
import { designTokens } from '@topems/tokens';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { spcApi } from '@/api/qms/spc';
import type { SpcChart, SpcDataPoint } from '@/api/qms/types';

export default function QmsSpcControlChartPage() {
  const { t } = useTranslation('qms');
  const { data: chartsData, loading: chartsLoading } = useAnalyticsData<SpcChart[]>({
    fetcher: () => spcApi.listSpcCharts(),
    deps: [],
  });

  const charts = useMemo(() => chartsData ?? [], [chartsData]);
  const [chartId, setChartId] = useState<string>('');

  useEffect(() => {
    if (charts.length > 0 && !chartId) {
      setChartId(charts[0].id);
    }
  }, [charts, chartId]);

  const selectedChart = useMemo(
    () => charts.find((c) => c.id === chartId) ?? charts[0],
    [charts, chartId]
  );

  const { data: pointsData, loading: pointsLoading, error, reload } = useAnalyticsData<SpcDataPoint[]>({
    fetcher: () => selectedChart ? spcApi.getSpcDataPoints(selectedChart.id) : Promise.resolve({ data: [], code: 0, message: 'ok' }),
    deps: [selectedChart?.id],
    immediate: !!selectedChart,
  });

  const loading = chartsLoading || pointsLoading;
  const points = useMemo(() => {
    if (!selectedChart) return [];
    return (pointsData ?? []).map((p) => ({
      sampleNo: p.sampleNo,
      mean: p.mean ?? 0,
      range: p.range ?? 0,
      isOOC: p.isOutOfControl,
    }));
  }, [pointsData, selectedChart]);
  const ucl = selectedChart?.ucl ?? 0;
  const lcl = selectedChart?.lcl ?? 0;
  const cl = selectedChart?.cl ?? 0;
  const oocCount = points.filter((p) => p.isOOC).length;
  const oocRate = points.length > 0 ? Math.round((oocCount / points.length) * 1000) / 10 : 0;

  const statCards = selectedChart
    ? [
        {
          id: 'characteristic',
          title: t('qms.qms_spc_control_chart_page.k1'),
          value: selectedChart.characteristic,
          color: 'primary' as const,
        },
        {
          id: 'cl',
          title: t('qms.qms_spc_control_chart_page.cl_2'),
          value: cl,
          color: 'info' as const,
        },
        {
          id: 'controlLimits',
          title: i18n.t('qms.analytics.spcControlChart.k1'),
          value: `${ucl} / ${lcl}`,
          color: 'warning' as const,
        },
        {
          id: 'ooc',
          title: i18n.t('qms.analytics.spcControlChart.k2'),
          value: oocCount,
          suffix: `(${oocRate}%)`,
          color: 'error' as const,
        },
      ]
    : [];

  const customToolbar =
    charts.length > 0 ? (
      <FormControl
        size='small'
        sx={{ minWidth: 220 }}
      >
        <Select
          value={chartId}
          onChange={(e) => setChartId(e.target.value)}
          aria-label={t('qms.qms_spc_control_chart_page.k0')}
        >
          {charts.map((c) => (
            <MenuItem
              key={c.id}
              value={c.id}
            >
              {c.chartName}（{c.chartType}）
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    ) : null;

  return (
    <StatsPageTemplate
      title={i18n.t('qms.analytics.spcControlChart.k0')}
      statCards={statCards}
      statColumns={4}
      customToolbar={customToolbar}
      showSearch={false}
      showTimeRange={false}
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
      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Typography
          variant='subtitle1'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          {i18n.t('qms.analytics.spcControlChart.k3')}
        </Typography>
        <Box sx={{ width: '100%', height: 360 }}>
          <ResponsiveContainer
            width='100%'
            height={360}
          >
            <LineChart
              data={points}
              margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis
                dataKey='sampleNo'
                fontSize={10}
              />
              <YAxis
                fontSize={11}
                domain={[lcl - 1, ucl + 1]}
              />
              <Tooltip />
              <Legend />
              <ReferenceLine
                y={ucl}
                stroke={designTokens.colors.error.main}
                strokeDasharray='4 4'
                label={{ value: `UCL=${ucl}`, position: 'right', fontSize: 11 }}
              />
              <ReferenceLine
                y={cl}
                stroke={designTokens.colors.success.dark}
                strokeDasharray='2 2'
                label={{ value: `CL=${cl}`, position: 'right', fontSize: 11 }}
              />
              <ReferenceLine
                y={lcl}
                stroke={designTokens.colors.warning.main}
                strokeDasharray='4 4'
                label={{ value: `LCL=${lcl}`, position: 'right', fontSize: 11 }}
              />
              <Line
                type='monotone'
                dataKey='mean'
                name={t('qms.qms_spc_control_chart_page.k3')}
                stroke={designTokens.colors.secondary.dark}
                strokeWidth={2}
                dot={(props: {
                  cx?: number;
                  cy?: number;
                  payload?: {
                    isOOC?: boolean;
                  };
                }) => {
                  const { cx, cy, payload } = props;
                  if (cx == null || cy == null) return <g key='empty' />;
                  return (
                    <circle
                      key={`dot-${cx}-${cy}`}
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill={
                        payload?.isOOC
                          ? designTokens.colors.error.main
                          : designTokens.colors.secondary.dark
                      }
                      stroke={
                        payload?.isOOC
                          ? designTokens.colors.error['800']
                          : designTokens.colors.secondary.dark
                      }
                      strokeWidth={1}
                    />
                  );
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography
          variant='subtitle1'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          {t('qms.qms_spc_control_chart_page.r_4')}
        </Typography>
        <Box sx={{ width: '100%', height: 240 }}>
          <ResponsiveContainer
            width='100%'
            height={240}
          >
            <LineChart data={points}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis
                dataKey='sampleNo'
                fontSize={10}
              />
              <YAxis fontSize={11} />
              <Tooltip />
              <Legend />
              <Line
                type='monotone'
                dataKey='range'
                name={t('qms.qms_spc_control_chart_page.k5')}
                stroke={designTokens.colors.secondary.main}
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
