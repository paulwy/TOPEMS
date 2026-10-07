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
      title: t('finance.finance_dashboard_page.stat_total_vouchers'),
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
      title: t('finance.finance_dashboard_page.stat_draft_vouchers'),
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
      title: t('finance.finance_dashboard_page.stat_total_receivables'),
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
      title: t('finance.finance_dashboard_page.stat_total_payables'),
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
      title: t('finance.finance_dashboard_page.stat_pending_approvals'),
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
      title: t('finance.finance_dashboard_page.stat_pending_payments'),
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
          {
            name: t('finance.finance_dashboard_page.series_draft_vouchers'),
            value: stats.draft_vouchers,
          },
          { name: t('finance.finance_dashboard_page.submit'), value: stats.submitted_vouchers },
          {
            name: t('finance.finance_dashboard_page.series_approved_vouchers'),
            value: stats.approved_vouchers,
          },
          {
            name: t('finance.finance_dashboard_page.series_posted_vouchers'),
            value: stats.posted_vouchers,
          },
        ];
      },
      height: 300,
    },
    {
      id: 'receivable-payable',
      title: t('finance.finance_dashboard_page.chart_receivable_payable_trend'),
      type: 'line',
      data: () => {
        const stats = financeStats;
        if (!stats) return [];
        return [
          {
            name: t('finance.finance_dashboard_page.series_total_receivables'),
            value: stats.total_receivables,
          },
          {
            name: t('finance.finance_dashboard_page.series_overdue_receivables'),
            value: stats.overdue_receivables,
          },
          {
            name: t('finance.finance_dashboard_page.series_total_payables'),
            value: stats.total_payables,
          },
          {
            name: t('finance.finance_dashboard_page.series_overdue_payables'),
            value: stats.overdue_payables,
          },
        ];
      },
      height: 300,
    },
    {
      id: 'expense-category',
      title: t('finance.finance_dashboard_page.chart_status_distribution'),
      type: 'pie',
      data: () => {
        const stats = financeStats;
        if (!stats) return [];
        return [
          {
            name: t('finance.finance_dashboard_page.stat_pending_approvals'),
            value: stats.pending_approvals,
          },
          {
            name: t('finance.finance_dashboard_page.stat_pending_payments'),
            value: stats.pending_payments,
          },
          {
            name: t('finance.finance_dashboard_page.pie_total_vouchers'),
            value: stats.total_vouchers,
          },
          {
            name: t('finance.finance_dashboard_page.pie_total_payments'),
            value: stats.total_payments,
          },
        ];
      },
      height: 300,
    },
  ];

  return {
    title: t('finance.finance_dashboard_page.page_title'),
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
