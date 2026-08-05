import React, { useEffect, useMemo } from 'react';
import { Box, Typography, Card, CardContent, LinearProgress, Chip } from '@mui/material';
import { TrendingUp, Users, Target, DollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useNotificationStore } from '../../store';
import { StatsPageTemplate, type StatsStatCard } from '@/components/templates';
import type { ChartConfig } from '@/components/templates/StatsPageTemplate';
import apiClient from '@/api/client';
import { PageContainer } from '@/components/common';

interface FunnelStage {
  stage: string;
  count: number;
  total_value: number;
  avg_value: number;
  probability?: number;
}

interface FunnelMetrics {
  total_opportunities: number;
  total_value: number;
  avg_value: number;
  conversion_rate: number;
  weighted_value: number;
}

interface ChartDataItem {
  name: string;
  value: number;
  color: string;
}

const CRMSalesFunnelPage: React.FC = () => {
  const { t } = useTranslation();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const stageLabelMap = useMemo<Record<string, string>>(
    () => ({
      lead: t('crm.salesFunnel.stage_lead'),
      qualified: t('crm.salesFunnel.stage_qualified'),
      proposal: t('crm.salesFunnel.stage_proposal'),
      negotiation: t('crm.salesFunnel.stage_negotiation'),
      closed_won: t('crm.salesFunnel.stage_closed_won'),
      closed_lost: t('crm.salesFunnel.stage_closed_lost'),
    }),
    [t]
  );

  const funnelQuery = useQuery<{ metrics: FunnelMetrics | null; stages: FunnelStage[] }>({
    queryKey: ['crm-sales-funnel'],
    queryFn: async () => {
      const [metricsRes, stagesRes] = await Promise.allSettled([
        apiClient.crm.get('/sales-funnel/metrics'),
        apiClient.crm.get('/sales-funnel'),
      ]);
      let metrics: FunnelMetrics | null = null;
      let stages: FunnelStage[] = [];
      if (metricsRes.status === 'fulfilled' && metricsRes.value.success) {
        metrics = metricsRes.value.data as FunnelMetrics;
      }
      if (stagesRes.status === 'fulfilled' && stagesRes.value.success) {
        const data = (stagesRes.value.data as { stages?: FunnelStage[] }) || {};
        stages = data.stages || [];
      }
      return { metrics, stages };
    },
    staleTime: 5 * 60 * 1000,
  });

  const metrics = funnelQuery.data?.metrics ?? null;
  const stages = funnelQuery.data?.stages ?? [];
  const loading = funnelQuery.isLoading;

  useEffect(() => {
    if (funnelQuery.isError) {
      addNotification({
        type: 'error',
        title: t('crm.salesFunnel.title_load_fail'),
        message: t('crm.salesFunnel.msg_load_fail'),
      });
    }
  }, [funnelQuery.isError, addNotification, t]);

  const stats: StatsStatCard[] = [
    {
      id: 'total',
      title: t('crm.salesFunnel.stat_total'),
      value: metrics?.total_opportunities ?? 0,
      icon: <Users size={20} />,
      color: 'primary',
    },
    {
      id: 'value',
      title: t('crm.salesFunnel.stat_total_value'),
      value: `¥${Math.round(Number(metrics?.total_value ?? 0)).toLocaleString()}`,
      icon: <DollarSign size={20} />,
      color: 'success',
    },
    {
      id: 'avg',
      title: t('crm.salesFunnel.stat_avg_value'),
      value: `¥${Math.round(Number(metrics?.avg_value ?? 0)).toLocaleString()}`,
      icon: <Target size={20} />,
      color: 'info',
    },
    {
      id: 'conversion',
      title: t('crm.salesFunnel.stat_conversion'),
      value: `${(metrics?.conversion_rate ?? 0).toFixed(1)}%`,
      icon: <TrendingUp size={20} />,
      color: 'warning',
    },
  ];

  const charts: ChartConfig[] = [
    {
      id: 'stage-distribution',
      title: t('crm.salesFunnel.chart_stage_distribution'),
      type: 'bar' as const,
      dataKey: 'value',
      nameKey: 'name',
      data: stages.flatMap((stage) => [
        {
          name: `${stageLabelMap[stage.stage] || stage.stage}${t('crm.salesFunnel.chart_suffix_count')}`,
          value: stage.count,
          color: 'primary.main',
        },
        {
          name: `${stageLabelMap[stage.stage] || stage.stage}${t('crm.salesFunnel.chart_suffix_value')}`,
          value: Math.round(Number(stage.total_value) / 10000),
          color: 'success.main',
        },
      ]),
    },
  ];

  return (
    <PageContainer
      title={t('crm.salesFunnel.title')}
      subtitle={t('crm.salesFunnel.subtitle')}
      maxWidth='xl'
      autoTitle
      autoBreadcrumbs
    >
      <StatsPageTemplate
        title={t('crm.salesFunnel.template_title')}
        statCards={stats}
        charts={charts}
        loading={loading}
        onRefresh={() => funnelQuery.refetch()}
        timeRangeOptions={[
          { value: 'month', label: t('crm.salesFunnel.range_month') },
          { value: 'quarter', label: t('crm.salesFunnel.range_quarter') },
          { value: 'year', label: t('crm.salesFunnel.range_year') },
          { value: 'all', label: t('crm.salesFunnel.range_all') },
        ]}
      />

      {/* 漏斗阶段详情 */}
      <Box sx={{ mt: 4 }}>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          {t('crm.salesFunnel.section_detail')}
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
            gap: 3,
          }}
        >
          {stages.map((stage, idx) => {
            const max = Math.max(...stages.map((s) => s.count), 1);
            return (
              <Card
                key={stage.stage}
                variant='outlined'
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Box>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        {t('crm.salesFunnel.stage_index', { index: idx + 1 })}
                      </Typography>
                      <Typography
                        variant='h6'
                        sx={{ fontWeight: 600 }}
                      >
                        {stageLabelMap[stage.stage] || stage.stage}
                      </Typography>
                    </Box>
                    {stage.probability !== undefined && (
                      <Chip
                        label={`${Math.round(Number(stage.probability))}%`}
                        color='primary'
                        size='small'
                      />
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
                    <Typography
                      variant='h4'
                      sx={{ fontWeight: 700 }}
                      color='primary.main'
                    >
                      {stage.count}
                    </Typography>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {t('crm.salesFunnel.text_opportunity_count')}
                    </Typography>
                  </Box>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {t('crm.salesFunnel.text_total_value', {
                      value: Math.round(Number(stage.total_value)).toLocaleString(),
                    })}
                  </Typography>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ mb: 2 }}
                  >
                    {t('crm.salesFunnel.text_avg_value', {
                      value: Math.round(Number(stage.avg_value)).toLocaleString(),
                    })}
                  </Typography>
                  <LinearProgress
                    variant='determinate'
                    value={(stage.count / max) * 100}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </CardContent>
              </Card>
            );
          })}
        </Box>
      </Box>
    </PageContainer>
  );
};

export default CRMSalesFunnelPage;
