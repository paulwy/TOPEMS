/**
 * FMEA 分析详情页
 *
 * 包含：基本信息 + 风险项列表（按 RPN 排序）+ 风险分布图
 * 使用 StatusBadge 组件。
 * 数据来自 useQmsMock。
 */
import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Grid,
  Typography,
  Chip,
  Button,
  Alert,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@mui/material';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import i18n from '@/i18n';
import { useQmsMock, type QmsMockShape } from '@/api/qms/_mock';
import { StatusBadge } from '@/components/qms/StatusBadge';
import { QMS_PATHS } from '@/modules/qms/config';
import { designTokens } from '@topems/tokens';
import { DetailPageTemplate } from '@/components/templates/DetailPageTemplate';

function riskLevel(rpn: number): 'high' | 'medium' | 'low' {
  if (rpn >= 200) return 'high';
  if (rpn >= 100) return 'medium';
  return 'low';
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Paper
      variant='outlined'
      sx={{ p: 2, borderRadius: 2 }}
    >
      <Typography
        variant='caption'
        color='text.secondary'
        sx={{ display: 'block' }}
      >
        {label}
      </Typography>
      <Typography
        variant='body2'
        sx={{ mt: 0.5, fontWeight: 500 }}
      >
        {value}
      </Typography>
    </Paper>
  );
}

function RpnChip({ rpn }: { rpn: number }) {
  const level = riskLevel(rpn);
  const colorConfig = {
    high: {
      bgcolor: designTokens.colors.error[100],
      color: designTokens.colors.error[700],
    },
    medium: {
      bgcolor: designTokens.colors.warning[100],
      color: designTokens.colors.warning[700],
    },
    low: {
      bgcolor: designTokens.colors.success[100],
      color: designTokens.colors.success[700],
    },
  }[level];

  return (
    <Chip
      label={rpn}
      size='small'
      sx={{
        bgcolor: colorConfig.bgcolor,
        color: colorConfig.color,
        fontWeight: 700,
      }}
    />
  );
}

function SummaryFooter({ maxRpn, avgRpn }: { maxRpn: number; avgRpn: number }) {
  return (
    <Paper
      variant='outlined'
      sx={{ p: 2, borderRadius: 2, mt: 3 }}
    >
      <Typography variant='body2'>
        {i18n.t('qms:qms_fmea_detail_page.rpn_1')}
        <Box
          component='span'
          sx={{ fontWeight: 700, color: 'error.main', mx: 0.5 }}
        >
          {maxRpn}
        </Box>
        <Box
          component='span'
          sx={{ ml: 3 }}
        >
          {i18n.t('qms:qms_fmea_detail_page.rpn_0')}
          <Box
            component='span'
            sx={{ fontWeight: 700, color: 'warning.main', mx: 0.5 }}
          >
            {avgRpn}
          </Box>
        </Box>
      </Typography>
    </Paper>
  );
}

