import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFinancialReport } from '../useFinancialReport';

const shared = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  addNotification: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  QueryCache: vi.fn(),
  MutationCache: vi.fn(),
  QueryClient: vi.fn(),
  useQuery: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    isFetching: false,
    isSuccess: false,
    isPending: false,
    status: 'idle',
  })),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: shared.invalidateQueries,
    setQueryData: vi.fn(),
    getQueryData: vi.fn(),
    removeQueries: vi.fn(),
  })),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (x: string) => x }),
}));

vi.mock('@/store', () => ({
  useNotificationStore: vi.fn((selector?: any) =>
    selector
      ? selector({ addNotification: shared.addNotification })
      : { addNotification: shared.addNotification }
  ),
}));

vi.mock('@/utils/logger', () => ({
  apiLogger: { error: vi.fn(), debug: vi.fn() },
  createLogger: vi.fn(() => ({ error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() })),
  default: vi.fn(() => ({ error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

vi.mock('@/api/erp', () => ({
  financeReportApi: {
    balanceSheet: vi.fn(),
    incomeStatement: vi.fn(),
    cashFlowStatement: vi.fn(),
  },
}));

vi.mock('@/lib/reactQuery', () => ({
  QUERY_KEYS: {
    ERP: {
      FINANCIAL_REPORTS: {
        BALANCE_SHEET: (period: string) => ['erp', 'financial-reports', 'balance-sheet', period],
        INCOME_STATEMENT: (period: string) => [
          'erp',
          'financial-reports',
          'income-statement',
          period,
        ],
        CASH_FLOW: (period: string) => ['erp', 'financial-reports', 'cash-flow', period],
      },
    },
    AD_HOC: {
      ERP_FINANCIAL_REPORTS_BASE: ['erp', 'financial-reports'],
    },
  },
}));

describe('useFinancialReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    shared.invalidateQueries.mockClear();
    shared.addNotification.mockClear();
  });

  it('should render and return initial state', () => {
    const { result } = renderHook(() => useFinancialReport());
    expect(result.current).toBeDefined();
    expect(result.current.activeTab).toBe('balance-sheet');
    expect(result.current.periodType).toBe('year');
    expect(result.current.period).toBe('2024');
  });

  it('should return empty report data and loading state', () => {
    const { result } = renderHook(() => useFinancialReport());
    expect(result.current.balanceSheet).toBeNull();
    expect(result.current.incomeStatement).toBeNull();
    expect(result.current.cashFlowStatement).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should return 4 tabs', () => {
    const { result } = renderHook(() => useFinancialReport());
    expect(Array.isArray(result.current.tabs)).toBe(true);
    expect(result.current.tabs).toHaveLength(4);
    expect(result.current.tabs.map((t) => t.value)).toEqual([
      'balance-sheet',
      'income-statement',
      'cash-flow',
      'equity-change',
    ]);
  });

  it('should return 4 period options when periodType is year', () => {
    const { result } = renderHook(() => useFinancialReport());
    expect(result.current.periodOptions).toHaveLength(4);
    expect(result.current.periodOptions[0].value).toBe('2024');
  });

  it('should update periodType and period when switching to quarter', () => {
    const { result } = renderHook(() => useFinancialReport());
    act(() => {
      result.current.setPeriodType('quarter');
    });
    expect(result.current.periodType).toBe('quarter');
    expect(result.current.period).toBe('2024-Q1');
    expect(result.current.periodOptions).toHaveLength(4);
  });

  it('should update periodType and period when switching to month', () => {
    const { result } = renderHook(() => useFinancialReport());
    act(() => {
      result.current.setPeriodType('month');
    });
    expect(result.current.periodType).toBe('month');
    expect(result.current.period).toBe('2024-01');
    expect(result.current.periodOptions).toHaveLength(6);
  });

  it('formatCurrency should format amounts correctly', () => {
    const { result } = renderHook(() => useFinancialReport());
    expect(result.current.formatCurrency(1234.5)).toBe('¥1,234.50');
    expect(result.current.formatCurrency(0)).toBe('¥0.00');
    expect(result.current.formatCurrency(1000000)).toBe('¥1,000,000.00');
  });

  it('handleExport should call addNotification', () => {
    const { result } = renderHook(() => useFinancialReport());
    act(() => {
      result.current.handleExport();
    });
    expect(shared.addNotification).toHaveBeenCalledTimes(1);
  });

  it('handleRefresh should call invalidateQueries', () => {
    const { result } = renderHook(() => useFinancialReport());
    act(() => {
      result.current.handleRefresh();
    });
    expect(shared.invalidateQueries).toHaveBeenCalled();
  });

  it('setActiveTab / setPeriod should update state', () => {
    const { result } = renderHook(() => useFinancialReport());
    act(() => {
      result.current.setActiveTab('income-statement');
      result.current.setPeriod('2023');
    });
    expect(result.current.activeTab).toBe('income-statement');
    expect(result.current.period).toBe('2023');
  });
});
