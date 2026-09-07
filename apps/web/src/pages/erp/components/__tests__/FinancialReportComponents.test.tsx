import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/__tests__/test-utils';

import { FinancialReportFilters } from '../FinancialReportFilters';
import { FinancialReportSummaryCards } from '../FinancialReportSummaryCards';
import { FinancialReportTables } from '../FinancialReportTables';
import type { BalanceSheet, CashFlowStatement, IncomeStatement } from '@/api/erp/types';
import type { PeriodOption, TabConfig } from '../../hooks/useFinancialReport';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('lucide-react', async () => {
  const actual = await vi.importActual<typeof import('lucide-react')>('lucide-react');
  return {
    ...actual,
    Activity: () => <svg data-testid='icon-activity' />,
    BarChart3: () => <svg data-testid='icon-bar-chart' />,
    Building2: () => <svg data-testid='icon-building' />,
    DollarSign: () => <svg data-testid='icon-dollar' />,
    FileText: (props: React.SVGProps<SVGSVGElement>) => (
      <svg
        data-testid='icon-file-text'
        {...props}
      />
    ),
    PieChart: () => <svg data-testid='icon-pie-chart' />,
    TrendingDown: () => <svg data-testid='icon-trending-down' />,
    TrendingUp: () => <svg data-testid='icon-trending-up' />,
    Wallet: () => <svg data-testid='icon-wallet' />,
  };
});

const formatCurrency = (amount: number) => `¥${amount.toLocaleString('zh-CN')}`;

const tabs: TabConfig[] = [
  { value: 'balance-sheet', label: '资产负债表' },
  { value: 'income-statement', label: '利润表' },
  { value: 'cash-flow', label: '现金流量表' },
  { value: 'equity-change', label: '权益变动表' },
];

const periodOptions: PeriodOption[] = [
  { value: '2026', label: '2026 年' },
  { value: '2026-Q2', label: '2026 Q2' },
  { value: '2026-08', label: '2026-08' },
];

const balanceSheet: BalanceSheet = {
  period: '2026-08',
  assets: [
    { code: '1001', name: '货币资金', amount: 1200000, percentage: 40 },
    { code: '1122', name: '应收账款', amount: 800000, percentage: 26.67 },
  ],
  liabilities: [{ code: '2202', name: '应付账款', amount: 600000, percentage: 20 }],
  equity: [{ code: '4001', name: '实收资本', amount: 1400000, percentage: 46.67 }],
  total_assets: 3000000,
  total_liabilities: 900000,
  total_equity: 2100000,
};

const incomeStatement: IncomeStatement = {
  period: '2026-08',
  revenues: [
    { account_code: '6001', account_name: '主营业务收入', amount: 1800000 },
    { account_code: '6051', account_name: '其他业务收入', amount: 200000 },
  ],
  expenses: [
    { account_code: '6401', account_name: '主营业务成本', amount: 900000 },
    { account_code: '6602', account_name: '管理费用', amount: 300000 },
  ],
  total_revenue: 2000000,
  total_expense: 1200000,
  net_income: 800000,
};

const cashFlowStatement: CashFlowStatement = {
  period: '2026-08',
  items: [
    { item_code: 'C01', item_name: '销售收现', item_type: 'inflow', amount: 1500000, children: [] },
    {
      item_code: 'C11',
      item_name: '购建固定资产',
      item_type: 'outflow',
      amount: -350000,
      children: [],
    },
    { item_code: 'C21', item_name: '取得借款', item_type: 'inflow', amount: 500000, children: [] },
  ],
  total_inflow: 2000000,
  total_outflow: 350000,
  net_change: 1650000,
  opening_balance: 575000,
  closing_balance: 2225000,
};

describe('ERP 财务报表拆分组件渲染测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('筛选器渲染报表 Tab 和期间下拉，并触发回调', () => {
    const onTabChange = vi.fn();
    const onPeriodTypeChange = vi.fn();
    const onPeriodChange = vi.fn();

    renderWithProviders(
      <FinancialReportFilters
        activeTab='balance-sheet'
        onTabChange={onTabChange}
        periodType='year'
        onPeriodTypeChange={onPeriodTypeChange}
        period='2026'
        onPeriodChange={onPeriodChange}
        periodOptions={periodOptions}
        tabs={tabs}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: '利润表' }));
    expect(onTabChange).toHaveBeenCalledWith('income-statement');

    fireEvent.mouseDown(screen.getAllByRole('combobox')[0]);
    fireEvent.click(screen.getByRole('option', { name: '季度' }));
    expect(onPeriodTypeChange).toHaveBeenCalledWith('quarter');

    fireEvent.mouseDown(screen.getAllByRole('combobox')[1]);
    fireEvent.click(screen.getByRole('option', { name: '2026 Q2' }));
    expect(onPeriodChange).toHaveBeenCalledWith('2026-Q2');
  });
});
