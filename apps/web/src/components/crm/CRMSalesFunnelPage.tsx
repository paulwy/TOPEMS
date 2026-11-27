import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { TrendingUp, Users, Target, DollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useNotificationStore } from '../../store';
import { StatsPageTemplate, type StatsStatCard } from '@/components/templates';
import type { ChartConfig } from '@/components/templates/StatsPageTemplate';
import { PageContainer } from '@/components/common';
import { crmAnalyticsApi, type Period, type FunnelStageRow } from '@/api/crm';
import i18n from '@/i18n';

type FunnelViewMode = 'count' | 'weighted';

interface MappedStage {
  stage: string;
  count: number;
  totalValue: number;
  weightedValue: number;
  avgValue: number;
}

const CRMSalesFunnelPage: React.FC = () => {
  const { t } = useTranslation();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [viewMode, setViewMode] = useState<FunnelViewMode>('count');
  const [period, setPeriod] = useState<Period>('MTD');

  const stageLabelMap = useMemo<Record<string, string>>(
    () => ({
      lead: t('crm.salesFunnel.stage_lead'),
      qualified: t('crm.salesFunnel.stage_qualified'),
      proposal: t('crm.salesFunnel.stage_proposal'),
      negotiation: t('crm.salesFunnel.stage_negotiation'),
      closed_won: t('crm.salesFunnel.stage_closed_won'),
      closed_lost: t('crm.salesFunnel.stage_closed_lost'),
      won: t('crm.salesFunnel.stage_closed_won'),
      lost: t('crm.salesFunnel.stage_closed_lost'),
      closed: t('crm.salesFunnel.stage_closed'),
    }),
    [t]
  );

  // 真实聚合：GET /api/crm/analytics/funnel → { stages: [{stage,count,total_value,weighted_value}] }
  // 后端不返回独立 metrics envelope，指标在前端由 stages 聚合；无单阶段 probability。
  const funnelQuery = useQuery({
    queryKey: ['crm-analytics-funnel', period],
    queryFn: () => crmAnalyticsApi.getFunnel(period),
    staleTime: 5 * 60 * 1000,
  });

  const rawStages: FunnelStageRow[] = funnelQuery.data?.data?.stages ?? [];
  const stages: MappedStage[] =
    rawStages.map((s) => ({
      stage: s.stage,
      count: s.count,
      totalValue: s.total_value,
      weightedValue: s.weighted_value,
      avgValue: s.count > 0 ? s.total_value / s.count : 0,
    })) ?? [];

  const totalOpportunities = stages.reduce((sum, s) => sum + s.count, 0);
  const totalValue = stages.reduce((sum, s) => sum + s.totalValue, 0);
  const avgValue = totalOpportunities > 0 ? totalValue / totalOpportunities : 0;
  const weightedValue = stages.reduce((sum, s) => sum + s.weightedValue, 0);
  // 后端无阶段间转化率链：以 closed_won 占全部商机比作为诚实转化率近似
  const wonCount = stages
    .filter((s) => s.stage === 'closed_won')
    .reduce((sum, s) => sum + s.count, 0);
  const conversionRate = totalOpportunities > 0 ? (wonCount / totalOpportunities) * 100 : 0;

  const metrics = {
    totalOpportunities,
    totalValue,
    avgValue,
    conversionRate,
    weightedValue,
  };
  const loading = funnelQuery.isLoading || funnelQuery.isFetching;

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
      value: metrics.totalOpportunities,
      icon: <Users size={20} />,
      color: 'primary',
    },
    {
      id: 'value',
      title: t('crm.salesFunnel.stat_total_value'),
      value: `¥${Math.round(Number(metrics.totalValue)).toLocaleString()}`,
      icon: <DollarSign size={20} />,
      color: 'success',
    },
    {
      id: 'avg',
      title: t('crm.salesFunnel.stat_avg_value'),
      value: `¥${Math.round(Number(metrics.avgValue)).toLocaleString()}`,
      icon: <Target size={20} />,
      color: 'info',
    },
    {
      id: 'conversion',
      title: t('crm.salesFunnel.stat_conversion'),
      value: `${metrics.conversionRate.toFixed(1)}%`,
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
            value: Math.round(Number(stage.weightedValue) / 10000),
            color: 'success.700',
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
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, v) => v && setViewMode(v)}
            size='small'
          >
            <ToggleButton value='count'>
              {t('crm.salesFunnel.view_count') || i18n.t('pages.crm_sales_funnel_page.k1')}
            </ToggleButton>
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
          {
            value: 'ROLLING_12M',
            label: t('crm.period.r12') || i18n.t('pages.crm_sales_funnel_page.12_6'),
          },
        ]}
        onTimeRangeChange={(v) => setPeriod(v as Period)}
      />

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
            const barValue = viewMode === 'count' ? stage.count : stage.weightedValue;
            const max = Math.max(
              ...stages.map((s) => (viewMode === 'count' ? s.count : s.weightedValue)),
              1
            );
            const progressValue = (barValue / max) * 100;
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
                    {/* 后端 analytics/funnel 不返回单阶段 probability：概率角标已移除 */}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
                    <Typography
                      variant='h4'
                      sx={{ fontWeight: 700 }}
                      color='primary.main'
                    >
                      {viewMode === 'count'
                        ? stage.count
                        : `¥${Math.round(stage.weightedValue).toLocaleString()}`}
                    </Typography>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {viewMode === 'count'
                        ? t('crm.salesFunnel.text_opportunity_count')
                        : t('crm.salesFunnel.text_total_value', { value: '' }).trim()}
                    </Typography>
                  </Box>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ mb: 2 }}
                  >
                    {t('crm.salesFunnel.text_avg_value', {
                      value: Math.round(Number(stage.avgValue)).toLocaleString(),
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
