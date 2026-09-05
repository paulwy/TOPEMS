/**
 * FMEA 风险矩阵分析页
 *
 * 使用 recharts ScatterChart 展示 FMEA 风险分布：
 * - X 轴：发生度（Occurrence, 1-10）
 * - Y 轴：严重度（Severity, 1-10）
 * - 点大小：RPN = S × O × D
 * - 高/中/低风险区域色块
 * 数据来自 useQmsMock 的 fmeaItems。
 */
import { useMemo } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
} from 'recharts';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import { useQmsMock, type QmsMockShape } from '@/api/qms/mockData';
import { designTokens } from '@topems/tokens';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';

const HIGH_RISK_COLOR = designTokens.colors.error.main;
const MEDIUM_RISK_COLOR = designTokens.colors.warning.main;
const LOW_RISK_COLOR = designTokens.colors.success.dark;

function riskLevel(rpn: number): 'high' | 'medium' | 'low' {
  if (rpn >= 200) return 'high';
  if (rpn >= 100) return 'medium';
  return 'low';
}

export default function QmsFmeaRiskMatrixPage() {
  const { data } = useQmsMock<QmsMockShape>();
  const { t } = useTranslation('qms');
  const items = useMemo(() => data.fmeaItems ?? [], [data.fmeaItems]);

  const scatterData = useMemo(() => {
    const high: {
      severity: number;
      occurrence: number;
      rpn: number;
      itemNo: string;
      failureMode: string;
    }[] = [];
    const medium: typeof high = [];
    const low: typeof high = [];

    items.forEach((it) => {
      const point = {
        severity: it.severity,
        occurrence: it.occurrence,
        rpn: it.rpn,
        itemNo: it.itemNo,
        failureMode: it.failureMode,
      };
      const level = riskLevel(it.rpn);
      if (level === 'high') high.push(point);
      else if (level === 'medium') medium.push(point);
      else low.push(point);
    });

    return { high, medium, low };
  }, [items]);

  const stats = useMemo(() => {
    const total = items.length;
    const high = scatterData.high.length;
    const medium = scatterData.medium.length;
    const low = scatterData.low.length;
    const avgRpn =
      total > 0 ? Math.round((items.reduce((s, i) => s + i.rpn, 0) / total) * 10) / 10 : 0;
    const maxRpn = total > 0 ? Math.max(...items.map((i) => i.rpn)) : 0;
    return { total, high, medium, low, avgRpn, maxRpn };
  }, [items, scatterData]);

  const topItems = useMemo(
    () =>
      items
        .slice()
        .sort((a, b) => b.rpn - a.rpn)
        .slice(0, 10),
    [items]
  );

  const statCards = [
    {
      id: 'total',
      title: t('qms.qms_fmea_risk_matrix_page.k0'),
      value: stats.total,
      color: 'primary' as const,
    },
    {
      id: 'high',
      title: i18n.t('qms.analytics.fmeaRiskMatrix.k1'),
      value: stats.high,
      color: 'error' as const,
    },
    {
      id: 'medium',
      title: t('qms.qms_fmea_risk_matrix_page.100199_1'),
      value: stats.medium,
      color: 'warning' as const,
    },
    {
      id: 'avgRpn',
      title: t('qms.qms_fmea_risk_matrix_page.rpn_2'),
      value: stats.avgRpn,
      color: 'secondary' as const,
    },
    {
      id: 'maxRpn',
      title: t('qms.qms_fmea_risk_matrix_page.rpn_3'),
      value: stats.maxRpn,
      color: 'error' as const,
    },
  ];

  return (
    <StatsPageTemplate
      title={i18n.t('qms.analytics.fmeaRiskMatrix.k0')}
      subtitle='RPN = S × O × D'
      statCards={statCards}
      statColumns={5}
      showCharts={false}
      showTables={false}
      showSearch={false}
      showTimeRange={false}
      showExport={false}
      showRefresh={false}
    >
      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Typography
          variant='subtitle1'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          {i18n.t('qms.analytics.fmeaRiskMatrix.k2')}
        </Typography>
        <Box sx={{ width: '100%', height: 420 }}>
          <ResponsiveContainer
            width='100%'
            height={420}
          >
            <ScatterChart margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis
                type='number'
                dataKey='occurrence'
                name={t('qms.qms_fmea_risk_matrix_page.k4')}
                domain={[0, 11]}
                fontSize={11}
                label={{
                  value: t('qms.qms_fmea_risk_matrix_page.o_5'),
                  position: 'bottom',
                  fontSize: 12,
                }}
              />
              <YAxis
                type='number'
                dataKey='severity'
                name={t('qms.qms_fmea_risk_matrix_page.k6')}
                domain={[0, 11]}
                fontSize={11}
                label={{
                  value: t('qms.qms_fmea_risk_matrix_page.s_7'),
                  angle: -90,
                  position: 'insideLeft',
                  fontSize: 12,
                }}
              />
              <ZAxis
                type='number'
                dataKey='rpn'
                range={[60, 400]}
                name='RPN'
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(value: unknown, name: unknown) => [String(value), String(name)]}
                labelFormatter={() => ''}
              />
              <Legend />
              {/* 风险区域背景：高严重度+高发生度=高风险区 */}
              <ReferenceArea
                x1={7}
                x2={11}
                y1={7}
                y2={11}
                fill={HIGH_RISK_COLOR}
                fillOpacity={0.08}
              />
              <ReferenceArea
                x1={4}
                x2={7}
                y1={4}
                y2={7}
                fill={MEDIUM_RISK_COLOR}
                fillOpacity={0.08}
              />
              <ReferenceArea
                x1={0}
                x2={4}
                y1={0}
                y2={4}
                fill={LOW_RISK_COLOR}
                fillOpacity={0.08}
              />
              <Scatter
                name={t('qms.qms_fmea_risk_matrix_page.k8')}
                data={scatterData.high}
                fill={HIGH_RISK_COLOR}
              />
              <Scatter
                name={t('qms.qms_fmea_risk_matrix_page.k9')}
                data={scatterData.medium}
                fill={MEDIUM_RISK_COLOR}
              />
              <Scatter
                name={t('qms.qms_fmea_risk_matrix_page.k10')}
                data={scatterData.low}
                fill={LOW_RISK_COLOR}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography
          variant='subtitle1'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          {t('qms.qms_fmea_risk_matrix_page.k11')}
        </Typography>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>{t('qms.qms_fmea_risk_matrix_page.k12')}</TableCell>
                <TableCell>{t('qms.qms_fmea_risk_matrix_page.k13')}</TableCell>
                <TableCell>{t('qms.qms_fmea_risk_matrix_page.k14')}</TableCell>
                <TableCell>{t('qms.qms_fmea_risk_matrix_page.k15')}</TableCell>
                <TableCell>{t('qms.qms_fmea_risk_matrix_page.k16')}</TableCell>
                <TableCell>RPN</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {topItems.map((it) => {
                const level = riskLevel(it.rpn);
                const chipColor =
                  level === 'high' ? 'error' : level === 'medium' ? 'warning' : 'success';
                return (
                  <TableRow key={it.id}>
                    <TableCell sx={{ fontWeight: 500 }}>{it.itemNo}</TableCell>
                    <TableCell>{it.failureMode}</TableCell>
                    <TableCell>{it.severity}</TableCell>
                    <TableCell>{it.occurrence}</TableCell>
                    <TableCell>{it.detection}</TableCell>
                    <TableCell>
                      <Chip
                        label={it.rpn}
                        color={chipColor}
                        size='small'
                        sx={{ fontWeight: 500 }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </StatsPageTemplate>
  );
}
