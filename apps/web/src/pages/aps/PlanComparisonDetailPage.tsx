/**
 * 计划对比详情页
 *
 * 展示生产计划与实际执行的对比分析。
 * 使用 APS API client 获取计划数据，结合 mock 实际数据进行对比展示。
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Box, Grid, Paper, Typography, Alert, Button } from '@mui/material';
import i18n from '@/i18n';
import { productionPlanApi } from '@/api/aps';
import type { ProductionPlan } from '@/api/aps/types';
import { StatusBadge } from '@/components/aps/StatusBadge';
import { designTokens } from '@topems/tokens';
import { useTranslation } from 'react-i18next';
import { DetailPageTemplate } from '@/components/templates';
import { type SectionConfig } from '@/components/templates/DetailPageTemplate';

interface ComparisonData {
  period: string;
  planned: number;
  actual: number;
}

const MOCK_COMPARISON: ComparisonData[] = [
  { period: i18n.t('aps.plan_comparison_detail_page.1_0'), planned: 1000, actual: 950 },
  { period: i18n.t('aps.plan_comparison_detail_page.2_1'), planned: 1200, actual: 1100 },
  { period: i18n.t('aps.plan_comparison_detail_page.3_2'), planned: 1100, actual: 1150 },
  { period: i18n.t('aps.plan_comparison_detail_page.4_3'), planned: 1300, actual: 1200 },
  { period: i18n.t('aps.plan_comparison_detail_page.5_4'), planned: 1400, actual: 1380 },
  { period: i18n.t('aps.plan_comparison_detail_page.6_5'), planned: 1500, actual: 1450 },
];

export default function PlanComparisonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('aps');
  const [plan, setPlan] = useState<ProductionPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    productionPlanApi
      .get(id)
      .then((res) => {
        if (res.success && res.data) {
          setPlan(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (!plan && !loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert
          severity='info'
          action={
            <Button
              color='inherit'
              size='small'
              onClick={() => navigate('/aps/production-plans')}
            >
              {i18n.t('pages.plan_comparison_detail_page.k1')}
            </Button>
          }
        >
          {t('aps.plan_comparison_detail_page.k6')}
        </Alert>
      </Box>
    );
  }

  const totalPlanned = MOCK_COMPARISON.reduce((sum, d) => sum + d.planned, 0);
  const totalActual = MOCK_COMPARISON.reduce((sum, d) => sum + d.actual, 0);
  const adherenceRate = ((totalActual / totalPlanned) * 100).toFixed(1);

  const sections: SectionConfig[] = plan
    ? [
        {
          id: 'chart',
          title: t('aps.plan_comparison_detail_page.vs_10'),
          content: (
            <Paper sx={{ p: 2 }}>
              <ResponsiveContainer
                width='100%'
                height={350}
              >
                <BarChart data={MOCK_COMPARISON}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='period' />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey='planned'
                    name={t('aps.plan_comparison_detail_page.k11')}
                    fill={designTokens.colors.primary.main}
                  />
                  <Bar
                    dataKey='actual'
                    name={t('aps.plan_comparison_detail_page.k12')}
                    fill={designTokens.colors.success.dark}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          ),
        },
        {
          id: 'basic',
          title: t('aps.plan_comparison_detail_page.k13'),
          content: (
            <Grid
              container
              spacing={2}
            >
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('aps.plan_comparison_detail_page.k14')}
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>{plan.plan_no}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('aps.plan_comparison_detail_page.k15')}
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>{plan.plan_name}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('aps.plan_comparison_detail_page.k16')}
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>{plan.plan_type ?? '-'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('aps.plan_comparison_detail_page.k17')}
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>{plan.product_name ?? '-'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('aps.plan_comparison_detail_page.k18')}
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>
                  {plan.target_quantity?.toLocaleString() ?? '-'}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('aps.plan_comparison_detail_page.k19')}
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>
                  {plan.start_date ?? '-'} ~ {plan.end_date ?? '-'}
                </Typography>
              </Grid>
            </Grid>
          ),
        },
      ]
    : [];

  return (
    <DetailPageTemplate
      title={plan?.plan_name ?? '-'}
      subtitle={plan?.plan_no ?? '-'}
      backHref='/aps/production-plans'
      loading={loading}
      headerContent={
        plan && (
          <StatusBadge
            fsm='production_plan'
            status={plan.status ?? 'draft'}
          />
        )
      }
      infoCard={
        plan
          ? {
              stats: [
                {
                  label: t('aps.plan_comparison_detail_page.k7'),
                  value: totalPlanned.toLocaleString(),
                },
                {
                  label: t('aps.plan_comparison_detail_page.k8'),
                  value: totalActual.toLocaleString(),
                },
                { label: t('aps.plan_comparison_detail_page.k9'), value: `${adherenceRate}%` },
              ],
            }
          : undefined
      }
      sections={sections}
    />
  );
}
