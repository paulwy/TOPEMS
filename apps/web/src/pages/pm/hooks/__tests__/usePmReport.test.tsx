import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePmReport, DEFAULT_STATS } from '../usePmReport';

vi.mock('@tanstack/react-query', () => ({
  QueryCache: vi.fn(),
  MutationCache: vi.fn(),
  QueryClient: vi.fn(),
  useQuery: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(() => Promise.resolve({ data: undefined })),
    isFetching: false,
    isSuccess: false,
    isPending: false,
    status: 'idle',
  })),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(() => vi.fn()),
  useParams: vi.fn(() => ({})),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (x: string) => x }),
}));

vi.mock('@/api/pm', () => ({
  pmApi: {
    getStatistics: vi.fn(),
    benefits: { list: vi.fn() },
  },
}));

vi.mock('@/modules/pm/config', () => ({
  PM_PATHS: { root: '/pm', reports: '/pm/reports' },
}));

vi.mock('@/lib/reactQuery', () => ({
  QUERY_KEYS: {
    PM: {
      STATISTICS: ['pm', 'statistics'],
      REPORTS: ['pm', 'reports'],
      BENEFITS: (projectId: string) => ['pm', 'benefits', projectId],
      STATISTICS_PROJECTS: ['pm', 'statistics', 'projects'],
      STATISTICS_CONTRACTS: ['pm', 'statistics', 'contracts'],
      STATISTICS_BUDGET: ['pm', 'statistics', 'budget'],
      STATISTICS_RISKS: ['pm', 'statistics', 'risks'],
      STATISTICS_TASKS: ['pm', 'statistics', 'tasks'],
      STATISTICS_DASHBOARD: ['pm', 'statistics', 'dashboard'],
    },
  },
  CACHE_DURATIONS: {
    SHORT: 30 * 1000,
    MEDIUM: 5 * 60 * 1000,
    LONG: 30 * 60 * 1000,
    VERY_LONG: 2 * 60 * 60 * 1000,
  },
}));

vi.mock('lucide-react', () => ({
  Calendar: () => null,
  CheckCircle: () => null,
  AlertTriangle: () => null,
  DollarSign: () => null,
}));

describe('usePmReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(globalThis.URL, 'createObjectURL', {
      value: vi.fn(() => 'blob:url'),
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis.URL, 'revokeObjectURL', {
      value: vi.fn(),
      configurable: true,
      writable: true,
    });
  });

  it('should render and return initial state', () => {
    const { result } = renderHook(() => usePmReport());
    expect(result.current).toBeDefined();
    expect(result.current.selectedPeriod).toBe('all');
    expect(result.current.stats).toEqual(DEFAULT_STATS);
    expect(result.current.benefits).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('');
  });

  it('should return statCards config array', () => {
    const { result } = renderHook(() => usePmReport());
    expect(Array.isArray(result.current.statCards)).toBe(true);
    expect(result.current.statCards).toHaveLength(4);
    expect(result.current.statCards.map((c) => c.id)).toEqual([
      'total-projects',
      'completed-projects',
      'budget-usage',
      'high-risk',
    ]);
  });

  it('projectStatusData should be empty array when default stats are zero', () => {
    const { result } = renderHook(() => usePmReport());
    expect(Array.isArray(result.current.projectStatusData)).toBe(true);
    expect(result.current.projectStatusData).toHaveLength(0);
  });

  it('riskData should be empty array when default stats are zero', () => {
    const { result } = renderHook(() => usePmReport());
    expect(Array.isArray(result.current.riskData)).toBe(true);
    expect(result.current.riskData).toHaveLength(0);
  });

  it('trendData should be an array', () => {
    const { result } = renderHook(() => usePmReport());
    expect(Array.isArray(result.current.trendData)).toBe(true);
  });

  it('budgetUtilization should be 0 when total_budget is 0', () => {
    const { result } = renderHook(() => usePmReport());
    expect(result.current.budgetUtilization).toBe(0);
  });

  it('should return 5 time range options', () => {
    const { result } = renderHook(() => usePmReport());
    expect(Array.isArray(result.current.timeRangeOptions)).toBe(true);
    expect(result.current.timeRangeOptions).toHaveLength(5);
    expect(result.current.timeRangeOptions.map((o) => o.value)).toEqual([
      'all',
      'week',
      'month',
      'quarter',
      'year',
    ]);
  });

  it('setSelectedPeriod should update selected period', () => {
    const { result } = renderHook(() => usePmReport());
    act(() => {
      result.current.setSelectedPeriod('month');
    });
    expect(result.current.selectedPeriod).toBe('month');
  });

  it('should return string type for title and export text', () => {
    const { result } = renderHook(() => usePmReport());
    expect(typeof result.current.pageTitle).toBe('string');
    expect(typeof result.current.pageSubtitle).toBe('string');
    expect(typeof result.current.exportText).toBe('string');
  });

  it('should return navigate and params', () => {
    const { result } = renderHook(() => usePmReport());
    expect(typeof result.current.navigate).toBe('function');
    expect(result.current.params).toBeDefined();
  });

  it('loadReportData should be a function', () => {
    const { result } = renderHook(() => usePmReport());
    expect(typeof result.current.loadReportData).toBe('function');
  });

  it('handleExport should execute without throwing', () => {
    const { result } = renderHook(() => usePmReport());
    expect(() => {
      act(() => {
        result.current.handleExport();
      });
    }).not.toThrow();
  });
});
