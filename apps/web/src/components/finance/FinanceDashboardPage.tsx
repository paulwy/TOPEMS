import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FINANCE_PATHS } from '@/module-configs/finance/paths';
import { financeApi } from '@/api/finance';
import type { FinanceDashboardStats } from '@/api/finance';
import {
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  BookOpen,
  Target,
} from 'lucide-react';
import { DashboardTemplate } from '@/components/templates';
import type {
  StatCardConfig,
  ChartConfig,
  ChartCard,
  RecentItem,
  QuickAction,
} from '@/components/templates/DashboardTemplate';
import { PageContainer } from '@/components/common';
import { useTranslation } from 'react-i18next';

import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';
import { useTheme } from '@mui/material';

const FinanceDashboardPage: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: statsData, isPending: loading } = useQuery<FinanceDashboardStats | null>({
    queryKey: QUERY_KEYS.AD_HOC.FINANCE_DASHBOARD_BASE,
    queryFn: async () => {
      const response = await financeApi.getDashboard();
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const statCards = useMemo<StatCardConfig[]>(() => {
    if (!statsData) return [];
    return [
      {
        title: t('finance.finance_dashboard_page.stat_total_vouchers'),
        value: statsData.total_vouchers.toLocaleString(),
        icon: <FileText size={24} />,
        color: 'primary' as const,
        trend: { value: 0, label: t('finance.finance_dashboard_page.last_month') },
        loading,
      },
      {
        title: t('finance.finance_dashboard_page.stat_draft_vouchers'),
        value: statsData.draft_vouchers.toLocaleString(),
        icon: <FileText size={24} />,
        color: 'info' as const,
        trend: { value: 0, label: t('finance.finance_dashboard_page.last_month') },
        loading,
      },
      {
        title: t('finance.finance_dashboard_page.stat_total_receivables'),
        value: `¥${statsData.total_receivables.toLocaleString()}`,
        icon: <TrendingUp size={24} />,
        color: 'success' as const,
        trend: { value: 0, label: t('finance.finance_dashboard_page.last_month') },
        loading,
      },
      {
        title: t('finance.finance_dashboard_page.stat_total_payables'),
        value: `¥${statsData.total_payables.toLocaleString()}`,
        icon: <TrendingDown size={24} />,
        color: 'warning' as const,
        trend: { value: 0, label: t('finance.finance_dashboard_page.last_month') },
        loading,
      },
      {
        title: t('finance.finance_dashboard_page.stat_pending_approvals'),
        value: statsData.pending_approvals.toLocaleString(),
        icon: <DollarSign size={24} />,
        color: 'success' as const,
        trend: { value: 0, label: t('finance.finance_dashboard_page.last_month') },
        loading,
      },
      {
        title: t('finance.finance_dashboard_page.stat_pending_payments'),
        value: statsData.pending_payments.toLocaleString(),
        icon: <BarChart3 size={24} />,
        color: 'primary' as const,
        trend: { value: 0, label: t('finance.finance_dashboard_page.last_month') },
        loading,
      },
    ];
  }, [statsData, loading, t]);

  const chartConfigs = useMemo<ChartConfig[]>(() => {
    if (!statsData) return [];
    return [
      {
        title: t('finance.finance_dashboard_page.status'),
        type: 'bar' as const,
        data: [
          {
            name: t('finance.finance_dashboard_page.series_draft_vouchers'),
            value: statsData.draft_vouchers,
          },
          { name: t('finance.finance_dashboard_page.submit'), value: statsData.submitted_vouchers },
          {
            name: t('finance.finance_dashboard_page.series_approved_vouchers'),
            value: statsData.approved_vouchers,
          },
          {
            name: t('finance.finance_dashboard_page.series_posted_vouchers'),
            value: statsData.posted_vouchers,
          },
        ],
        xField: 'name',
        yField: 'value',
        height: 300,
        loading,
      },
      {
        title: t('finance.finance_dashboard_page.chart_receivable_payable_trend'),
        type: 'line' as const,
        data: [
          {
            name: t('finance.finance_dashboard_page.series_total_receivables'),
            value: statsData.total_receivables,
          },
          {
            name: t('finance.finance_dashboard_page.series_overdue_receivables'),
            value: statsData.overdue_receivables,
          },
          {
            name: t('finance.finance_dashboard_page.series_total_payables'),
            value: statsData.total_payables,
          },
          {
            name: t('finance.finance_dashboard_page.series_overdue_payables'),
            value: statsData.overdue_payables,
          },
        ],
        xField: 'name',
        yField: 'value',
        height: 300,
        loading,
      },
      {
        title: t('finance.finance_dashboard_page.chart_status_distribution'),
        type: 'pie' as const,
        data: [
          {
            name: t('finance.finance_dashboard_page.stat_pending_approvals'),
            value: statsData.pending_approvals,
          },
          {
            name: t('finance.finance_dashboard_page.stat_pending_payments'),
            value: statsData.pending_payments,
          },
          {
            name: t('finance.finance_dashboard_page.pie_total_vouchers'),
            value: statsData.total_vouchers,
          },
          {
            name: t('finance.finance_dashboard_page.pie_total_payments'),
            value: statsData.total_payments,
          },
        ],
        xField: 'name',
        yField: 'value',
        height: 300,
        loading,
      },
    ];
  }, [statsData, loading, t]);

  const quickActions = useMemo(
    () => [
      {
        id: 'voucher-manage',
        label: i18n.t('finance.finance_dashboard_page.nav_vouchers'),
        icon: <FileText size={20} />,
        onClick: () => navigate(FINANCE_PATHS.vouchers),
        color: theme.palette.primary.dark,
      },
      {
        id: 'ledger-manage',
        label: i18n.t('finance.finance_dashboard_page.nav_ledger'),
        icon: <BookOpen size={20} />,
        onClick: () => navigate(FINANCE_PATHS.ledger),
        color: theme.palette.purple[700],
      },
      {
        id: 'receivable-manage',
        label: i18n.t('finance.finance_dashboard_page.nav_receivable'),
        icon: <TrendingUp size={20} />,
        onClick: () => navigate(FINANCE_PATHS.receivablePayable),
        color: theme.palette.success[700],
      },
      {
        id: 'payable-manage',
        label: i18n.t('finance.finance_dashboard_page.nav_payable'),
        icon: <TrendingDown size={20} />,
        onClick: () => navigate(FINANCE_PATHS.receivablePayable),
        color: theme.palette.orange[600],
      },
      {
        id: 'report',
        label: i18n.t('finance.finance_dashboard_page.nav_reports'),
        icon: <BarChart3 size={20} />,
        onClick: () => navigate(FINANCE_PATHS.reports),
        color: theme.palette.teal[700],
      },
      {
        id: 'budget-manage',
        label: i18n.t('finance.finance_dashboard_page.nav_budget'),
        icon: <Target size={20} />,
        onClick: () => navigate(FINANCE_PATHS.budget),
        color: theme.palette.error[700],
      },
    ],
    [navigate]
  );

  const recentItems: Array<{ id: string; title: string }> = [];

  return (
    <PageContainer
      title={t('finance.finance_dashboard_page.page_title')}
      padding={false}
      maxWidth={false}
      autoTitle
      autoBreadcrumbs
    >
      <DashboardTemplate
        title=''
        autoTitle={false}
        emptyState={{ show: !loading && !statsData }}
        statCards={statCards}
        charts={chartConfigs as unknown as ChartCard[]}
        recentItems={recentItems as unknown as RecentItem[]}
        recentTitle={t('finance.finance_dashboard_page.recent_title')}
        quickActions={quickActions as unknown as QuickAction[]}
        quickActionsTitle={t('finance.finance_dashboard_page.action')}
        loading={loading}
      />
    </PageContainer>
  );
};

export default FinanceDashboardPage;
