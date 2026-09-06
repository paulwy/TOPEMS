import { financeApi } from '@/api/finance';
import type { FinanceDashboardStats } from '@/api/finance';
import type { DashboardSchema, StatCardSchema, ChartSchema } from '@/schema';
import { useTranslation } from 'react-i18next';

let financeStats: FinanceDashboardStats | undefined;

export function useFinanceDashboardSchema(): DashboardSchema {
  const { t } = useTranslation();

  const statCards: StatCardSchema[] = [
    {
      id: 'voucher-total',
      title: t('finance.finance_dashboard_page.text_551f4c'),
      value: () => {
        const stats = financeStats;
        return stats?.total_vouchers.toLocaleString() ?? '-';
      },
      icon: 'FileText',
      color: 'primary',
      trend: { value: 0, label: t('finance.finance_dashboard_page.last_month') },
    },
    {
      id: 'voucher-draft',
      title: t('finance.finance_dashboard_page.text_5c5e91'),
      value: () => {
        const stats = financeStats;
        return stats?.draft_vouchers.toLocaleString() ?? '-';
      },
      icon: 'FileText',
      color: 'info',
      trend: { value: 0, label: t('finance.finance_dashboard_page.last_month') },
    },
    {
      id: 'receivable',
      title: t('finance.finance_dashboard_page.text_c29613'),
      value: () => {
        const stats = financeStats;
        return stats ? `¥${stats.total_receivables.toLocaleString()}` : '-';
      },
      icon: 'TrendingUp',
      color: 'success',
      trend: { value: 0, label: t('finance.finance_dashboard_page.last_month') },
    },
    {
      id: 'payable',
      title: t('finance.finance_dashboard_page.text_55c9eb'),
      value: () => {
        const stats = financeStats;
        return stats ? `¥${stats.total_payables.toLocaleString()}` : '-';
      },
      icon: 'TrendingDown',
      color: 'warning',
      trend: { value: 0, label: t('finance.finance_dashboard_page.last_month') },
    },
    {
      id: 'pending-approvals',
      title: t('finance.finance_dashboard_page.text_b0bf01'),
      value: () => {
        const stats = financeStats;
        return stats?.pending_approvals.toLocaleString() ?? '-';
      },
      icon: 'DollarSign',
      color: 'success',
      trend: { value: 0, label: t('finance.finance_dashboard_page.last_month') },
    },
    {
      id: 'pending-payments',
      title: t('finance.finance_dashboard_page.text_9246fe'),
      value: () => {
        const stats = financeStats;
        return stats?.pending_payments.toLocaleString() ?? '-';
      },
      icon: 'BarChart3',
      color: 'primary',
      trend: { value: 0, label: t('finance.finance_dashboard_page.last_month') },
    },
  ];

  const charts: ChartSchema[] = [
    {
      id: 'voucher-trend',
      title: t('finance.finance_dashboard_page.status'),
      type: 'bar',
      data: () => {
        const stats = financeStats;
        if (!stats) return [];
        return [
          { name: t('finance.finance_dashboard_page.text_22b433'), value: stats.draft_vouchers },
          { name: t('finance.finance_dashboard_page.submit'), value: stats.submitted_vouchers },
          { name: t('finance.finance_dashboard_page.text_618acb'), value: stats.approved_vouchers },
          { name: t('finance.finance_dashboard_page.text_aaea67'), value: stats.posted_vouchers },
        ];
      },
      height: 300,
    },
    {
      id: 'receivable-payable',
      title: t('finance.finance_dashboard_page.text_b1b956'),
      type: 'line',
      data: () => {
        const stats = financeStats;
        if (!stats) return [];
        return [
          { name: t('finance.finance_dashboard_page.text_fccab9'), value: stats.total_receivables },
          {
            name: t('finance.finance_dashboard_page.text_19a5b0'),
            value: stats.overdue_receivables,
          },
          { name: t('finance.finance_dashboard_page.text_855bfd'), value: stats.total_payables },
          { name: t('finance.finance_dashboard_page.text_4f9d0d'), value: stats.overdue_payables },
        ];
      },
      height: 300,
    },
    {
      id: 'expense-category',
      title: t('finance.finance_dashboard_page.text_039481'),
      type: 'pie',
      data: () => {
        const stats = financeStats;
        if (!stats) return [];
        return [
          { name: t('finance.finance_dashboard_page.text_b0bf01'), value: stats.pending_approvals },
          { name: t('finance.finance_dashboard_page.text_9246fe'), value: stats.pending_payments },
          { name: t('finance.finance_dashboard_page.text_94171c'), value: stats.total_vouchers },
          { name: t('finance.finance_dashboard_page.text_474cd0'), value: stats.total_payments },
        ];
      },
      height: 300,
    },
  ];

  return {
    title: t('finance.finance_dashboard_page.text_ea1f99'),
    loader: async () => {
      const response = await financeApi.getDashboard();
      if (response.success && response.data) {
        financeStats = response.data;
      }
      return { statCards: undefined, charts: undefined, table: undefined };
    },
    statCards,
    charts,
  };
}
