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
    { code: '6001', name: '主营业务收入', amount: 1800000, percentage: 100 },
    { code: '6051', name: '其他业务收入', amount: 200000, percentage: 11.11 },
  ],
  expenses: [
    { code: '6401', name: '主营业务成本', amount: 900000, percentage: 50 },
    { code: '6602', name: '管理费用', amount: 300000, percentage: 16.67 },
  ],
  total_revenue: 2000000,
  total_cost: 1200000,
  gross_profit: 1100000,
  operating_profit: 800000,
  net_profit: 650000,
};

const cashFlowStatement: CashFlowStatement = {
  period: '2026-08',
  operating_activities: [{ code: 'C01', name: '销售收现', amount: 1500000 }],
  investing_activities: [{ code: 'C11', name: '购建固定资产', amount: -350000 }],
  financing_activities: [{ code: 'C21', name: '取得借款', amount: 500000 }],
  operating_cash_flow: 1500000,
  investing_cash_flow: -350000,
  financing_cash_flow: 500000,
  net_cash_flow: 1650000,
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
    fireEvent.click(screen.getByRole('option', { name: 'erp.financial_report.label.quarter' }));
    expect(onPeriodTypeChange).toHaveBeenCalledWith('quarter');

    fireEvent.mouseDown(screen.getAllByRole('combobox')[1]);
    fireEvent.click(screen.getByRole('option', { name: '2026 Q2' }));
    expect(onPeriodChange).toHaveBeenCalledWith('2026-Q2');
  });

  it('汇总卡片渲染资产负债表核心指标', () => {
    renderWithProviders(
      <FinancialReportSummaryCards
        activeTab='balance-sheet'
        balanceSheet={balanceSheet}
        incomeStatement={null}
        cashFlowStatement={null}
        formatCurrency={formatCurrency}
      />
    );

    expect(screen.getByText('erp.financial_report.label.total_assets')).toBeInTheDocument();
    expect(screen.getByText('¥3,000,000')).toBeInTheDocument();
    expect(screen.getByText('erp.financial_report.label.total_liabilities')).toBeInTheDocument();
    expect(screen.getByText('¥900,000')).toBeInTheDocument();
    expect(screen.getByText('erp.financial_report.label.total_equity')).toBeInTheDocument();
    expect(screen.getByText('¥2,100,000')).toBeInTheDocument();
  });

  it('汇总卡片渲染利润表收入、成本和利润', () => {
    renderWithProviders(
      <FinancialReportSummaryCards
        activeTab='income-statement'
        balanceSheet={null}
        incomeStatement={incomeStatement}
        cashFlowStatement={null}
        formatCurrency={formatCurrency}
      />
    );

    expect(screen.getByText('erp.financial_report.label.total_revenue')).toBeInTheDocument();
    expect(screen.getByText('¥2,000,000')).toBeInTheDocument();
    expect(screen.getByText('erp.financial_report.label.total_cost')).toBeInTheDocument();
    expect(screen.getByText('¥1,200,000')).toBeInTheDocument();
    expect(screen.getByText('erp.financial_report.label.net_profit')).toBeInTheDocument();
    expect(screen.getByText('¥650,000')).toBeInTheDocument();
  });

  it('汇总卡片渲染现金流量表分类现金流', () => {
    renderWithProviders(
      <FinancialReportSummaryCards
        activeTab='cash-flow'
        balanceSheet={null}
        incomeStatement={null}
        cashFlowStatement={cashFlowStatement}
        formatCurrency={formatCurrency}
      />
    );

    expect(screen.getByText('erp.financial_report.label.operating_cash_flow')).toBeInTheDocument();
    expect(screen.getByText('¥1,500,000')).toBeInTheDocument();
    expect(screen.getByText('erp.financial_report.label.investing_cash_flow')).toBeInTheDocument();
    expect(screen.getByText('¥-350,000')).toBeInTheDocument();
    expect(screen.getByText('erp.financial_report.label.net_cash_flow')).toBeInTheDocument();
    expect(screen.getByText('¥1,650,000')).toBeInTheDocument();
  });

  it('报表表格渲染资产负债表分区和明细', () => {
    renderWithProviders(
      <FinancialReportTables
        activeTab='balance-sheet'
        balanceSheet={balanceSheet}
        incomeStatement={null}
        cashFlowStatement={null}
        loading={false}
        formatCurrency={formatCurrency}
      />
    );

    expect(screen.getByText('erp.financial_report.label.assets')).toBeInTheDocument();
    expect(screen.getByText('货币资金')).toBeInTheDocument();
    expect(screen.getByText('¥1,200,000')).toBeInTheDocument();
    expect(screen.getByText('erp.financial_report.label.liabilities')).toBeInTheDocument();
    expect(screen.getByText('应付账款')).toBeInTheDocument();
    expect(screen.getByText('20.00')).toBeInTheDocument();
  });

  it('报表表格渲染利润表收入、费用和净利润', () => {
    renderWithProviders(
      <FinancialReportTables
        activeTab='income-statement'
        balanceSheet={null}
        incomeStatement={incomeStatement}
        cashFlowStatement={null}
        loading={false}
        formatCurrency={formatCurrency}
      />
    );

    expect(screen.getByText('erp.financial_report.label.revenue')).toBeInTheDocument();
    expect(screen.getByText('主营业务收入')).toBeInTheDocument();
    expect(
      screen.getByText('erp.financial_report.label.operating_cost_and_expenses')
    ).toBeInTheDocument();
    expect(screen.getByText('管理费用')).toBeInTheDocument();
    expect(screen.getByText('erp.financial_report.label.net_profit')).toBeInTheDocument();
    expect(screen.getByText('¥650,000')).toBeInTheDocument();
  });

  it('报表表格渲染现金流量表活动和现金净增加额', () => {
    renderWithProviders(
      <FinancialReportTables
        activeTab='cash-flow'
        balanceSheet={null}
        incomeStatement={null}
        cashFlowStatement={cashFlowStatement}
        loading={false}
        formatCurrency={formatCurrency}
      />
    );

    expect(screen.getByText('erp.financial_report.label.operating_activities')).toBeInTheDocument();
    expect(screen.getByText('销售收现')).toBeInTheDocument();
    expect(screen.getByText('erp.financial_report.label.investing_activities')).toBeInTheDocument();
    expect(screen.getByText('购建固定资产')).toBeInTheDocument();
    expect(screen.getByText('erp.financial_report.label.net_increase_in_cash')).toBeInTheDocument();
    expect(screen.getByText('¥1,650,000')).toBeInTheDocument();
  });

  it('报表表格渲染加载状态和权益变动空状态', () => {
    const { container, rerender } = renderWithProviders(
      <FinancialReportTables
        activeTab='balance-sheet'
        balanceSheet={null}
        incomeStatement={null}
        cashFlowStatement={null}
        loading
        formatCurrency={formatCurrency}
      />
    );

    expect(container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();

    rerender(
      <FinancialReportTables
        activeTab='equity-change'
        balanceSheet={null}
        incomeStatement={null}
        cashFlowStatement={null}
        loading={false}
        formatCurrency={formatCurrency}
      />
    );
    expect(
      screen.getByText('erp.financial_report.label.equity_change_loading')
    ).toBeInTheDocument();
    expect(screen.getByTestId('icon-file-text')).toBeInTheDocument();
  });

  it('缺少对应数据时不渲染汇总卡片和表格', () => {
    const { container } = renderWithProviders(
      <>
        <FinancialReportSummaryCards
          activeTab='balance-sheet'
          balanceSheet={null}
          incomeStatement={null}
          cashFlowStatement={null}
          formatCurrency={formatCurrency}
        />
        <FinancialReportTables
          activeTab='balance-sheet'
          balanceSheet={null}
          incomeStatement={null}
          cashFlowStatement={null}
          loading={false}
          formatCurrency={formatCurrency}
        />
      </>
    );

    expect(container).toBeEmptyDOMElement();
  });
});