export default function QmsFmeaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data } = useQmsMock<QmsMockShape>();

  const analysis = useMemo(() => {
    const list = data.fmeaAnalyses ?? [];
    return list.find((a) => a.id === id) ?? list[0];
  }, [data.fmeaAnalyses, id]);

  const items = useMemo(() => {
    if (!analysis) return [];
    return (data.fmeaItems ?? [])
      .filter((it) => it.fmeaId === analysis.id)
      .slice()
      .sort((a, b) => b.rpn - a.rpn);
  }, [data.fmeaItems, analysis]);

  const distribution = useMemo(() => {
    const buckets = { high: 0, medium: 0, low: 0 };
    items.forEach((it) => {
      buckets[riskLevel(it.rpn)] += 1;
    });
    return [
      {
        level: i18n.t('pages.qms_fmea_detail_page.200_0'),
        count: buckets.high,
        fill: designTokens.colors.error.main,
      },
      {
        level: i18n.t('pages.qms_fmea_detail_page.100199_3'),
        count: buckets.medium,
        fill: designTokens.colors.warning.main,
      },
      {
        level: i18n.t('pages.qms_fmea_detail_page.100_1'),
        count: buckets.low,
        fill: designTokens.colors.success.dark,
      },
    ];
  }, [items]);

  if (!analysis) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert
          severity='info'
          action={
            <Button
              color='inherit'
              size='small'
              onClick={() => navigate(QMS_PATHS.fmea)}
            >
              {i18n.t('pages.qms_fmea_detail_page.fmea_2')}
            </Button>
          }
        >
          {i18n.t('pages.qms_fmea_detail_page.fmea_4')}
        </Alert>
      </Box>
    );
  }

  const avgRpn =
    items.length > 0
      ? Math.round((items.reduce((s, i) => s + i.rpn, 0) / items.length) * 10) / 10
      : 0;
  const maxRpn = items.length > 0 ? items[0].rpn : 0;

  const tabs = [
    {
      id: 'info',
      label: i18n.t('pages.qms_fmea_detail_page.k0'),
      content: (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Grid
            container
            spacing={2}
          >
            <Grid size={{ xs: 12, md: 6, lg: 4 }}>
              <Field
                label={i18n.t('pages.qms_fmea_detail_page.fmea_4')}
                value={analysis.fmeaNo}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6, lg: 4 }}>
              <Field
                label={i18n.t('pages.qms_fmea_detail_page.k5')}
                value={analysis.fmeaType}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6, lg: 4 }}>
              <Field
                label={i18n.t('pages.qms_fmea_detail_page.k6')}
                value={analysis.version ?? '-'}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6, lg: 4 }}>
              <Field
                label={i18n.t('pages.qms_fmea_detail_page.k7')}
                value={String(items.length)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6, lg: 4 }}>
              <Field
                label={i18n.t('pages.qms_fmea_detail_page.rpn_8')}
                value={String(avgRpn)}
              />
            </Grid>
          </Grid>

          <Grid
            container
            spacing={2}
          >
            <Grid size={{ xs: 12, md: 6 }}>
              <Field
                label={i18n.t('pages.qms_fmea_detail_page.fmea_5')}
                value={analysis.fmeaName}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Field
                label={i18n.t('pages.qms_fmea_detail_page.k9')}
                value={analysis.productName ?? '-'}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Field
                label={i18n.t('pages.qms_fmea_detail_page.k10')}
                value={analysis.processName ?? '-'}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Field
                label={i18n.t('pages.qms_fmea_detail_page.k11')}
                value={analysis.scope ?? '-'}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Field
                label={i18n.t('pages.qms_fmea_detail_page.k12')}
                value={analysis.teamLeader ?? '-'}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Field
                label={i18n.t('pages.qms_fmea_detail_page.k13')}
                value={analysis.teamMembers?.join('、') ?? '-'}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Paper
                variant='outlined'
                sx={{ p: 2, borderRadius: 2 }}
              >
                <Typography
                  variant='caption'
                  color='text.secondary'
                  sx={{ display: 'block' }}
                >
                  {i18n.t('pages.qms_fmea_detail_page.k14')}
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ mt: 0.5, lineHeight: 1.6 }}
                >
                  {analysis.description ?? '-'}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          <SummaryFooter
            maxRpn={maxRpn}
            avgRpn={avgRpn}
          />
        </Box>
      ),
    },
    {
      id: 'items',
      label: i18n.t('pages.qms_fmea_detail_page.k1'),
      content: (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Paper
            variant='outlined'
            sx={{ p: 2, borderRadius: 2 }}
          >
            <Typography
              variant='subtitle2'
              sx={{ mb: 2, fontWeight: 600 }}
            >
              {i18n.t('pages.qms_fmea_detail_page.rpn_15')}
            </Typography>
            {items.length === 0 ? (
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {i18n.t('pages.qms_fmea_detail_page.k16')}
              </Typography>
            ) : (
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>{i18n.t('pages.qms_fmea_detail_page.k17')}</TableCell>
                    <TableCell>{i18n.t('pages.qms_fmea_detail_page.k18')}</TableCell>
                    <TableCell>{i18n.t('pages.qms_fmea_detail_page.k19')}</TableCell>
                    <TableCell>S</TableCell>
                    <TableCell>O</TableCell>
                    <TableCell>D</TableCell>
                    <TableCell>RPN</TableCell>
                    <TableCell>{i18n.t('pages.qms_fmea_detail_page.k20')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell sx={{ fontWeight: 500 }}>{it.itemNo}</TableCell>
                      <TableCell>{it.functionDescription}</TableCell>
                      <TableCell>{it.failureMode}</TableCell>
                      <TableCell>{it.severity}</TableCell>
                      <TableCell>{it.occurrence}</TableCell>
                      <TableCell>{it.detection}</TableCell>
                      <TableCell>
                        <RpnChip rpn={it.rpn} />
                      </TableCell>
                      <TableCell sx={{ typography: 'caption', color: 'text.secondary' }}>
                        {it.recommendedActions ?? '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>

          <SummaryFooter
            maxRpn={maxRpn}
            avgRpn={avgRpn}
          />
        </Box>
      ),
    },
    {
      id: 'distribution',
      label: i18n.t('pages.qms_fmea_detail_page.k2'),
      content: (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Grid
            container
            spacing={2}
          >
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper
                variant='outlined'
                sx={{ p: 2, borderRadius: 2 }}
              >
                <Typography
                  variant='subtitle2'
                  sx={{ mb: 2, fontWeight: 600 }}
                >
                  {i18n.t('pages.qms_fmea_detail_page.k21')}
                </Typography>
                <ResponsiveContainer
                  width='100%'
                  height={280}
                >
                  <BarChart data={distribution}>
                    <CartesianGrid strokeDasharray='3 3' />
                    <XAxis
                      dataKey='level'
                      fontSize={11}
                    />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey='count'
                      name={i18n.t('pages.qms_fmea_detail_page.k22')}
                      fill={designTokens.colors.secondary.dark}
                      barSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper
                variant='outlined'
                sx={{ p: 2, borderRadius: 2 }}
              >
                <Typography
                  variant='subtitle2'
                  sx={{ mb: 2, fontWeight: 600 }}
                >
                  {i18n.t('qms:qms_fmea_detail_page.top10rpn_2')}
                </Typography>
                <ResponsiveContainer
                  width='100%'
                  height={280}
                >
                  <BarChart
                    data={items.slice(0, 10).map((it) => ({ itemNo: it.itemNo, rpn: it.rpn }))}
                    layout='vertical'
                  >
                    <CartesianGrid strokeDasharray='3 3' />
                    <XAxis
                      type='number'
                      fontSize={11}
                    />
                    <YAxis
                      type='category'
                      dataKey='itemNo'
                      fontSize={10}
                      width={80}
                    />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey='rpn'
                      name='RPN'
                      fill={designTokens.colors.error.main}
                      barSize={16}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>

          <SummaryFooter
            maxRpn={maxRpn}
            avgRpn={avgRpn}
          />
        </Box>
      ),
    },
  ];

  return (
    <DetailPageTemplate
      title={analysis.fmeaNo}
      subtitle={analysis.fmeaName}
      detailItemName={analysis.fmeaNo}
      onBack={() => navigate(QMS_PATHS.fmea)}
      headerContent={
        <StatusBadge
          fsm='apqp'
          status={analysis.status}
          label={analysis.status}
        />
      }
      tabs={tabs}
      defaultTab='info'
    />
  );
}
