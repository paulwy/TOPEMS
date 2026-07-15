import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { designTokens } from '@/theme/tokens';
import { useNavigate } from 'react-router-dom';
import { FINANCE_PATHS } from '@/modules/finance/config';
import { financeApi } from '@/api/finance';
import type { FinanceDashboardStats } from '@/api/finance';
import {
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  CreditCard,
  Wallet,
  Receipt,
  Plus,
  BookOpen,
  ClipboardList,
  Target,
} from 'lucide-react';
import { DashboardTemplate } from '@/components/templates';
import type { StatCard, ChartCard, QuickAction, RecentItem } from '@/components/templates';
import { PageContainer } from '@/components/common/PageContainerV2';
import BarChartComponent from '../../components/charts/BarChart';
import LineChartComponent from '../../components/charts/LineChart';
import PieChartComponent from '../../components/charts/PieChart';

const ct = designTokens.colors;

const FinanceDashboardPage: React.FC = () => {
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

  const stats: StatCard[] = useMemo(() => {
    if (!statsData) return [];
    return [
      {
        id: 'voucher-total',
        title: '凭证总数',
        value: statsData.total_vouchers.toLocaleString(),
        icon: <FileText size={24} />,
        change: 0,
        changeLabel: '较上月',
        color: 'primary',
      },
      {
        id: 'voucher-draft',
        title: '草稿凭证',
        value: statsData.draft_vouchers.toLocaleString(),
        icon: <FileText size={24} />,
        change: 0,
        changeLabel: '较上月',
        color: 'info',
      },
      {
        id: 'receivable',
        title: '应收余额',
        value: `¥${statsData.total_receivables.toLocaleString()}`,
        icon: <TrendingUp size={24} />,
        change: 0,
        changeLabel: '较上月',
        color: 'success',
      },
      {
        id: 'payable',
        title: '应付余额',
        value: `¥${statsData.total_payables.toLocaleString()}`,
        icon: <TrendingDown size={24} />,
        change: 0,
        changeLabel: '较上月',
        color: 'warning',
      },
      {
        id: 'pending-approvals',
        title: '待审批',
        value: statsData.pending_approvals.toLocaleString(),
        icon: <DollarSign size={24} />,
        change: 0,
        changeLabel: '较上月',
        color: 'success',
      },
      {
        id: 'pending-payments',
        title: '待支付',
        value: statsData.pending_payments.toLocaleString(),
        icon: <BarChart3 size={24} />,
        change: 0,
        changeLabel: '较上月',
        color: 'primary',
      },
    ];
  }, [statsData]);

  const charts: ChartCard[] = useMemo(() => {
    if (!statsData) return [];
    const voucherTrendData = [
      { name: '草稿', value: statsData.draft_vouchers },
      { name: '已提交', value: statsData.submitted_vouchers },
      { name: '已审批', value: statsData.approved_vouchers },
      { name: '已过账', value: statsData.posted_vouchers },
    ];
    const receivablePayableData = [
      { name: '应收', value: statsData.total_receivables },
      { name: '逾期应收', value: statsData.overdue_receivables },
      { name: '应付', value: statsData.total_payables },
      { name: '逾期应付', value: statsData.overdue_payables },
    ];
    const expenseCategoryData = [
      { name: '待审批', value: statsData.pending_approvals },
      { name: '待支付', value: statsData.pending_payments },
      { name: '凭证', value: statsData.total_vouchers },
      { name: '付款', value: statsData.total_payments },
    ];
    return [
      {
        id: 'voucher-trend',
        title: '凭证状态分布',
        chart: (
          <BarChartComponent
            data={voucherTrendData}
            xKey='name'
            yKey='value'
          />
        ),
        height: 300,
      },
      {
        id: 'receivable-payable',
        title: '应收应付对比',
        chart: (
          <LineChartComponent
            data={receivablePayableData}
            xKey='name'
            yKey='value'
          />
        ),
        height: 300,
      },
      {
        id: 'expense-category',
        title: '业务概览',
        chart: <PieChartComponent data={expenseCategoryData} />,
        height: 300,
      },
    ];
  }, [statsData]);

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: 'voucher-manage',
        label: '凭证管理',
        icon: <FileText size={20} />,
        onClick: () => navigate(FINANCE_PATHS.vouchers),
        color: ct.primary.dark,
      },
      {
        id: 'ledger-manage',
        label: '总账管理',
        icon: <BookOpen size={20} />,
        onClick: () => navigate(FINANCE_PATHS.ledger),
        color: ct.purple[700],
      },
      {
        id: 'receivable-manage',
        label: '应收管理',
        icon: <TrendingUp size={20} />,
        onClick: () => navigate(FINANCE_PATHS.receivablePayable),
        color: ct.success[700],
      },
      {
        id: 'payable-manage',
        label: '应付管理',
        icon: <TrendingDown size={20} />,
        onClick: () => navigate(FINANCE_PATHS.receivablePayable),
        color: ct.orange[600],
      },
      {
        id: 'report',
        label: '报表',
        icon: <BarChart3 size={20} />,
        onClick: () => navigate(FINANCE_PATHS.reports),
        color: ct.teal[700],
      },
      {
        id: 'budget-manage',
        label: '预算管理',
        icon: <Target size={20} />,
        onClick: () => navigate(FINANCE_PATHS.budget),
        color: ct.error[700],
      },
    ],
    [navigate]
  );

  const recentItems: RecentItem[] = [];

  return (
    <PageContainer
      title='财务仪表盘'
      padding={false}
      maxWidth={false}
      autoTitle
      autoBreadcrumbs
    >
      <DashboardTemplate
        title=''
        stats={stats}
        charts={charts}
        recentItems={recentItems}
        recentTitle='最近记录'
        quickActions={quickActions}
        quickActionsTitle='快捷操作'
        loading={loading}
      />
    </PageContainer>
  );
};

export default FinanceDashboardPage;
