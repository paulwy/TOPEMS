import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Target, TrendingUp, Users, DollarSign, Package } from 'lucide-react';
import { DashboardTemplate } from '@/components/templates';
import type {
  StatCardConfig,
  ChartConfig,
  ChartCard,
} from '@/components/templates/DashboardTemplate';
import { PageContainer } from '@/components/common';
import { useTranslation } from 'react-i18next';
import { crmAnalyticsApi, type Period } from '@/api/crm';
import { Box, MenuItem, Select, type SelectChangeEvent } from '@mui/material';
import i18n from '@/i18n';

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
      <MenuItem value='MTD'>
        {t('crm.period.mtd') || i18n.t('pages.crm_dashboard_page.k1')}
      </MenuItem>
      <MenuItem value='QTD'>
        {t('crm.period.qtd') || i18n.t('pages.crm_dashboard_page.k2')}
      </MenuItem>
      <MenuItem value='YTD'>
        {t('crm.period.ytd') || i18n.t('pages.crm_dashboard_page.k3')}
      </MenuItem>
      <MenuItem value='ROLLING_12M'>
        {t('crm.period.r12') || i18n.t('pages.crm_dashboard_page.12_4')}
      </MenuItem>
    </Select>
  );
};

const CrmDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>('MTD');

  // 真实聚合：GET /api/crm/dashboard/overview（meta.mock_enabled 恒 false，不再有本地 mock 兜底）
  const overviewQuery = useQuery({
    queryKey: ['crm-analytics-overview', period],
    queryFn: () => crmAnalyticsApi.getOverview(period),
    staleTime: 5 * 60 * 1000,
  });
  const overview = overviewQuery.data?.data;
  const loading = overviewQuery.isLoading || overviewQuery.isFetching;

  const statCards = useMemo<StatCardConfig[]>(() => {
    const winRate =
      overview && overview.total_opportunities > 0
        ? (overview.won_opportunities / overview.total_opportunities) * 100
        : 0;
    return [
      {
        title: t('crm.dashboard.kpi_customers') || i18n.t('pages.crm_dashboard_page.k5'),
        value: overview?.total_customers ?? 0,
        icon: <Users size={24} />,
        color: 'primary',
        loading,
      },
      {
        title: t('crm.dashboard.kpi_open_opps') || i18n.t('pages.crm_dashboard_page.k6'),
        value: overview?.open_opportunities ?? 0,
        icon: <Target size={24} />,
        color: 'info',
        loading,
      },
      {
        title: t('crm.dashboard.kpi_win_rate') || i18n.t('pages.crm_dashboard_page.k7'),
        value: `${winRate.toFixed(0)}%`,
        icon: <TrendingUp size={24} />,
        color: 'success',
        loading,
      },
      // 后端 overview 无“本月新签金额”字段：诚实显示 ¥0（缺口，待后端补聚合）
      {
        title: t('crm.dashboard.kpi_new_signed') || i18n.t('pages.crm_dashboard_page.k8'),
        value: '¥0',
        icon: <DollarSign size={24} />,
        color: 'warning',
        loading,
      },
      // 后端无独立“活跃联系人”，以活跃客户数替代展示
      {
        title: t('crm.dashboard.kpi_active_contacts') || i18n.t('pages.crm_dashboard_page.k9'),
        value: overview?.active_customers ?? 0,
        icon: <Users size={24} />,
        color: 'secondary',
        loading,
      },
      // 后端 overview 无“待处理退货”字段：诚实显示 0（缺口）
      {
        title: t('crm.dashboard.kpi_pending_returns') || i18n.t('pages.crm_dashboard_page.k10'),
        value: 0,
        icon: <Package size={24} />,
        color: 'error',
        loading,
      },
    ];
  }, [overview, loading, t]);

  const charts = useMemo<ChartConfig[]>(() => {
    const stages = overview?.opportunity_stages ?? [];
    return [
      {
        title: t('crm.dashboard.chart_funnel') || i18n.t('pages.crm_dashboard_page.k11'),
        type: 'bar' as const,
        data: stages.map((s) => ({ name: s.name, value: s.value })),
        xField: 'name',
        yField: 'value',
        height: 280,
        loading,
      },
      // overview 不返回预测/评分分布：空态占位（数据缺口，待后端或前端聚合补）
      {
        title: t('crm.dashboard.chart_forecast') || i18n.t('pages.crm_dashboard_page.k12'),
        type: 'line' as const,
        data: [],
        xField: 'month',
        yField: 'actual',
        height: 280,
        loading,
      },
      {
        title: t('crm.dashboard.chart_scoring') || i18n.t('pages.crm_dashboard_page.k13'),
        type: 'pie' as const,
        data: [],
        xField: 'name',
        yField: 'value',
        height: 280,
        loading,
      },
    ] as ChartConfig[];
  }, [overview, loading, t]);

  return (
    <PageContainer
      title={t('crm.dashboard.title')}
      padding={false}
      maxWidth={false}
      autoTitle
      autoBreadcrumbs
      headerActions={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <PeriodSelector
            period={period}
            onChange={setPeriod}
          />
        </Box>
      }
    >
      <DashboardTemplate
        autoTitle={false}
        title=''
        emptyState={{ show: !loading && !overview }}
        statCards={statCards}
        charts={charts as unknown as ChartCard[]}
        chartCols={3}
        loading={loading}
      />
    </PageContainer>
  );
};

export default CrmDashboardPage;
