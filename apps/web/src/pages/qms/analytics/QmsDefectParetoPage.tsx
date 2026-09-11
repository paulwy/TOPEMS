/**
 * 缺陷帕累托分析页
 *
 * 使用 recharts ComposedChart（Bar + Line）展示缺陷帕累托图：
 * - 柱状图：缺陷数量（降序）
 * - 折线图：累积占比（80/20 分析基准线）
 * 数据来自 qualityDashboardApi.getDefectDistribution。
 */
import { useMemo } from 'react';
import {
  Chip,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  Box,
  Alert,
} from '@mui/material';
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
import i18n from '@/i18n';
import { designTokens } from '@topems/tokens';
import { StatsPageTemplate, type StatCard } from '@/components/templates/StatsPageTemplate';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { qualityDashboardApi, type QualityDefectDistribution } from '@/api/qms/dashboard';

export default function QmsDefectParetoPage() {
  const {
    data: defectData,
    loading,
    error,
    reload,
  } = useAnalyticsData<QualityDefectDistribution[]>({
    fetcher: () => qualityDashboardApi.getDefectDistribution(),
    deps: [],
  });

  const defectDistribution = useMemo(
    () => (defectData ?? []) as QualityDefectDistribution[],
    [defectData]
  );

  const paretoData = useMemo(() => {
    const list = defectDistribution.slice();
    list.sort((a, b) => b.count - a.count);
    const total = list.reduce((s, c) => s + c.count, 0) || 1;
    let acc = 0;
    return list.map((c) => {
      acc += c.count;
      return {
        category: c.category,
        count: c.count,
        percentage: c.percentage,
        cumulativePct: Number(((acc / total) * 100).toFixed(1)),
      };
    });
  }, [defectDistribution]);

  const vitalFew = useMemo(() => {
    const vital = paretoData.filter((d) => d.cumulativePct <= 80);
    return vital.length === 0 ? paretoData.slice(0, 2) : vital;
  }, [paretoData]);

  const statCards = useMemo<StatCard[]>(
    () => [
      {
        id: 'defectCategories',
        title: i18n.t('pages.qms_defect_pareto_page.k1'),
        value: paretoData.length,
        color: 'info',
      },
      {
        id: 'totalDefects',
        title: i18n.t('pages.qms_defect_pareto_page.k2'),
        value: paretoData.reduce((s, d) => s + d.count, 0),
        color: 'error',
      },
      {
        id: 'vitalFew',
        title: i18n.t('pages.qms_defect_pareto_page.k3'),
        value: vitalFew.map((v) => v.category).join('、') || '-',
        color: 'warning',
      },
    ],
    [paretoData, vitalFew]
  );

  return (
    <StatsPageTemplate
      title={i18n.t('pages.qms_defect_pareto_page.k0')}
      subtitle={`${i18n.t('qms.analytics.defectPareto.k0')}${vitalFew.length}${i18n.t(
        'qms.analytics.defectPareto.k2'
      )}`}
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
        <Alert
          severity='error'
          sx={{ mb: 2 }}
          onClose={reload}
        >
          加载失败：{error}
        </Alert>
      )}

      <Grid
        container
        spacing={3}
      >
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600, mb: 2 }}
            >
              {i18n.t('qms.analytics.defectPareto.k1')}
            </Typography>
            <Box sx={{ width: '100%', height: 360, position: 'relative' }}>
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
                  height={360}
                >
                  <ComposedChart
                    data={paretoData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray='3 3' />
                    <XAxis
                      dataKey='category'
                      fontSize={11}
                      angle={-15}
                      textAnchor='end'
                      height={60}
                    />
                    <YAxis
                      yAxisId='left'
                      fontSize={11}
                      label={{
                        value: i18n.t('pages.qms_defect_pareto_page.k4'),
                        angle: -90,
                        position: 'insideLeft',
                      }}
                    />
                    <YAxis
                      yAxisId='right'
                      orientation='right'
                      domain={[0, 100]}
                      unit='%'
                      fontSize={11}
                      label={{
                        value: i18n.t('pages.qms_defect_pareto_page.k5'),
                        angle: 90,
                        position: 'insideRight',
                      }}
                    />
                    <Tooltip />
                    <Legend />
                    <ReferenceLine
                      yAxisId='right'
                      y={80}
                      stroke={designTokens.colors.error.main}
                      strokeDasharray='4 4'
                      label={i18n.t('pages.qms_defect_pareto_page.80_0')}
                    />
                    <Bar
                      yAxisId='left'
                      dataKey='count'
                      name={i18n.t('pages.qms_defect_pareto_page.k6')}
                      fill={designTokens.colors.secondary.dark}
                      barSize={36}
                    />
                    <Line
                      yAxisId='right'
                      type='monotone'
                      dataKey='cumulativePct'
                      name={i18n.t('pages.qms_defect_pareto_page.k7')}
                      stroke={designTokens.colors.error.main}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600, mb: 2 }}
            >
              {i18n.t('pages.qms_defect_pareto_page.k8')}
            </Typography>
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>{i18n.t('pages.qms_defect_pareto_page.k9')}</TableCell>
                    <TableCell align='right'>
                      {i18n.t('pages.qms_defect_pareto_page.k10')}
                    </TableCell>
                    <TableCell align='right'>
                      {i18n.t('pages.qms_defect_pareto_page.k11')}
                    </TableCell>
                    <TableCell align='right'>
                      {i18n.t('pages.qms_defect_pareto_page.k12')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paretoData.map((row) => (
                    <TableRow
                      key={row.category}
                      hover
                    >
                      <TableCell>
                        <Chip
                          label={row.category}
                          size='small'
                          color={row.cumulativePct <= 80 ? 'error' : 'default'}
                          variant={row.cumulativePct <= 80 ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell align='right'>{row.count}</TableCell>
                      <TableCell align='right'>{row.percentage.toFixed(1)}%</TableCell>
                      <TableCell align='right'>{row.cumulativePct.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </StatsPageTemplate>
  );
}
