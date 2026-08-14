import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Card, CardContent, LinearProgress, Chip, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { TrendingUp, Users, Target, DollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useNotificationStore } from '../../store';
import { StatsPageTemplate, type StatsStatCard } from '@/components/templates';
import type { ChartConfig } from '@/components/templates/StatsPageTemplate';
import apiClient from '@/api/client';
import { PageContainer } from '@/components/common';
import { useCrmMock, type FunnelData, type Period } from '@/api/crm';
import i18n from '@/i18n';

type FunnelViewMode = 'count' | 'weighted';

const CRMSalesFunnelPage: React.FC = () => {
  const { t } = useTranslation();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [viewMode, setViewMode] = useState<FunnelViewMode>('count');
  const [period, setPeriod] = useState<Period>('MTD');

  const { data: mockData, mockEnabled } = useCrmMock<FunnelData>({ period });

  const stageLabelMap = useMemo<Record<string, string>>(
    () => ({
      lead: t('crm.salesFunnel.stage_lead'),
      qualified: t('crm.salesFunnel.stage_qualified'),
      proposal: t('crm.salesFunnel.stage_proposal'),
      negotiation: t('crm.salesFunnel.stage_negotiation'),
      won: t('crm.salesFunnel.stage_closed_won'),
      lost: t('crm.salesFunnel.stage_closed_lost'),
      closed: t('crm.salesFunnel.stage_closed'),
    }),
    [t]
  );

  const funnelQuery = useQuery<FunnelData>({
    queryKey: ['crm-sales-funnel', period],
    queryFn: async () => {
      const [metricsRes, stagesRes] = await Promise.allSettled([
        apiClient.crm.get('/sales-funnel/metrics'),
        apiClient.crm.get('/sales-funnel'),
      ]);
      let metrics: FunnelData['metrics'] | null = null;
      let stages: FunnelData['stages'] = [];
      if (metricsRes.status === 'fulfilled' && metricsRes.value.success) {
        metrics = metricsRes.value.data as FunnelData['metrics'];
      }
      if (stagesRes.status === 'fulfilled' && stagesRes.value.success) {
        const data = (stagesRes.value.data as { stages?: FunnelData['stages'] }) || {};
        stages = data.stages || [];
      }
      return { stages, metrics: metrics! };
    },
    staleTime: 5 * 60 * 1000,
    initialData: mockEnabled ? mockData : undefined,
    enabled: !mockEnabled,
  });

  const merged = mockEnabled ? mockData : funnelQuery.data;
  const metrics = merged?.metrics ?? null;
  const stages = merged?.stages ?? [];
  const loading = !mockEnabled && funnelQuery.isLoading;

  useEffect(() => {
    if (!mockEnabled && funnelQuery.isError) {
      addNotification({
        type: 'error',
        title: t('crm.salesFunnel.title_load_fail'),
        message: t('crm.salesFunnel.msg_load_fail'),
      });
    }
  }, [funnelQuery.isError, addNotification, t, mockEnabled]);

  const stats: StatsStatCard[] = [
    {
      id: 'total',
      title: t('crm.salesFunnel.stat_total'),
      value: metrics?.totalOpportunities ?? 0,
      icon: <Users size={20} />,
      color: 'primary',
    },
    {
      id: 'value',
      title: t('crm.salesFunnel.stat_total_value'),
      value: `¥${Math.round(Number(metrics?.totalValue ?? 0)).toLocaleString()}`,
      icon: <DollarSign size={20} />,
      color: 'success',
    },
    {
      id: 'avg',
      title: t('crm.salesFunnel.stat_avg_value'),
      value: `¥${Math.round(Number(metrics?.avgValue ?? 0)).toLocaleString()}`,
      icon: <Target size={20} />,
      color: 'info',
    },
    {
      id: 'conversion',
      title: t('crm.salesFunnel.stat_conversion'),
      value: `${(metrics?.conversionRate ?? 0).toFixed(1)}%`,
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
      data: stages.flatMap((stage) => {
        const label = stageLabelMap[stage.stage] || stage.stage;
        if (viewMode === 'count') {
          return [
            {
              name: `${label}${t('crm.salesFunnel.chart_suffix_count')}`,
              value: stage.count,
              color: 'primary.main',
            },
          ];
        }
        return [
          {
            name: `${label}${t('crm.salesFunnel.chart_suffix_value')}`,
            value: Math.round(Number(stage.amount) / 10000),
            color: 'success.main',
          },
        ];
      }),
    },
  ];

  return (
    <PageContainer
      title={t('crm.salesFunnel.title')}
      subtitle={t('crm.salesFunnel.subtitle')}
      maxWidth='xl'
      autoTitle
      autoBreadcrumbs
      headerActions={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {mockEnabled && (
            <Chip
              label={t('crm.common.mock_demo_badge') || i18n.t('pages.crm_sales_funnel_page.mock_0')}
              color='warning'
              size='small'
              variant='outlined'
              sx={{ fontWeight: 600 }}
            />
          )}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, v) => v && setViewMode(v)}
            size='small'
          >
            <ToggleButton value='count'>{t('crm.salesFunnel.view_count') || i18n.t('pages.crm_sales_funnel_page.k1')}</ToggleButton>
            <ToggleButton value='weighted'>
              {t('crm.salesFunnel.view_weighted') || i18n.t('pages.crm_sales_funnel_page.k2')}
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      }
    >
      <StatsPageTemplate
        title={t('crm.salesFunnel.template_title')}
        statCards={stats}
        charts={charts}
        loading={loading}
        onRefresh={() => funnelQuery.refetch()}
        timeRangeOptions={[
          { value: 'MTD', label: t('crm.period.mtd') || i18n.t('pages.crm_sales_funnel_page.k3') },
          { value: 'QTD', label: t('crm.period.qtd') || i18n.t('pages.crm_sales_funnel_page.k4') },
          { value: 'YTD', label: t('crm.period.ytd') || i18n.t('pages.crm_sales_funnel_page.k5') },
          { value: 'ROLLING_12M', label: t('crm.period.r12') || i18n.t('pages.crm_sales_funnel_page.12_6') },
        ]}
        onTimeRangeChange={(v) => setPeriod(v as Period)}
      />

      <Box sx={{ mt: 4 }}>
        <Typography variant='h6' sx={{ fontWeight: 600, mb: 2 }}>
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
            const max = Math.max(...stages.map((s) => (viewMode === 'count' ? s.count : s.amount)), 1);
            const progressValue =
              viewMode === 'count' ? (stage.count / max) * 100 : (stage.amount / max) * 100;
            return (
              <Card key={stage.stage} variant='outlined'>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Box>
                      <Typography variant='caption' color='text.secondary'>
                        {t('crm.salesFunnel.stage_index', { index: idx + 1 })}
                      </Typography>
                      <Typography variant='h6' sx={{ fontWeight: 600 }}>
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
                    <Typography variant='h4' sx={{ fontWeight: 700 }} color='primary.main'>
                      {viewMode === 'count' ? stage.count : `¥${Math.round(stage.amount).toLocaleString()}`}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {viewMode === 'count'
                        ? t('crm.salesFunnel.text_opportunity_count')
                        : t('crm.salesFunnel.text_total_value', { value: '' }).trim()}
                    </Typography>
                  </Box>
                  <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                    {t('crm.salesFunnel.text_avg_value', {
                      value: Math.round(Number(stage.avgValue ?? stage.amount / Math.max(stage.count, 1))).toLocaleString(),
                    })}
                  </Typography>
                  <LinearProgress
                    variant='determinate'
                    value={progressValue}
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
