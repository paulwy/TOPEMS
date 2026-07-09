import React, { useState, useEffect, useMemo } from 'react';
import { designTokens } from '@/theme/tokens';
import { useNavigate } from 'react-router-dom';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'voucher-total',
        title: '凭证总数',
        value: '3,256',
        icon: <FileText size={24} />,
        change: 12.5,
        changeLabel: '较上月',
        color: 'primary',
      },
      {
        id: 'voucher-month',
        title: '本月凭证',
        value: '186',
        icon: <FileText size={24} />,
        change: 8.3,
        changeLabel: '较上月',
        color: 'info',
      },
      {
        id: 'receivable',
        title: '应收余额',
        value: '¥2,345,678',
        icon: <TrendingUp size={24} />,
        change: -5.2,
        changeLabel: '较上月',
        color: 'success',
      },
      {
        id: 'payable',
        title: '应付余额',
        value: '¥1,876,543',
        icon: <TrendingDown size={24} />,
        change: 3.8,
        changeLabel: '较上月',
        color: 'warning',
      },
      {
        id: 'total-assets',
        title: '总资产',
        value: '¥12,580,000',
        icon: <DollarSign size={24} />,
        change: 8.5,
        changeLabel: '较上月',
        color: 'success',
      },
      {
        id: 'net-profit',
        title: '净利润',
        value: '¥1,358,024',
        icon: <BarChart3 size={24} />,
        change: 15.8,
        changeLabel: '较上月',
        color: 'primary',
      },
    ],
    []
  );

  const voucherTrendData = [
    { name: '1月', value: 120 },
    { name: '2月', value: 98 },
    { name: '3月', value: 156 },
    { name: '4月', value: 132 },
    { name: '5月', value: 178 },
    { name: '6月', value: 186 },
  ];

  const receivablePayableData = [
    { name: '1月', value: 2100000 },
    { name: '2月', value: 1950000 },
    { name: '3月', value: 2400000 },
    { name: '4月', value: 2250000 },
    { name: '5月', value: 2500000 },
    { name: '6月', value: 2345678 },
  ];

  const expenseCategoryData = [
    { name: '人力成本', value: 45 },
    { name: '原材料', value: 25 },
    { name: '运营费用', value: 15 },
    { name: '管理费用', value: 10 },
    { name: '其他', value: 5 },
  ];

  const charts: ChartCard[] = useMemo(
    () => [
      {
        id: 'voucher-trend',
        title: '月度凭证趋势',
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
        title: '费用类别分布',
        chart: <PieChartComponent data={expenseCategoryData} />,
        height: 300,
      },
    ],
    []
  );

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: 'voucher-manage',
        label: '凭证管理',
        icon: <FileText size={20} />,
        onClick: () => navigate('/finance/voucher'),
        color: ct.primary.dark,
      },
      {
        id: 'ledger-manage',
        label: '总账管理',
        icon: <BookOpen size={20} />,
        onClick: () => navigate('/finance/ledger'),
        color: ct.purple[700],
      },
      {
        id: 'receivable-manage',
        label: '应收管理',
        icon: <TrendingUp size={20} />,
        onClick: () => navigate('/finance/receivable'),
        color: ct.success[700],
      },
      {
        id: 'payable-manage',
        label: '应付管理',
        icon: <TrendingDown size={20} />,
        onClick: () => navigate('/finance/payable'),
        color: ct.orange[600],
      },
      {
        id: 'report',
        label: '报表',
        icon: <BarChart3 size={20} />,
        onClick: () => navigate('/finance/reports'),
        color: ct.teal[700],
      },
      {
        id: 'budget-manage',
        label: '预算管理',
        icon: <Target size={20} />,
        onClick: () => navigate('/finance/budget'),
        color: ct.error[700],
      },
    ],
    [navigate]
  );

  const recentItems: RecentItem[] = useMemo(
    () => [
      {
        id: 'v1',
        title: '记-2026-0086',
        description: '支付办公设备采购款',
        time: '2026-06-29 09:30',
        icon: <FileText size={18} />,
        status: 'success',
        onClick: () => navigate('/finance/voucher/v1'),
      },
      {
        id: 'v2',
        title: '记-2026-0085',
        description: '收到客户A月度结算款',
        time: '2026-06-29 08:15',
        icon: <Receipt size={18} />,
        status: 'success',
        onClick: () => navigate('/finance/voucher/v2'),
      },
      {
        id: 'inv1',
        title: 'INV-2026-0042',
        description: '销售发票 - 客户B',
        time: '2026-06-28 16:45',
        icon: <Receipt size={18} />,
        status: 'info',
        onClick: () => navigate('/finance/invoices/inv1'),
      },
      {
        id: 'pay1',
        title: 'PAY-2026-0018',
        description: '供应商C原材料付款',
        time: '2026-06-28 14:20',
        icon: <Wallet size={18} />,
        status: 'warning',
        onClick: () => navigate('/finance/payments/pay1'),
      },
      {
        id: 'v3',
        title: '记-2026-0084',
        description: '员工工资发放',
        time: '2026-06-28 10:00',
        icon: <CreditCard size={18} />,
        status: 'default',
        onClick: () => navigate('/finance/voucher/v3'),
      },
    ],
    [navigate]
  );

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
