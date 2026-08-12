import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Target, TrendingUp, Users, Clock, DollarSign, Package } from 'lucide-react';
import { DashboardTemplate } from '@/components/templates';
import type { StatCardConfig, ChartConfig } from '@/components/templates/DashboardTemplate';
import { PageContainer } from '@/components/common';
import { useTranslation } from 'react-i18next';
import { useCrmDashboardSchema } from '@/schemas/crm';
import { useCrmMock, type DashboardData, type Period } from '@/api/crm';
import { Box, Chip, MenuItem, Select, type SelectChangeEvent } from '@mui/material';

const MockBadge: React.FC<{ enabled: boolean }> = ({ enabled }) => {
  const { t } = useTranslation();
  if (!enabled) return null;
  return (
    <Chip
      label={t('crm.common.mock_demo_badge') || 'Mock 演示'}
      color='warning'
      size='small'
      variant='outlined'
      sx={{ fontWeight: 600 }}
    />
  );
};

const PeriodSelector: React.FC<{
  period: Period;
  onChange: (p: Period) => void;
}> = ({ period, onChange }) => {
  const { t } = useTranslation();
  return (
    <Select
      value={period}
      size='small'
      onChange={(e: SelectChangeEvent<Period>) => onChange(e.target.value as Period)}
      sx={{ minWidth: 140 }}
    >
      <MenuItem value='MTD'>{t('crm.period.mtd') || '本月'}</MenuItem>
      <MenuItem value='QTD'>{t('crm.period.qtd') || '本季度'}</MenuItem>
      <MenuItem value='YTD'>{t('crm.period.ytd') || '本年'}</MenuItem>
      <MenuItem value='ROLLING_12M'>{t('crm.period.r12') || '近12月'}</MenuItem>
    </Select>
  );
};

const CrmDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const schema = useCrmDashboardSchema();
  const [period, setPeriod] = useState<Period>('MTD');

  const { data: mockData, mockEnabled } = useCrmMock<DashboardData>({ period });

  const { data: serverData, isLoading: loading } = useQuery<DashboardData | null>({
    queryKey: ['crm-dashboard', period],
    queryFn: async () => {
      await schema.loader?.();
      return (window as unknown as { __crmStats?: DashboardData | null }).__crmStats ?? null;
    },
    staleTime: 5 * 60 * 1000,
    initialData: mockEnabled ? mockData : undefined,
    enabled: !mockEnabled && !!schema.loader,
  });

  const dashboardData = mockEnabled
    ? mockData
    : (serverData ?? (schema.statCards || schema.charts ? undefined : mockData));

  const statCards = useMemo<StatCardConfig[]>(() => {
    const kpis = dashboardData?.kpis;
    const cardsFromSchema =
      schema.statCards?.map((sc) => {
        const value = typeof sc.value === 'function' ? sc.value() : sc.value;
        const iconMap: Record<string, React.ReactNode> = {
          Target: <Target size={24} />,
          TrendingUp: <TrendingUp size={24} />,
          Users: <Users size={24} />,
          Clock: <Clock size={24} />,
        };
        return {
          title: t(`crm.dashboard.${sc.id}`),
          value: value as string | number,
          icon: iconMap[sc.icon as string] ?? <Target size={24} />,
          color: sc.color,
          trend: sc.trend,
          loading,
        } as StatCardConfig;
      }) ?? [];

    if (mockEnabled || kpis) {
      return [
        {
          title: t('crm.dashboard.kpi_customers') || '客户总数',
          value: kpis?.customers ?? 120,
          icon: <Users size={24} />,
          color: 'primary',
          trend: { value: 8.2, label: '↑' },
          loading,
        },
        {
          title: t('crm.dashboard.kpi_open_opps') || '在途商机',
          value: kpis?.openOpps ?? 40,
          icon: <Target size={24} />,
          color: 'info',
          trend: { value: 5.1, label: '↑' },
          loading,
        },
        {
          title: t('crm.dashboard.kpi_win_rate') || '赢单率',
          value: `${((kpis?.winRate ?? 0.42) * 100).toFixed(0)}%`,
          icon: <TrendingUp size={24} />,
          color: 'success',
          trend: { value: 2.3, label: '↑' },
          loading,
        },
        {
          title: t('crm.dashboard.kpi_new_signed') || '本月新签',
          value: `¥${(kpis?.newSignedMtd ?? 2_380_000).toLocaleString()}`,
          icon: <DollarSign size={24} />,
          color: 'warning',
          trend: { value: 12.6, label: '↑' },
          loading,
        },
        {
          title: t('crm.dashboard.kpi_active_contacts') || '活跃联系人',
          value: kpis?.activeContacts ?? 60,
          icon: <Users size={24} />,
          color: 'secondary',
          trend: { value: 3.8, label: '↑' },
          loading,
        },
        {
          title: t('crm.dashboard.kpi_pending_returns') || '待处理退货',
          value: kpis?.pendingReturns ?? 18,
          icon: <Package size={24} />,
          color: 'error',
          trend: { value: 1.5, label: '↓' },
          loading,
        },
      ] as unknown as StatCardConfig[];
    }
    return cardsFromSchema;
  }, [schema.statCards, loading, t, mockEnabled, dashboardData]);

  const charts = useMemo<ChartConfig[]>(() => {
    const chartsFromSchema =
      schema.charts?.map((ch) => {
        const rawData =
          typeof ch.data === 'function'
            ? (ch.data as () => Array<Record<string, unknown>>)()
            : (ch.data as Array<Record<string, unknown>>);
        return {
          title: t(`crm.dashboard.${ch.id}`),
          type: ch.type,
          data: (rawData ?? []) as Array<Record<string, unknown>>,
          xField: 'name',
          yField: 'value',
          height: ch.height,
          loading,
        };
      }) ?? [];

    if (mockEnabled || dashboardData) {
      return [
        {
          id: 'funnel-bar',
          title: t('crm.dashboard.chart_funnel') || '销售漏斗',
          type: 'bar' as const,
          data:
            dashboardData?.funnel?.map((f) => ({
              name: f.stage,
              value: f.count,
              amount: f.amount,
            })) ?? [],
          xField: 'name',
          yField: 'value',
          height: 280,
          loading,
        },
        {
          id: 'forecast-line',
          title: t('crm.dashboard.chart_forecast') || '销售预测',
          type: 'line' as const,
          data:
            dashboardData?.forecastSeries?.actual?.map((a, i) => ({
              month: a.month,
              actual: a.value,
              weighted: dashboardData.forecastSeries.weightedPipeline[i]?.value ?? 0,
              target: dashboardData.forecastSeries.target[i]?.value ?? 0,
            })) ?? [],
          xField: 'month',
          yField: 'actual',
          height: 280,
          loading,
        },
        {
          id: 'scoring-donut',
          title: t('crm.dashboard.chart_scoring') || '客户评分分布',
          type: 'pie' as const,
          data: dashboardData?.buckets
            ? ([
                { name: 'A', value: dashboardData.buckets.A },
                { name: 'B', value: dashboardData.buckets.B },
                { name: 'C', value: dashboardData.buckets.C },
                { name: 'D', value: dashboardData.buckets.D },
              ] as Array<Record<string, unknown>>)
            : [],
          xField: 'name',
          yField: 'value',
          height: 280,
          loading,
        },
      ] as unknown as ChartConfig[];
    }
    return chartsFromSchema;
  }, [schema.charts, loading, t, mockEnabled, dashboardData]);

  return (
    <PageContainer
      title={t('crm.dashboard.title')}
      padding={false}
      maxWidth={false}
      autoTitle
      autoBreadcrumbs
      headerActions={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <MockBadge enabled={mockEnabled} />
          <PeriodSelector period={period} onChange={setPeriod} />
        </Box>
      }
    >
      <DashboardTemplate
        title=''
        statCards={statCards}
        charts={charts as any}
        chartCols={3}
        loading={loading}
      />
    </PageContainer>
  );
};

export default CrmDashboardPage;
