import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import FinancialReportPage from '@/components/erp/FinancialReportPage';

const balanceSheetData = {
  period: '2024',
  total_assets: 1_000_000,
  total_liabilities: 400_000,
  total_equity: 600_000,
  current_assets: 500_000,
  current_liabilities: 200_000,
  assets: [],
  liabilities: [],
  equity: [],
  items: [],
};

const incomeStatementData = {
  period: '2024',
  revenues: [
    { name: '主营收入', amount: 800_000 },
    { name: '其他收入', amount: 20_000 },
  ],
  expenses: [
    { name: '营业成本', amount: 500_000 },
    { name: '管理费用', amount: 100_000 },
  ],
  net_income: 220_000,
  items: [],
};

const cashFlowData = {
  period: '2024',
  total_inflow: 900_000,
  total_outflow: 700_000,
  net_flow: 200_000,
  operating: { inflow: 0, outflow: 0, net: 0 },
  investing: { inflow: 0, outflow: 0, net: 0 },
  financing: { inflow: 0, outflow: 0, net: 0 },
  items: [],
};

const okRes = (data: unknown) => ({ success: true, data, message: '' });

const mockAddNotification = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  QueryCache: class {},
  MutationCache: class {},
  QueryClient: class {
    constructor() {
      this.defaultOptions = {};
      this.queryCache = { findAll: () => [] };
      this.mutationCache = {};
      this.invalidateQueries = vi.fn();
      this.getQueryData = vi.fn();
      this.setQueryData = vi.fn();
      this.refetchQueries = vi.fn();
      this.clear = vi.fn();
      this.getQueryCache = () => this.queryCache;
      this.getMutationCache = () => this.mutationCache;
    }
  },
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
  useQuery: vi.fn((opts: { queryKey: unknown[]; enabled?: boolean }) => {
    const key = String((opts.queryKey ?? []).join('/'));
    if (!opts.enabled) {
      return { data: undefined, isLoading: false, isError: false, isFetching: false };
    }
    if (key.includes('balance')) {
      return { data: balanceSheetData, isLoading: false, isError: false, isFetching: false };
    }
    if (key.includes('income')) {
      return { data: incomeStatementData, isLoading: false, isError: false, isFetching: false };
    }
    if (key.includes('cash')) {
      return { data: cashFlowData, isLoading: false, isError: false, isFetching: false };
    }
    return { data: null, isLoading: false, isError: false, isFetching: false };
  }),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn(), getQueryCache: () => ({}) })),
}));

vi.mock('@/i18n', () => ({
  default: { t: (x: string) => x, language: 'zh' },
}));

vi.mock('@/store', () => ({
  useNotificationStore: () => ({
    addNotification: mockAddNotification,
  }),
}));

vi.mock('@/utils/logger', () => ({
  apiLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock('@/api/finance', () => ({
  financeReportApi: {
    balanceSheet: vi.fn(async () => okRes(balanceSheetData)),
    incomeStatement: vi.fn(async () => okRes(incomeStatementData)),
    cashFlowStatement: vi.fn(async () => okRes(cashFlowData)),
  },
}));

describe('FinancialReportPage（死测试删除后的区域补测）', () => {
  beforeEach(() => {
    mockAddNotification.mockClear();
  });

  it('默认渲染资产负债 tab 的三张统计卡（资产/负债/权益）', () => {
    render(<FinancialReportPage />);
    expect(screen.getByText('erp.financial_report_page.k19')).toBeInTheDocument();

    const assets = screen.getByTestId('stat-card-total-assets');
    expect(assets.textContent).toContain('pages.financial_report_page.k13');
    expect(assets.textContent).toContain('¥1,000,000.00');

    const liabilities = screen.getByTestId('stat-card-total-liabilities');
    expect(liabilities.textContent).toContain('pages.financial_report_page.k14');
    expect(liabilities.textContent).toContain('¥400,000.00');

    const equity = screen.getByTestId('stat-card-total-equity');
    expect(equity.textContent).toContain('pages.financial_report_page.k15');
    expect(equity.textContent).toContain('¥600,000.00');
  });

  it('切换利润表 tab 后渲染收入/成本/净利润统计卡', () => {
    render(<FinancialReportPage />);
    fireEvent.click(screen.getByTestId('stat-tab-income-statement'));

    const revenue = screen.getByTestId('stat-card-revenue');
    expect(revenue.textContent).toContain('pages.financial_report_page.k3');
    // 800_000 + 20_000 = 820_000
    expect(revenue.textContent).toContain('¥820,000.00');

    const cost = screen.getByTestId('stat-card-cost');
    expect(cost.textContent).toContain('pages.financial_report_page.k4');
    // 500_000 + 100_000 = 600_000
    expect(cost.textContent).toContain('¥600,000.00');

    const netProfit = screen.getByTestId('stat-card-net-profit');
    expect(netProfit.textContent).toContain('pages.financial_report_page.k6');
    expect(netProfit.textContent).toContain('¥220,000.00');
  });

  it('切换现金流量 tab 后渲染流入/流出统计卡', () => {
    render(<FinancialReportPage />);
    fireEvent.click(screen.getByTestId('stat-tab-cash-flow'));

    const inflow = screen.getByTestId('stat-card-total-inflow');
    expect(inflow.textContent).toContain('erp.financial_report.label.total_inflow');
    expect(inflow.textContent).toContain('¥900,000.00');

    const outflow = screen.getByTestId('stat-card-total-outflow');
    expect(outflow.textContent).toContain('erp.financial_report.label.total_outflow');
    expect(outflow.textContent).toContain('¥700,000.00');
  });
});
