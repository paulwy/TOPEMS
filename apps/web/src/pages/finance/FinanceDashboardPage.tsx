import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { designTokens } from '@/theme/tokens';
import { useNavigate } from 'react-router-dom';
import { FINANCE_PATHS } from '@/modules/finance/paths';
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
import type { StatCardConfig, ChartConfig } from '@/components/templates/DashboardTemplate';
import { PageContainer } from '@/components/common';
import { useTranslation } from 'react-i18next';

const ct = designTokens.colors;

const FinanceDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: statsData, isLoading: loading } = useQuery<FinanceDashboardStats | null>({
    queryKey: ['finance-dashboard'],
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
        title: t('finance.finance_dashboard_page.text_551f4c'),
        value: statsData.total_vouchers.toLocaleString(),
        icon: <FileText size={24} />,
        color: 'primary' as const,
        trend: { value: 0, label: t('finance.finance_dashboard_page.last_month') },
        loading,
      },
      {
        title: t('finance.finance_dashboard_page.text_5c5e91'),
        value: statsData.draft_vouchers.toLocaleString(),
        icon: <FileText size={24} />,
        color: 'info' as const,
        trend: { value: 0, label: t('finance.finance_dashboard_page.last_month') },
        loading,
      },
      {
        title: t('finance.finance_dashboard_page.text_c29613'),
        value: `¥${statsData.total_receivables.toLocaleString()}`,
        icon: <TrendingUp size={24} />,
        color: 'success' as const,
        trend: { value: 0, label: t('finance.finance_dashboard_page.last_month') },
        loading,
      },
      {
        title: t('finance.finance_dashboard_page.text_55c9eb'),
        value: `¥${statsData.total_payables.toLocaleString()}`,
        icon: <TrendingDown size={24} />,
        color: 'warning' as const,
        trend: { value: 0, label: t('finance.finance_dashboard_page.last_month') },
        loading,
      },
      {
        title: t('finance.finance_dashboard_page.text_b0bf01'),
        value: statsData.pending_approvals.toLocaleString(),
        icon: <DollarSign size={24} />,
        color: 'success' as const,
        trend: { value: 0, label: t('finance.finance_dashboard_page.last_month') },
        loading,
      },
      {
        title: t('finance.finance_dashboard_page.text_9246fe'),
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
            name: t('finance.finance_dashboard_page.text_22b433'),
            value: statsData.draft_vouchers,
          },
          { name: t('finance.finance_dashboard_page.submit'), value: statsData.submitted_vouchers },
          {
            name: t('finance.finance_dashboard_page.text_618acb'),
            value: statsData.approved_vouchers,
          },
          {
            name: t('finance.finance_dashboard_page.text_aaea67'),
            value: statsData.posted_vouchers,
          },
        ],
        xField: 'name',
        yField: 'value',
        height: 300,
        loading,
      },
      {
        title: t('finance.finance_dashboard_page.text_b1b956'),
        type: 'line' as const,
        data: [
          {
            name: t('finance.finance_dashboard_page.text_fccab9'),
            value: statsData.total_receivables,
          },
          {
            name: t('finance.finance_dashboard_page.text_19a5b0'),
            value: statsData.overdue_receivables,
          },
          {
            name: t('finance.finance_dashboard_page.text_855bfd'),
            value: statsData.total_payables,
          },
          {
            name: t('finance.finance_dashboard_page.text_4f9d0d'),
            value: statsData.overdue_payables,
          },
        ],
        xField: 'name',
        yField: 'value',
        height: 300,
        loading,
      },
      {
        title: t('finance.finance_dashboard_page.text_039481'),
        type: 'pie' as const,
        data: [
          {
            name: t('finance.finance_dashboard_page.text_b0bf01'),
            value: statsData.pending_approvals,
          },
          {
            name: t('finance.finance_dashboard_page.text_9246fe'),
            value: statsData.pending_payments,
          },
          {
            name: t('finance.finance_dashboard_page.text_94171c'),
            value: statsData.total_vouchers,
          },
          {
            name: t('finance.finance_dashboard_page.text_474cd0'),
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
        label: t('finance.finance_dashboard_page.text_161d77'),
        icon: <FileText size={20} />,
        onClick: () => navigate(FINANCE_PATHS.vouchers),
        color: ct.primary.dark,
      },
      {
        id: 'ledger-manage',
        label: t('finance.finance_dashboard_page.text_3c213e'),
        icon: <BookOpen size={20} />,
        onClick: () => navigate(FINANCE_PATHS.ledger),
        color: ct.purple[700],
      },
      {
        id: 'receivable-manage',
        label: t('finance.finance_dashboard_page.text_96b3e0'),
        icon: <TrendingUp size={20} />,
        onClick: () => navigate(FINANCE_PATHS.receivablePayable),
        color: ct.success[700],
      },
      {
        id: 'payable-manage',
        label: t('finance.finance_dashboard_page.text_171e25'),
        icon: <TrendingDown size={20} />,
        onClick: () => navigate(FINANCE_PATHS.receivablePayable),
        color: ct.orange[600],
      },
      {
        id: 'report',
        label: t('finance.finance_dashboard_page.text_fc00f3'),
        icon: <BarChart3 size={20} />,
        onClick: () => navigate(FINANCE_PATHS.reports),
        color: ct.teal[700],
      },
      {
        id: 'budget-manage',
        label: t('finance.finance_dashboard_page.text_a6b2fe'),
        icon: <Target size={20} />,
        onClick: () => navigate(FINANCE_PATHS.budget),
        color: ct.error[700],
      },
    ],
    [navigate]
  );

  const recentItems: Array<{ id: string; title: string }> = [];

  return (
    <PageContainer
      title={t('finance.finance_dashboard_page.text_ea1f99')}
      padding={false}
      maxWidth={false}
      autoTitle
      autoBreadcrumbs
    >
      <DashboardTemplate
        title=''
        statCards={statCards}
        charts={chartConfigs as any}
        recentItems={recentItems as any}
        recentTitle={t('finance.finance_dashboard_page.text_b66b2e')}
        quickActions={quickActions as any}
        quickActionsTitle={t('finance.finance_dashboard_page.action')}
        loading={loading}
      />
    </PageContainer>
  );
};

export default FinanceDashboardPage;
