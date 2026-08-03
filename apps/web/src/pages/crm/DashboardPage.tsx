import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Card, CardContent, CardHeader, Grid, useTheme } from '@mui/material';
import {
  TrendingUp,
  Users,
  FileText,
  ArrowRight,
  Target,
  CheckCircle,
  TrendingDown,
  Activity,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import BarChartComponent from '../../components/charts/BarChart';
import { useNotificationStore } from '@/store';
import LineChartComponent from '../../components/charts/LineChart';
import PieChartComponent from '../../components/charts/PieChart';
import {
  DashboardTemplate,
  type StatCard,
  type ChartCard,
  type QuickAction,
} from '@/components/templates';
import { PageContainer } from '@/components/common/PageContainer';
import { crmApi } from '@/api/crm';
import { logger } from '@/utils/logger';
import type { FunnelStage, OpportunityStats } from '@/api/crm';
import { CRM_PATHS } from '@/modules/crm/config';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  TrendingUp,
  Users,
  FileText,
  Target,
  CheckCircle,
};

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();

  const statsQuery = useQuery({
    queryKey: QUERY_KEYS.CRM.OPPORTUNITY_STATS,
    queryFn: async (): Promise<OpportunityStats | null> => {
      try {
        const response = await crmApi.opportunities.getStats();
        if (response.success && response.data) {
          return response.data;
        }
        return null;
      } catch (error: unknown) {
        const status = (error as { response?: { status?: number } }).response?.status;
        if (status === 401) {
          logger.warn(t('crm.overview.auth_required'));
        } else if (status === 503) {
          logger.warn(t('crm.overview.service_unavailable'));
        } else {
          logger.error(t('crm.overview.load_dashboard_fail'), error);
        }
        return null;
      }
    },
  });

  const funnelQuery = useQuery({
    queryKey: QUERY_KEYS.CRM.OPPORTUNITY_FUNNEL,
    queryFn: async (): Promise<FunnelStage[]> => {
      try {
        const response = await crmApi.opportunities.getFunnel();
        if (response.success && response.data) {
          return response.data;
        }
        return [];
      } catch (error: unknown) {
        const status = (error as { response?: { status?: number } }).response?.status;
        if (status === 401) {
          logger.warn(t('crm.overview.auth_required'));
        } else if (status === 503) {
          logger.warn(t('crm.overview.service_unavailable'));
        } else {
          logger.error(t('crm.overview.load_dashboard_fail'), error);
        }
        return [];
      }
    },
  });

  const stats = statsQuery.data ?? null;
  const funnelData = funnelQuery.data ?? [];
  const loading = statsQuery.isLoading || funnelQuery.isLoading;

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return t('crm.overview.greeting_morning');
    if (hour < 18) return t('crm.overview.greeting_afternoon');
    return t('crm.overview.greeting_evening');
  };

  const funnelBarData = funnelData.map((item) => ({
    name: item.stage_label,
    value: item.count,
  }));

  const funnelValueData = funnelData.map((item) => ({
    name: item.stage_label,
    value: item.total_value || 0,
  }));

  const wonRate =
    stats && stats.total_count > 0 ? Math.round((stats.won_count / stats.total_count) * 100) : 0;

  const statsCards: StatCard[] = [
    {
      id: 'customer-total',
      title: t('crm.overview.stat_opportunity_total'),
      value: (stats?.total_count || 89).toString(),
      change: 12,
      changeLabel: t('crm.overview.vs_last_period'),
      icon: <Target size={24} />,
      color: 'primary',
    },
    {
      id: 'opportunity-count',
      title: t('crm.overview.stat_total_amount'),
      value: `¥${(stats?.total_value || 5680000).toLocaleString()}`,
      change: 15,
      changeLabel: t('crm.overview.vs_last_period'),
      icon: <TrendingUp size={24} />,
      color: 'info',
    },
    {
      id: 'monthly-deals',
      title: t('crm.overview.stat_won_count'),
      value: (stats?.won_count || 15).toString(),
      change: 3,
      changeLabel: t('crm.overview.vs_last_period'),
      icon: <CheckCircle size={24} />,
      color: 'success',
    },
    {
      id: 'sales-amount',
      title: t('crm.overview.stat_won_rate'),
      value: `${wonRate}%`,
      change: wonRate > 50 ? 5 : -3,
      changeLabel: t('crm.overview.vs_last_period'),
      icon: <Activity size={24} />,
      color: wonRate > 50 ? 'success' : 'warning',
    },
  ];

  const charts: ChartCard[] = [
    {
      id: 'funnel-count',
      title: t('crm.overview.chart_funnel_count'),
      height: 300,
      chart: (
        <BarChartComponent
          data={funnelBarData}
          xKey='name'
          yKey='value'
        />
      ),
    },
    {
      id: 'funnel-value',
      title: t('crm.overview.chart_funnel_value'),
      height: 300,
      chart: (
        <BarChartComponent
          data={funnelValueData}
          xKey='name'
          yKey='value'
        />
      ),
    },
    {
      id: 'conversion-rate',
      title: t('crm.overview.chart_stage_ratio'),
      height: 300,
      chart: (
        <PieChartComponent
          data={funnelData.map((item) => ({
            name: item.stage_label,
            value: item.count,
          }))}
        />
      ),
    },
  ];

  const quickActions: QuickAction[] = [
    {
      id: 'add-customer',
      label: t('crm.overview.action_add_customer'),
      icon: <ArrowRight size={20} />,
      href: CRM_PATHS.customerCreate,
      color: 'primary.main',
    },
    {
      id: 'create-opportunity',
      label: t('crm.overview.action_create_opportunity'),
      icon: <ArrowRight size={20} />,
      href: CRM_PATHS.opportunities,
      color: 'success.main',
    },
    {
      id: 'customer-scoring',
      label: t('crm.overview.action_customer_scoring'),
      icon: <ArrowRight size={20} />,
      href: CRM_PATHS.customerScoring,
      color: 'secondary.main',
    },
    {
      id: 'sales-report',
      label: t('crm.overview.action_sales_forecast'),
      icon: <ArrowRight size={20} />,
      href: CRM_PATHS.salesForecast,
      color: 'warning.main',
    },
  ];

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography sx={{ fontSize: '1.125rem', color: 'grey.600' }}>{t('crm.common.loading')}</Typography>
      </Box>
    );
  }

  return (
    <PageContainer
      title={t('crm.overview.title')}
      subtitle={`${getGreeting()}${t('crm.overview.subtitle_suffix')}`}
      padding={false}
      maxWidth={false}
      autoTitle
      autoBreadcrumbs
    >
      <Card sx={{ mb: 3 }}>
        <CardHeader>
          <Typography
            variant='h6'
            sx={{
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <TrendingUp style={{ width: 20, height: 20 }} />
            {t('crm.overview.funnel_overview_title')}
          </Typography>
          <Typography
            variant='body2'
            sx={{ color: 'grey.500' }}
          >
            {t('crm.overview.funnel_overview_desc')}
          </Typography>
        </CardHeader>
        <CardContent>
          <Grid
            container
            spacing={2}
          >
            {funnelData.map((item, index) => {
              const widthPercent = 100 - index * 10;
              const stageColors: Record<string, string> = {
                prospecting: 'text.disabled',
                qualified: 'primary.main',
                proposal: 'secondary.main',
                negotiation: 'warning.main',
                closed_won: 'success.main',
                closed_lost: 'error.main',
              };
              return (
                <Grid
                  size={{ xs: 12 }}
                  key={item.stage}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                    }}
                  >
                    <Box
                      sx={{
                        width: 60,
                        textAlign: 'right',
                        fontSize: '0.875rem',
                      }}
                    >
                      {item.stage_label}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <div
                        style={{
                          height: 24,
                          backgroundColor: theme.palette.grey[100],
                          borderRadius: 4,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            backgroundColor: stageColors[item.stage] || theme.palette.grey[500],
                            width: `${widthPercent}%`,
                            display: 'flex',
                            alignItems: 'center',
                            paddingLeft: 8,
                            color: 'white',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                          }}
                        >
                          {item.count} ({(item.total_value || 0).toLocaleString()})
                        </div>
                      </div>
                    </Box>
                    <Box
                      sx={{
                        width: 80,
                        textAlign: 'right',
                        fontSize: '0.875rem',
                      }}
                    >
                      {item.avg_probability ? `${item.avg_probability.toFixed(0)}%` : '-'}
                    </Box>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </CardContent>
      </Card>

      <DashboardTemplate
        title=''
        subtitle=''
        breadcrumbs={[{ label: t('crm.common.home'), href: '/dashboard' }, { label: t('crm.common.customer_relationship') }]}
        stats={statsCards}
        charts={charts}
        quickActions={quickActions}
        quickActionsTitle={t('crm.overview.quick_actions_title')}
      />
    </PageContainer>
  );
};

export default DashboardPage;
